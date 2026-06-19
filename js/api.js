// API client — conecta con https://api.qontexto.com

const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:8000'
  : 'https://api.qontexto.com';

const API_KEY = '';  // configurar antes del deploy

let _sessionId            = null;
let _readToken            = '';
let _webhookUrl           = '';
let _previousSessionCount = 0;
let _pollTimer            = null;
let _sessionIsLive        = false;
let _contractId           = null;
let _contractStreamCount  = null;
let _summary              = null;

// ── Urgency mapping (institutional_relevance → color semáforo) ───────────────

const URGENCY = {
  critical: { color: '#991B1B', bg: '#FEF2F2', textColor: '#991B1B', label: 'Alerta máxima' },
  high:     { color: '#EF4444', bg: '#FEF2F2', textColor: '#B91C1C', label: 'Señal temprana' },
  medium:   { color: '#F59E0B', bg: '#FFFBEB', textColor: '#B45309', label: 'Emergiendo'    },
  low:      { color: '#4CAF50', bg: '#F0FBF1', textColor: '#2E7D32', label: 'Estable'       },
};
function _scoreToUrgency(score) {
  if (score >= 0.7) return 'critical';
  if (score >= 0.5) return 'high';
  if (score >= 0.3) return 'medium';
  return 'low';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function limaTime(date = new Date()) {
  return date.toLocaleTimeString('es-PE', {
    timeZone:  'America/Lima',
    hour:      '2-digit',
    minute:    '2-digit',
    hour12:    false,
  });
}

async function _apiFetch(path) {
  const hdrs = {};
  if (API_KEY) hdrs['X-API-Key'] = API_KEY;
  if (typeof getToken === 'function') {
    const token = await getToken();
    if (token) hdrs['Authorization'] = `Bearer ${token}`;
  }
  const r = await fetch(`${API_BASE}${path}`, { headers: hdrs });
  if (r.status === 401) {
    if (typeof login === 'function') login();
    throw new Error(`401 ${path}`);
  }
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}

function _setText(id, value) {
  const el = document.getElementById(id);
  if (el && value != null) el.textContent = value;
}

function _esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Session detection ─────────────────────────────────────────────────────────

async function _detectSession() {
  const sessions = await _apiFetch('/sessions');
  const list     = Array.isArray(sessions) ? sessions : [sessions];
  const active   = list.find(s => s.status === 'active') ?? null;

  if (active) {
    _readToken     = active.read_token  ?? '';
    _webhookUrl    = active.webhook_url ?? '';
    _sessionIsLive = true;
    _previousSessionCount = list.filter(s => s.status !== 'active').length;
    return active.session_id;
  }

  // No active session — use the most recent stopped session so the
  // dashboard shows historical data after the monitoring window ends.
  _sessionIsLive = false;
  const stopped = list
    .filter(s => s.status === 'stopped' && s.read_token)
    .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));

  _previousSessionCount = stopped.length;
  const recent = stopped[0] ?? null;
  if (recent) {
    _readToken  = recent.read_token ?? '';
    _webhookUrl = '';
  }
  return recent?.session_id ?? null;
}

// ── UI update ─────────────────────────────────────────────────────────────────

function _updateUI(state) {
  const streamCount = _sessionIsLive
    ? (state.streams_monitored?.length ?? 0)
    : (_contractStreamCount ?? state.streams_monitored?.length ?? 0);

  _setText('stat-streams', streamCount);
  // stat-alertas lo gestiona _updateTemasFromSummary (tb.alertas = arcos activos).
  // Solo lo toca _updateUI si el summary aún no cargó, para no sobrescribir con
  // alerts_total del agregado (que es acumulado de 30 días, no arcos activos).
  if (!_summary) _setText('stat-alertas', state.summary?.alerts_total ?? 0);
  _setText('live-label', `${streamCount} stream${streamCount !== 1 ? 's' : ''} · ${limaTime()} PE`);
  _setText('stat-actualizado', limaTime());

  _updateSenalesTab(state);
}

// ── Tab Señales ───────────────────────────────────────────────────────────────

const _SEV_COLOR = { critical: '#991B1B', high: '#EF4444', medium: '#F59E0B', low: 'var(--text3)' };
const _SEV_ORDER = ['critical', 'high', 'medium', 'low'];

function _streamStatus(sev) {
  if (sev === 'critical') return { label: 'Vigilancia crítica', color: '#991B1B' };
  if (sev === 'high')     return { label: 'Vigilancia',         color: '#EF4444' };
  if (sev === 'medium')   return { label: 'Atención',           color: '#F59E0B' };
  return                         { label: 'Normal',             color: '#4CAF50' };
}

function _renderTimeline(state, alerts, streams) {
  const el = document.getElementById('senales-timeline');
  if (!el) return;

  const sorted = [...alerts].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const rows   = [];

  const startTime = state.session_start ? limaTime(new Date(state.session_start)) : null;
  if (startTime) {
    const n = streams.length;
    rows.push(
      `<div class="qtevent"><div class="qtl-left">` +
      `<div class="qtl-time">${startTime}</div>` +
      `<div class="qtl-dot" style="background:#4CAF50"></div><div class="qtl-line"></div></div>` +
      `<div><div class="qtl-title">Inicio de monitoreo</div>` +
      `<div class="qtl-sub">${n} stream${n !== 1 ? 's' : ''} activos</div></div></div>`
    );
  }

  // Leyenda de temas
  const leyendaEl = document.getElementById('menciones-leyenda');
  if (leyendaEl) {
    const themes = [...new Set(sorted.map(ev => ev.alert?.cluster_name).filter(Boolean))];
    leyendaEl.innerHTML = themes.map(name => {
      const hex = _clusterHex(name);
      return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;color:var(--text2)">` +
             `<span style="width:7px;height:7px;border-radius:50%;background:${hex};flex-shrink:0"></span>${_esc(name)}</span>`;
    }).join('');
  }

  for (const ev of sorted) {
    const sev        = ev.alert?.severity ?? 'low';
    const sevColor   = _SEV_COLOR[sev] ?? 'var(--text3)';
    const clusterHex = _clusterHex(ev.alert?.cluster_name);
    const isUrgent   = sev === 'critical' || sev === 'high';
    const time       = limaTime(new Date(ev.timestamp));
    const summary    = _esc(ev.alert?.summary ?? '');
    const sub        = [ev.radio_id, ev.region].filter(Boolean).map(_esc).join(' · ');
    const quote      = ev.alert?.quote ? _esc(ev.alert.quote) : '';
    const urgLabel   = { critical: 'Alerta máxima', high: 'Señal temprana', medium: 'Emergiendo', low: 'Estable' }[sev] ?? sev;

    const wrap  = isUrgent
      ? `style="background:rgba(153,27,27,0.05);border-radius:12px;padding:10px;margin:0 -4px"`
      : '';
    const tSty  = isUrgent ? ` style="color:${sevColor};font-weight:500"` : '';
    const hdSty = isUrgent ? ` style="color:${sevColor}"` : '';

    const urgChip = `<span style="font-size:10px;background:var(--surface2);color:var(--text2);border-radius:4px;padding:1px 6px;margin-left:4px">${urgLabel}</span>`;

    rows.push(
      `<div class="qtevent" ${wrap}><div class="qtl-left">` +
      `<div class="qtl-time"${tSty}>${time}</div>` +
      `<div class="qtl-dot" style="background:${clusterHex}"></div><div class="qtl-line"></div></div>` +
      `<div><div class="qtl-title"${hdSty}>${summary}</div>` +
      (sub   ? `<div class="qtl-sub">${sub}${urgChip}</div>` : `<div class="qtl-sub">${urgChip}</div>`) +
      (quote ? `<div class="qtl-quote" style="color:${clusterHex}">"${quote}"</div>` : '') +
      `</div></div>`
    );
  }

  rows.push(
    `<div class="qtevent"><div class="qtl-left">` +
    `<div class="qtl-time">${limaTime()}</div>` +
    `<div class="qtl-dot" style="background:#4CAF50;box-shadow:0 0 0 3px rgba(76,175,80,0.2)"></div>` +
    `</div><div><div class="qtl-title" style="color:var(--text2);font-style:italic">Ahora — monitoreo activo</div></div></div>`
  );

  el.innerHTML = rows.join('');
}

function _renderAnalisis(state, snap, alerts) {
  const el = document.getElementById('senales-analisis');
  if (!el) return;

  const n     = alerts.length;
  const start = state.session_start ? limaTime(new Date(state.session_start)) : '';

  if (!snap) {
    el.innerHTML = n > 0
      ? `<p>${n} mención${n !== 1 ? 'es' : ''} registrada${n !== 1 ? 's' : ''}. Análisis disponible con el próximo ciclo.</p>`
      : '';
    return;
  }

  const narrative = _esc(snap.dominant_narrative ?? '');
  const color     = URGENCY[snap.institutional_relevance ?? 'low']?.color ?? 'var(--text2)';
  const sinceTxt  = start ? ` desde las ${start}` : '';

  let html =
    `<p style="margin-bottom:12px">Se registraron ` +
    `<span style="font-weight:500;color:var(--text1)">${n} alerta${n !== 1 ? 's' : ''}</span>${sinceTxt}. ` +
    `Narrativa dominante: <span style="font-weight:500;color:${color}">${narrative}</span>.</p>`;

  if (snap.cross_stream_signals?.length) {
    html += `<p style="margin-bottom:12px">` +
      snap.cross_stream_signals.map(s =>
        `<span style="display:block;margin-bottom:4px">— ${_esc(s)}</span>`
      ).join('') +
      `</p>`;
  }

  if (snap.recommended_focus) {
    html +=
      `<div style="background:var(--surface2);border-radius:10px;padding:10px 12px">` +
      `<div style="font-size:10px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;` +
      `color:var(--text3);margin-bottom:6px">Recomendación</div>` +
      `<div style="font-size:12px;color:var(--text1);line-height:1.5">${_esc(snap.recommended_focus)}</div>` +
      `</div>`;
  }

  el.innerHTML = html;
}

function _renderStreams(streams, alerts) {
  const el = document.getElementById('senales-streams');
  if (!el || !streams.length) return;

  const alertCount  = {};
  const maxSev      = {};
  const streamThemes = {};

  for (const ev of alerts) {
    const sid     = ev.stream_id;
    const cluster = ev.alert?.cluster_name;
    if (!sid) continue;
    alertCount[sid] = (alertCount[sid] ?? 0) + 1;
    const sev = ev.alert?.severity ?? 'low';
    if (!maxSev[sid] || _SEV_ORDER.indexOf(sev) < _SEV_ORDER.indexOf(maxSev[sid])) {
      maxSev[sid] = sev;
    }
    if (cluster) {
      if (!streamThemes[sid]) streamThemes[sid] = {};
      streamThemes[sid][cluster] = (streamThemes[sid][cluster] ?? 0) + 1;
    }
  }

  el.innerHTML = streams.map(s => {
    const sid    = s.stream_id;
    const name   = _esc(s.radio_id || s.city || sid);
    const region = _esc(s.region ?? '');
    const cnt    = alertCount[sid] ?? 0;
    const status = _streamStatus(maxSev[sid]);
    const urgent = maxSev[sid] === 'critical' || maxSev[sid] === 'high';
    const border = urgent ? ` style="border-color:${_hexToRgba(status.color, 0.2)}"` : '';

    const themes = Object.entries(streamThemes[sid] ?? {})
      .sort((a, b) => b[1] - a[1])
      .map(([cluster, n]) => {
        const hex = _clusterHex(cluster);
        return `<div style="display:flex;align-items:center;gap:6px;font-size:11px;margin-top:4px">` +
          `<span style="width:7px;height:7px;border-radius:50%;background:${hex};flex-shrink:0"></span>` +
          `<span style="color:var(--text2);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(cluster)}</span>` +
          `<span style="color:var(--text3);flex-shrink:0">${n}</span></div>`;
      }).join('');

    return `<div class="qstream"${border}>` +
      `<div class="qstream-name">` +
      `<div style="width:8px;height:8px;border-radius:50%;background:${status.color};flex-shrink:0"></div>` +
      `${name}</div>` +
      `<div class="qstream-region" style="margin-bottom:4px">${region}</div>` +
      `<div style="font-size:11px;color:var(--text3);margin-bottom:4px">${cnt} mención${cnt !== 1 ? 'es' : ''} · ${status.label}</div>` +
      (themes || `<div style="font-size:11px;color:var(--text3)">Sin menciones</div>`) +
      `</div>`;
  }).join('');
}

function _updateSenalesTab(state) {
  const alerts  = state.alerts            ?? [];
  const streams = state.streams_monitored ?? [];
  _renderTimeline(state, alerts, streams);
  _renderAnalisis(state, state.latest_snapshot, alerts);
  _renderStreams(streams, alerts);
}

// ── D1: Costos ────────────────────────────────────────────────────────────────

async function _fetchCosts() {
  try {
    const costs     = await _apiFetch(
      `/session/${_sessionId}/costs?token=${encodeURIComponent(_readToken)}`
    );
    const total     = costs?.totals?.total_usd;
    const suggested = costs?.totals?.suggested_price_usd;
    if (total     != null) _setText('stat-costo',     `$${total.toFixed(2)}`);
    if (suggested != null) _setText('stat-costo-sub', `$${suggested.toFixed(2)} precio s.`);
  } catch { /* silencioso — endpoint puede no estar disponible aún */ }
}

// ── D2: Webhook URL ───────────────────────────────────────────────────────────

function _updateWebhookUI() {
  const bar = document.getElementById('wh-bar');
  const val = document.getElementById('wh-val');
  if (!bar || !val) return;
  if (_webhookUrl) {
    bar.title       = _webhookUrl;
    val.textContent = _webhookUrl.length > 28
      ? _webhookUrl.slice(0, 27) + '…'
      : _webhookUrl;
    bar.style.display = '';
  } else {
    bar.style.display = 'none';
  }
}

// ── D3: Historial sesiones (Redis) ────────────────────────────────────────────

function _updateHistorialUI() {
  const badge = document.getElementById('hist-badge');
  const count = document.getElementById('hist-count');
  if (!badge || !count) return;
  if (_previousSessionCount > 0) {
    count.textContent   = _previousSessionCount;
    badge.style.display = '';
  }
}

// ── Poll ──────────────────────────────────────────────────────────────────────

async function _poll() {
  try {
    const state = await _apiFetch(
      `/session/${_sessionId}/state?token=${encodeURIComponent(_readToken)}`
    );
    _updateUI(state);
    _fetchCosts();
  } catch (err) {
    if (err.message.startsWith('403')) {
      console.warn('[Qontexto] token inválido — acceso denegado al estado de sesión');
    } else {
      console.warn('[Qontexto] poll fallido:', err.message);
    }
  }
}

async function downloadSnapshotPDF() {
  if (!_sessionId || !_readToken) return;
  try {
    const hdrs = {};
    if (API_KEY) hdrs['X-API-Key'] = API_KEY;
    if (typeof getToken === 'function') {
      const token = await getToken();
      if (token) hdrs['Authorization'] = `Bearer ${token}`;
    }
    const r = await fetch(
      `${API_BASE}/session/${_sessionId}/report.pdf?token=${encodeURIComponent(_readToken)}`,
      { headers: hdrs }
    );
    if (!r.ok) throw new Error(r.status);
    const blob = await r.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${_sessionId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[Qontexto] PDF download fallido:', err.message);
  }
}

function _tickLiveTime() {
  const el = document.getElementById('live-label');
  if (!el) return;
  const m = el.textContent.match(/^(\d+)/);
  const n = m ? +m[1] : 0;
  el.textContent = `${n} stream${n !== 1 ? 's' : ''} · ${limaTime()} PE`;
}

// ── D6: Agregado multi-sesión ─────────────────────────────────────────────────

async function _fetchAggregateState(params = {}) {
  const qs = new URLSearchParams();
  if (params.hours != null) qs.set('hours', params.hours);
  else                      qs.set('days', params.days ?? 30);
  if (params.from) qs.set('from', params.from);
  if (params.to)   qs.set('to',   params.to);
  try {
    const agg = await _apiFetch(`/my/sessions/aggregate?${qs}`);
    _updateUI(agg);
    _updateAggregateRangeLabel(agg);
  } catch (err) {
    console.warn('[Qontexto] aggregate fallido:', err.message);
  }
}

function _updateAggregateRangeLabel(agg) {
  const from = agg.from ? new Date(agg.from) : null;
  const to   = agg.to   ? new Date(agg.to)   : null;
  if (!from || !to) return;
  const fmt = d => d.toLocaleDateString('es-PE', { day: 'numeric', month: 'numeric', timeZone: 'America/Lima' });
  const limaFmt = d => limaTime(d);
  const sameDay = from.toDateString() === to.toDateString();
  const label   = sameDay
    ? `${limaFmt(from)} — ${limaFmt(to)} PE`
    : `${fmt(from)} — ${fmt(to)} PE`;
  _setText('timebar-range', label);
}

// ── D6: Navegador de sesiones (Tab Señales) ───────────────────────────────────

async function _loadSessionList() {
  try {
    const qs = _contractId ? `?contract_id=${_contractId}` : '';
    _sessionList  = await _apiFetch(`/my/sessions${qs}`);
    _sessionIndex = 0;
    _renderSessionNav();
    if (_sessionList.length) await _loadSessionAtIndex(0);
  } catch (err) {
    console.warn('[Qontexto] session list fallido:', err.message);
  }
}

async function _loadSessionAtIndex(i) {
  const s = _sessionList[i];
  if (!s) return;
  _sessionIndex = i;
  _renderSessionNav();
  try {
    const sessionState = await _apiFetch(
      `/session/${s.session_id}/state?token=${encodeURIComponent(s.read_token)}`
    );
    _updateSenalesTab(sessionState);
  } catch (err) {
    console.warn('[Qontexto] session state fallido:', err.message);
  }
}

function _renderSessionNav() {
  const navEl = document.getElementById('session-nav');
  if (!navEl) return;
  if (!_sessionList.length) { navEl.style.display = 'none'; return; }

  const s         = _sessionList[_sessionIndex];
  const live      = s.status === 'active';
  const dateLabel = new Date(s.started_at).toLocaleDateString('es-PE', {
    weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'America/Lima',
  });
  const t0 = limaTime(new Date(s.started_at));
  const t1 = s.stopped_at ? limaTime(new Date(s.stopped_at)) : '—';

  const prevOk = _sessionIndex < _sessionList.length - 1;
  const nextOk = _sessionIndex > 0;
  const btnSty = 'border:none;background:none;cursor:pointer;font-size:18px;color:var(--text2);padding:0 6px;line-height:1';
  const disabledSty = 'opacity:.3;cursor:default;pointer-events:none';

  const liveTag = live
    ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#F0FBF1;color:#2E7D32;` +
      `border-radius:6px;padding:1px 7px;font-size:11px;font-weight:500;margin-right:4px">` +
      `<span style="width:5px;height:5px;border-radius:50%;background:#4CAF50"></span>En vivo</span>`
    : '';

  navEl.innerHTML =
    `<button style="${btnSty}${prevOk ? '' : ';' + disabledSty}" onclick="prevSession()">‹</button>` +
    `<span style="font-size:12px;color:var(--text2);display:flex;align-items:center;gap:6px;flex:1;justify-content:center">` +
    liveTag +
    `<span style="font-weight:500;color:var(--text1)">${_esc(dateLabel)}</span>` +
    `<span>· ${t0}–${t1} ·</span>` +
    `<span style="color:${s.alerts_total > 0 ? '#F59E0B' : 'var(--text3)'}">${s.alerts_total} menciones</span>` +
    `</span>` +
    `<button style="${btnSty}${nextOk ? '' : ';' + disabledSty}" onclick="nextSession()">›</button>`;

  navEl.style.display = 'flex';
}

function prevSession() {
  if (_sessionIndex < _sessionList.length - 1) _loadSessionAtIndex(_sessionIndex + 1);
}

function nextSession() {
  if (_sessionIndex > 0) _loadSessionAtIndex(_sessionIndex - 1);
}

// ── D7: Arcos narrativos ──────────────────────────────────────────────────────

let _allArcs = [];
let _arcStatusFilter = null;
// F2: Estado de paginación
let _currentPage = 1;
let _pageSize = 20;
let _totalArcs = 0;
let _totalPages = 0;

const _ARC_STATUS = {
  escalating: { label: 'Escalando',  bg: '#FEF2F2', color: '#991B1B', dot: '#EF4444' },
  active:     { label: 'Activo',     bg: '#F0FBF1', color: '#2E7D32', dot: '#4CAF50' },
  dormant:    { label: 'Dormido',    bg: 'var(--surface2)', color: 'var(--text3)', dot: '#9E9E9E' },
};

const _ARC_TREND = {
  escalating:   '↑ Escalando',
  continuing:   '→ Continúa',
  reactivation: '↺ Reactivado',
  new:          '★ Nuevo',
};

function _arcScore(arc) {
  if (arc.last_score != null) return arc.last_score;
  const h = arc.intensity_history;
  if (!h?.length) return 0;
  return h[h.length - 1].score ?? 0;
}

// ── Cluster semántico helpers ──────────────────────────────────────────────

const _CLUSTER_URGENCY = {
  critical: { bg: '#FEF2F2', color: '#991B1B', label: 'Alerta máxima' },
  high:     { bg: '#FEF2F2', color: '#B91C1C', label: 'Señal temprana' },
  medium:   { bg: '#FFFBEB', color: '#B45309', label: 'Emergiendo' },
  low:      { bg: '#F0FBF1', color: '#2E7D32', label: 'Estable' },
};

function _formatClusterData(arc) {
  const cluster = {
    name: arc.cluster_name || null,
    urgency: arc.urgency || null,
    hasData: Boolean(arc.cluster_name || arc.urgency)
  };

  if (cluster.urgency && _CLUSTER_URGENCY[cluster.urgency]) {
    cluster.urgencyConfig = _CLUSTER_URGENCY[cluster.urgency];
    cluster.urgencyChip = `<span style="font-size:10px;background:${cluster.urgencyConfig.bg};color:${cluster.urgencyConfig.color};border-radius:5px;padding:1px 7px;font-weight:500;margin-left:6px">${cluster.urgencyConfig.label}</span>`;
  } else {
    cluster.urgencyChip = '';
  }

  cluster.nameSpan = cluster.name
    ? `<span style="font-size:11px;color:var(--text2);font-weight:500">${_esc(cluster.name)}</span>`
    : '';

  return cluster;
}

async function _loadNarrativeArcs(page = 1) {
  try {
    _currentPage = page;

    // F4: Mostrar skeleton loading
    _showArcsSkeletonLoading();

    const contractQs = _contractId ? `&contract_id=${_contractId}` : '';
    const statusQs = _arcStatusFilter ? `&status=${_arcStatusFilter}` : '';

    // F3: Filtros elaborados
    const dateFromQs = _advancedFilters.dateFrom ? `&from_date=${_advancedFilters.dateFrom}` : '';
    const dateToQs = _advancedFilters.dateTo ? `&to_date=${_advancedFilters.dateTo}` : '';
    const clusterQs = _advancedFilters.cluster ? `&cluster_name=${_advancedFilters.cluster}` : '';
    const urgencyQs = _advancedFilters.urgency ? `&urgency=${_advancedFilters.urgency}` : '';

    // F2: Usar paginación del backend
    const response = await _apiFetch(`/my/narrative-arcs?page=${_currentPage}&page_size=${_pageSize}${contractQs}${statusQs}${dateFromQs}${dateToQs}${clusterQs}${urgencyQs}`);

    // Manejar respuesta paginada
    _allArcs = response.arcs || [];
    _totalArcs = response.total || 0;
    _totalPages = response.pages || 0;
    _currentPage = response.current_page || 1;

    // F4: Verificar empty state vs contenido real
    if (_totalArcs === 0) {
      _showArcsEmptyState();
    } else {
      _renderNarrativeArcs(_allArcs);
    }

    _updatePaginationControls();
  } catch (err) {
    const el = document.getElementById('narrative-arcs-list');
    if (el) el.innerHTML = '<div class="qarcs-error"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Error al cargar historias. Intenta nuevamente.</div>';
    console.warn('[Qontexto] narrative-arcs fallido:', err.message);
  }
}

// F4: Skeleton loading
function _showArcsSkeletonLoading() {
  const el = document.getElementById('narrative-arcs-list');
  if (!el) return;

  const skeletons = Array.from({length: 3}, () =>
    '<div class="qarc-skeleton">' +
      '<div class="qarc-skeleton-header">' +
        '<div class="qarc-skeleton-dot"></div>' +
        '<div class="qarc-skeleton-title"></div>' +
        '<div class="qarc-skeleton-badge"></div>' +
      '</div>' +
      '<div class="qarc-skeleton-content"></div>' +
    '</div>'
  ).join('');

  el.innerHTML = skeletons;
}

// F4: Empty state
function _showArcsEmptyState() {
  const el = document.getElementById('narrative-arcs-list');
  if (!el) return;

  const hasActiveFilters = _arcStatusFilter ||
    _advancedFilters.dateFrom ||
    _advancedFilters.dateTo ||
    _advancedFilters.cluster ||
    _advancedFilters.urgency;

  const message = hasActiveFilters
    ? 'Sin historias con estos filtros'
    : 'No hay historias registradas aún';

  const suggestion = hasActiveFilters
    ? 'Intenta ampliar los criterios de búsqueda o <button onclick="resetAllFilters()" style="background:none;border:none;color:var(--text2);text-decoration:underline;cursor:pointer;font-family:var(--font)">limpiar filtros</button>.'
    : 'Las historias aparecerán conforme el sistema detecte patrones narrativos.';

  el.innerHTML =
    '<div class="qarcs-empty">' +
      '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="1.5">' +
        '<path d="M9 11H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4m6-6h4a2 2 0 0 1 2 2v3c0 1.1-.9 2-2 2h-4m-6-6V9a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-6 0h6"/>' +
      '</svg>' +
      '<div class="qarcs-empty-title">' + message + '</div>' +
      '<div class="qarcs-empty-text">' + suggestion + '</div>' +
    '</div>';
}

// F2: Controles de paginación
function _updatePaginationControls() {
  const container = document.getElementById('pagination-controls');
  const indicator = document.getElementById('arcs-indicator');

  if (!container || !indicator) return;

  // Indicador "Mostrando X-Y de Z arcos"
  const startIdx = (_currentPage - 1) * _pageSize + 1;
  const endIdx = Math.min(_currentPage * _pageSize, _totalArcs);

  if (_totalArcs > 0) {
    indicator.textContent = `Mostrando ${startIdx}-${endIdx} de ${_totalArcs} historias`;
  } else {
    indicator.textContent = 'Sin historias para mostrar';
  }

  // Controles de navegación
  const prevDisabled = _currentPage <= 1;
  const nextDisabled = _currentPage >= _totalPages;

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;justify-content:center">
      <button onclick="navigateToPage(${_currentPage - 1})"
              ${prevDisabled ? 'disabled' : ''}
              style="padding:6px 12px;border:1px solid var(--border);background:${prevDisabled ? 'var(--surface2)' : 'var(--surface)'};border-radius:6px;cursor:${prevDisabled ? 'not-allowed' : 'pointer'};font-size:12px;color:${prevDisabled ? 'var(--text3)' : 'var(--text1)'}">
        ← Anterior
      </button>

      <span style="font-size:12px;color:var(--text2);min-width:80px;text-align:center">
        Página ${_currentPage} de ${_totalPages}
      </span>

      <button onclick="navigateToPage(${_currentPage + 1})"
              ${nextDisabled ? 'disabled' : ''}
              style="padding:6px 12px;border:1px solid var(--border);background:${nextDisabled ? 'var(--surface2)' : 'var(--surface)'};border-radius:6px;cursor:${nextDisabled ? 'not-allowed' : 'pointer'};font-size:12px;color:${nextDisabled ? 'var(--text3)' : 'var(--text1)'}">
        Siguiente →
      </button>
    </div>
  `;
}

function navigateToPage(page) {
  if (page < 1 || page > _totalPages) return;
  _loadNarrativeArcs(page);
}

function filterArcs(status, btnEl) {
  _arcStatusFilter = status;
  document.querySelectorAll('.qarc-filter').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  // F2: Reiniciar paginación cuando cambie filtro
  _currentPage = 1;
  _loadNarrativeArcs(_currentPage);
}

// F1: Filtros elaborados
let _advancedFilters = {
  dateFrom: '',
  dateTo: '',
  cluster: '',
  urgency: ''
};
let _clusterNames    = [];
let _clusterColorMap = {};
let _clusterHexMap   = {};

function _buildClusterColorMap(narrativas) {
  narrativas = narrativas ?? _summary?.narrativas ?? [];
  const style    = getComputedStyle(document.documentElement);
  const varNames = ['--q-cluster-1', '--q-cluster-2', '--q-cluster-3', '--q-cluster-4'];

  _clusterColorMap = {};
  _clusterHexMap   = {};

  const sorted = [...narrativas]
    .sort((a, b) => (b.importance_score ?? 0) - (a.importance_score ?? 0));

  let colorIdx = 0;
  for (const nav of sorted) {
    if (!nav.topic) continue;
    const eligible = colorIdx < 4 && (nav.importance_score ?? 0) >= 0.60;
    const varN     = eligible ? varNames[colorIdx++] : '--q-cluster-none';
    _clusterColorMap[nav.topic] = `var(${varN})`;
    _clusterHexMap[nav.topic]   = style.getPropertyValue(varN).trim();
  }

  if (_allArcs.length > 0) _renderNarrativeArcs(_allArcs);
  if (narrativas.length) {
    _renderTemasBubble(narrativas);
    _updateTemasTrend(narrativas);
  }
}

function _clusterHex(clusterName) {
  if (_clusterHexMap[clusterName]) return _clusterHexMap[clusterName];
  return getComputedStyle(document.documentElement).getPropertyValue('--q-cluster-none').trim();
}

function toggleAdvancedFilters() {
  const container = document.getElementById('advanced-filters');
  const isVisible = container.style.display !== 'none';
  container.style.display = isVisible ? 'none' : 'block';

  // Actualizar icono del botón
  const btn = document.getElementById('toggle-filters');
  btn.style.background = isVisible ? 'var(--surface2)' : 'var(--text1)';
  btn.style.color = isVisible ? 'var(--text2)' : 'var(--surface)';
}

function toggleStatusChip(chipEl, status) {
  // Desactivar todos los chips
  document.querySelectorAll('#status-chips .qchip').forEach(c => c.classList.remove('active'));

  // Activar el chip seleccionado
  chipEl.classList.add('active');

  // Actualizar filtro y recargar
  _arcStatusFilter = status || null;
  _currentPage = 1;
  _loadNarrativeArcs(_currentPage);
  _updateActiveFilters();
}

function updateDateFilter() {
  _advancedFilters.dateFrom = document.getElementById('date-from').value;
  _advancedFilters.dateTo = document.getElementById('date-to').value;
  _currentPage = 1;
  _loadNarrativeArcs(_currentPage);
  _updateActiveFilters();
}

function updateTemaFilter(value) {
  _advancedFilters.cluster = value ?? '';
  _closeTemaDropdown();
  const btn = document.getElementById('tema-btn');
  if (btn) {
    const label = value
      ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${_clusterHex(value)};margin-right:6px;vertical-align:middle"></span>${_esc(value)}`
      : 'Todos los temas';
    btn.innerHTML = label + ' <span style="float:right;color:var(--text3)">▾</span>';
  }
  document.querySelectorAll('.qdd-opt').forEach(o => {
    o.classList.toggle('sel', o.dataset.value === (value ?? ''));
  });
  _currentPage = 1;
  _loadNarrativeArcs(_currentPage);
  _updateActiveFilters();
}

function _closeTemaDropdown() {
  const menu = document.getElementById('tema-menu');
  if (menu) menu.classList.remove('open');
}

function toggleTemaDropdown() {
  const menu = document.getElementById('tema-menu');
  if (menu) menu.classList.toggle('open');
}

function updateUrgencyFilter() {
  _advancedFilters.urgency = document.getElementById('urgency-select').value;
  _currentPage = 1;
  _loadNarrativeArcs(_currentPage);
  _updateActiveFilters();
}

function resetAllFilters() {
  _arcStatusFilter = null;
  _advancedFilters = { dateFrom: '', dateTo: '', cluster: '', urgency: '' };

  document.getElementById('date-from').value  = '';
  document.getElementById('date-to').value    = '';
  document.getElementById('urgency-select').value = '';

  const btn = document.getElementById('tema-btn');
  if (btn) btn.innerHTML = 'Todos los temas <span style="float:right;color:var(--text3)">▾</span>';
  document.querySelectorAll('.qdd-opt').forEach(o => o.classList.toggle('sel', o.dataset.value === ''));
  _closeTemaDropdown();

  document.querySelectorAll('#status-chips .qchip').forEach(c => c.classList.remove('active'));
  document.querySelector('#status-chips .qchip[data-status=""]')?.classList.add('active');

  _currentPage = 1;
  _loadNarrativeArcs(_currentPage);
  _updateActiveFilters();
}

// F3 FIX: Cargar cluster_names dinámicamente
async function _loadClusterNames() {
  try {
    const contractQs = _contractId ? `?contract_id=${_contractId}` : '';
    _clusterNames = await _apiFetch(`/my/cluster-names${contractQs}`);
  } catch (err) {
    console.warn('[Qontexto] cluster-names fallido:', err.message);
    _clusterNames = [];
  }
  _updateTemaDropdown();
}

function _updateTemaDropdown() {
  const menu = document.getElementById('tema-menu');
  if (!menu) return;

  const items = [`<div class="qdd-opt sel" data-value="" onclick="updateTemaFilter('')">Todos los temas</div>`];
  for (const name of _clusterNames) {
    const hex = _clusterHex(name);
    items.push(
      `<div class="qdd-opt" data-value="${_esc(name)}" onclick="updateTemaFilter('${_esc(name)}')">` +
      `<span style="width:8px;height:8px;border-radius:50%;background:${hex};flex-shrink:0"></span>` +
      `${_esc(name)}</div>`
    );
  }
  menu.innerHTML = items.join('');
}

document.addEventListener('click', e => {
  if (!e.target.closest('.qdd-wrap')) _closeTemaDropdown();
});

function _updateActiveFilters() {
  const container = document.getElementById('active-filters');
  const chipsContainer = document.getElementById('active-chips');
  const activeChips = [];

  // Generar chips de filtros activos
  if (_arcStatusFilter) {
    const statusLabels = { escalating: 'Escalando', active: 'Activos', dormant: 'Dormidos' };
    activeChips.push(`<span class="qactive-chip">Estado: ${statusLabels[_arcStatusFilter] || _arcStatusFilter}</span>`);
  }

  if (_advancedFilters.dateFrom || _advancedFilters.dateTo) {
    const from = _advancedFilters.dateFrom || '...';
    const to = _advancedFilters.dateTo || '...';
    activeChips.push(`<span class="qactive-chip">Período: ${from} — ${to}</span>`);
  }

  if (_advancedFilters.cluster) {
    // Mostrar nombre corto en chip
    const shortName = _advancedFilters.cluster.length > 20
      ? _advancedFilters.cluster.substring(0, 20) + '...'
      : _advancedFilters.cluster;
    activeChips.push(`<span class="qactive-chip">Tema: ${shortName}</span>`);
  }

  if (_advancedFilters.urgency) {
    const urgencyLabels = { critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja' };
    activeChips.push(`<span class="qactive-chip">Urgencia: ${urgencyLabels[_advancedFilters.urgency] || _advancedFilters.urgency}</span>`);
  }

  // Mostrar/ocultar sección de filtros activos
  if (activeChips.length > 0) {
    chipsContainer.innerHTML = activeChips.join('');
    container.style.display = 'flex';
  } else {
    container.style.display = 'none';
  }
}

function _drawSparkline(history, clusterHex) {
  if (!history?.length) return '<svg width="120" height="30"></svg>';
  const scores = history.map(h => h.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 0.01;
  const W = 120, H = 28, pad = 2;
  const xs = scores.map((_, i) => pad + (i / Math.max(scores.length - 1, 1)) * (W - pad * 2));
  const ys = scores.map(s => H - pad - ((s - min) / range) * (H - pad * 2));
  const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const color = clusterHex || '#4CAF50';
  const dots = xs.map((x, i) => {
    const r = i === xs.length - 1 ? 2.5 : 2;
    return `<circle cx="${x.toFixed(1)}" cy="${ys[i].toFixed(1)}" r="${r}" fill="${color}"/>`;
  }).join('');
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block">` +
    `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>` +
    dots +
    `</svg>`;
}

function _renderNarrativeArcs(arcs) {
  const el = document.getElementById('narrative-arcs-list');
  if (!el) return;
  if (!arcs?.length) {
    el.innerHTML = '<div style="font-size:13px;color:var(--text3);padding:8px 0">Sin historias para el filtro seleccionado.</div>';
    return;
  }
  el.innerHTML = arcs.map(arc => {
    const clusterHex = _clusterHex(arc.cluster_name);
    const cfg        = _ARC_STATUS[arc.status] ?? _ARC_STATUS.active;
    const trendLabel = _ARC_TREND[arc.trend] ?? arc.trend;
    const kws        = (arc.keywords ?? []).slice(0, 5).map(k => `<span style="font-size:10px;background:var(--surface2);border-radius:4px;padding:1px 6px;color:var(--text2)">${_esc(k)}</span>`).join('');
    const spark      = _drawSparkline(arc.intensity_history ?? [], clusterHex);
    const last       = arc.last_seen ? new Date(arc.last_seen).toLocaleDateString('es-PE', { day: 'numeric', month: 'numeric', timeZone: 'America/Lima' }) : '—';
    const first      = arc.first_seen ? new Date(arc.first_seen).toLocaleDateString('es-PE', { day: 'numeric', month: 'numeric', timeZone: 'America/Lima' }) : '—';
    const pts        = (arc.intensity_history ?? []).length;

    const clusterLine = arc.cluster_name
      ? `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
           <span style="font-size:11px;font-weight:500;color:${clusterHex}">${_esc(arc.cluster_name)}</span>
           ${arc.urgency ? `<span style="font-size:10px;background:var(--surface2);color:var(--text2);border-radius:5px;padding:1px 7px">${arc.urgency}</span>` : ''}
         </div>`
      : '';

    return `<div onclick="_toggleArcDetail('${_esc(arc.arc_id)}')" style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;padding-left:12px;border-bottom:.5px solid var(--border);border-left:3px solid ${clusterHex};cursor:pointer" data-arc-id="${_esc(arc.arc_id)}">
      <div style="width:8px;height:8px;border-radius:50%;background:${clusterHex};flex-shrink:0;margin-top:4px"></div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
          <span style="font-size:13px;font-weight:500;color:var(--text1)">${_esc(arc.topic || '—')}</span>
          <span style="font-size:10px;background:var(--surface2);color:var(--text2);border-radius:5px;padding:1px 7px">${cfg.label}</span>
          ${trendLabel ? `<span style="font-size:10px;background:var(--surface2);color:var(--text2);border-radius:5px;padding:1px 7px">${trendLabel}</span>` : ''}
        </div>
        ${clusterLine}
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:5px">${kws}</div>
        <div style="font-size:10px;color:var(--text3)">${first} → ${last} · ${pts} ventana${pts !== 1 ? 's' : ''}</div>
      </div>
      <div style="flex-shrink:0;opacity:.8">${spark}</div>
    </div>
    <div id="arc-detail-${_esc(arc.arc_id)}" style="display:none;padding:10px 12px;background:var(--surface2);border-radius:10px;margin-bottom:4px;font-size:12px;color:var(--text2);line-height:1.6">
      ${_renderArcDetail(arc)}
    </div>`;
  }).join('');
}

function _toggleArcDetail(arcId) {
  const el = document.getElementById(`arc-detail-${arcId}`);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function _renderArcDetail(arc) {
  const regions = (arc.regions ?? []).join(', ') || '—';
  const dns     = (arc.dominant_narratives ?? []).map(d => `<span style="display:inline-block;background:var(--surface1,#fff);border-radius:5px;padding:1px 7px;margin:2px;font-size:11px">${_esc(d)}</span>`).join('');
  const history = arc.intensity_history ?? [];
  const peak    = history.length ? Math.max(...history.map(h => h.score)).toFixed(2) : '—';
  const last    = history.length ? history[history.length - 1].score.toFixed(2) : '—';
  const cluster = _formatClusterData(arc);

  // Grid items base
  let gridItems = [
    `<div><span style="color:var(--text3)">Regiones:</span> ${_esc(regions)}</div>`,
    `<div><span style="color:var(--text3)">Score actual:</span> ${last} · pico: ${peak}</div>`
  ];

  // Agregar cluster semántico si existe
  if (cluster.hasData) {
    const clusterName = cluster.name || '—';
    const urgencyLabel = cluster.urgency && _CLUSTER_URGENCY[cluster.urgency]
      ? _CLUSTER_URGENCY[cluster.urgency].label
      : '—';
    gridItems.push(`<div><span style="color:var(--text3)">Narrativa:</span> ${_esc(clusterName)}</div>`);
    gridItems.push(`<div><span style="color:var(--text3)">Urgencia institucional:</span> ${urgencyLabel}</div>`);
  }

  gridItems.push(`<div><span style="color:var(--text3)">Narrativas detectadas:</span></div>`);
  gridItems.push(`<div></div>`);

  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px">
    ${gridItems.join('')}
  </div>
  <div style="margin-top:6px">${dns || '<span style="color:var(--text3)">—</span>'}</div>`;
}

// ── D5: Contrato ──────────────────────────────────────────────────────────────

const _TIER_CONFIG = {
  pro:        { label: 'Pro',        bg: '#EFF6FF', color: '#1565C0' },
  enterprise: { label: 'Enterprise', bg: '#FFFBEB', color: '#B45309' },
  basic:      { label: 'Básico',     bg: 'var(--surface2)', color: 'var(--text2)' },
};

const _DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function _formatDays(days) {
  if (!days?.length) return '—';
  if (days.length === 7) return 'Todos los días';
  const sorted = [...days].sort((a, b) => a - b);
  if (JSON.stringify(sorted) === JSON.stringify([0, 1, 2, 3, 4])) return 'Lun – Vie';
  return sorted.map(d => _DAYS_ES[d] ?? '?').join(', ');
}

function _renderContratoTab(contract) {
  const tier = _TIER_CONFIG[contract.tier] ?? _TIER_CONFIG.basic;

  const statsEl = document.getElementById('contrato-stats');
  if (statsEl) {
    statsEl.innerHTML =
      `<div class="qstat"><div class="qstat-lbl">Institución</div>` +
      `<div class="qstat-val" style="font-size:16px">${_esc(contract.institution || '—')}</div></div>` +
      `<div class="qstat"><div class="qstat-lbl">Sector</div>` +
      `<div class="qstat-val" style="font-size:16px">${_esc(contract.sector || '—')}</div></div>` +
      `<div class="qstat"><div class="qstat-lbl">Tier</div><div class="qstat-val">` +
      `<span style="background:${tier.bg};color:${tier.color};border-radius:8px;padding:3px 12px;font-size:13px;font-weight:500">${tier.label}</span>` +
      `</div></div>` +
      `<div class="qstat"><div class="qstat-lbl">Vigencia desde</div>` +
      `<div class="qstat-val" style="font-size:16px">${_esc((contract.start_date ?? '').slice(0, 10) || '—')}</div></div>`;
  }

  const winEl = document.getElementById('contrato-ventanas');
  if (winEl) {
    const windows = contract.windows ?? [];
    winEl.innerHTML = !windows.length
      ? '<p style="font-size:13px;color:var(--text3)">Sin ventanas configuradas.</p>'
      : windows.map(w =>
          `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;` +
          `background:var(--surface2);border-radius:10px;margin-bottom:8px">` +
          `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="1.8" stroke-linecap="round">` +
          `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>` +
          `<span style="font-size:13px;color:var(--text1);font-weight:500">${_esc(w.start_time)} — ${_esc(w.end_time)}</span>` +
          `<span style="font-size:12px;color:var(--text3)">${_formatDays(w.days_of_week)}</span>` +
          `<span style="font-size:11px;color:var(--text3);margin-left:auto">${_esc(w.tz ?? 'America/Lima')}</span>` +
          `</div>`
        ).join('');
  }

  const kwEl = document.getElementById('contrato-keywords');
  if (kwEl) {
    const kws = contract.keywords_configured ?? [];
    kwEl.innerHTML = !kws.length
      ? '<span style="font-size:12px;color:var(--text3)">Sin keywords configurados</span>'
      : kws.map(k =>
          `<span style="display:inline-block;background:var(--surface2);color:var(--text2);` +
          `border-radius:6px;padding:2px 8px;font-size:11px;margin:0 3px 4px 0">${_esc(k)}</span>`
        ).join('');
    if (contract.contract_id) {
      kwEl.innerHTML +=
        `<div style="margin-top:14px;padding-top:12px;border-top:.5px solid var(--border)">` +
        `<div style="font-size:10px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;` +
        `color:var(--text3);margin-bottom:4px">ID de contrato</div>` +
        `<code style="font-family:var(--mono);font-size:11px;color:var(--text2);background:var(--surface2);` +
        `border:.5px solid var(--border);border-radius:6px;padding:2px 8px;word-break:break-all">${_esc(contract.contract_id)}</code>` +
        `</div>`;
    }
  }

  const streamEl = document.getElementById('contrato-emisoras');
  if (streamEl) {
    const streams        = contract.streams ?? [];
    const contractWins   = contract.windows ?? [];
    streamEl.innerHTML = !streams.length
      ? '<p style="font-size:13px;color:var(--text3)">Sin emisoras configuradas.</p>'
      : streams.map((s, i) => {
          const ownWins    = s.stream_windows ?? [];
          const hasOwn     = ownWins.length > 0;
          const wins       = hasOwn ? ownWins : contractWins;
          const winText    = wins.length
            ? `${_esc(wins[0].start_time)} — ${_esc(wins[0].end_time)} · ${_formatDays(wins[0].days_of_week)}`
            : '—';
          const chip = hasOwn
            ? `<span style="font-size:11px;font-weight:500;padding:1px 8px;border-radius:20px;` +
              `background:rgba(186,117,23,0.12);color:#854F0B;border:.5px solid rgba(186,117,23,0.4)">Ventana propia</span>`
            : `<span style="font-size:11px;padding:1px 8px;border-radius:20px;` +
              `background:var(--surface2);color:var(--text3)">Hereda del contrato</span>`;
          const isLast = i === streams.length - 1;
          return (
            `<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;` +
            (isLast ? '' : 'border-bottom:.5px solid var(--border);') + `">` +
            `<div style="width:8px;height:8px;border-radius:50%;background:#4CAF50;flex-shrink:0;margin-top:4px"></div>` +
            `<div style="flex:1;min-width:0">` +
            `<div style="font-size:13px;font-weight:500;color:var(--text1)">${_esc(s.radio_id || s.label || '—')}` +
            (s.region ? ` <span style="color:var(--text3);font-weight:400">· ${_esc(s.region)}</span>` : '') +
            `</div>` +
            `<div style="display:flex;align-items:center;gap:8px;margin-top:3px;flex-wrap:wrap">` +
            `<span style="font-size:12px;color:var(--text2)">${winText}</span>` +
            chip +
            `</div></div></div>`
          );
        }).join('');
  }
}

async function _fetchContract() {
  try {
    const contract = await _apiFetch('/my/contract');
    _contractId          = contract.contract_id ?? null;
    _contractStreamCount = contract.streams?.length ?? null;
    _renderContratoTab(contract);
  } catch {
    const el = document.getElementById('contrato-stats');
    if (el) el.innerHTML = '<p style="font-size:13px;color:var(--text3)">Sin contrato activo.</p>';
  }
}

// ── D12: Summary ─────────────────────────────────────────────────────────────

let _trendChart   = null;
let _selectedTema = null;

function _bubbleCoords(N, centerX, centerY) {
  if (N === 0) return [];
  if (N === 1) return [[centerX, centerY]];
  const minR = 70;
  const R = Math.max(minR, minR / Math.sin(Math.PI / N)) * 1.1;
  return Array.from({ length: N }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i / N);
    return [centerX + R * Math.cos(angle), centerY + R * Math.sin(angle)];
  });
}

function _renderTemasBubble(narrativas) {
  const el = document.getElementById('temas-bubble-container');
  if (!el) return;
  if (!narrativas?.length) {
    el.innerHTML = '<p style="font-size:13px;color:var(--text3);text-align:center;padding:40px 0">Sin temas activos.</p>';
    return;
  }

  const N      = narrativas.length;
  const W      = 580;
  const H      = N > 4 ? 320 : 280;
  const centerX = 200, centerY = H / 2;
  const coords  = _bubbleCoords(N, centerX, centerY);
  const items   = narrativas;
  const maxScore = Math.max(...items.map(n => n.importance_score ?? 0), 0.01);
  const getR     = s => 18 + ((s ?? 0) / maxScore) * 48;

  const allRegions = [...new Set(items.flatMap(n => n.unique_regions ?? []))].slice(0, 6);
  const regionX    = 500;
  const regionY    = i => allRegions.length < 2
    ? H / 2
    : 50 + i * (H - 80) / (allRegions.length - 1);

  let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:260px;display:block">`;

  // Bezier hebras (1 por conexión narrativa→región)
  for (const [i, nav] of items.entries()) {
    const [cx, cy] = coords[i];
    const hex = _clusterHex(nav.topic);
    for (const region of (nav.unique_regions ?? []).slice(0, 4)) {
      const ri = allRegions.indexOf(region);
      if (ri < 0) continue;
      const ry = regionY(ri);
      const mx = (cx + regionX) / 2;
      svg += `<path d="M${cx},${cy} C${mx},${cy} ${mx},${ry} ${regionX},${ry}" fill="none" stroke="${hex}" stroke-width="1.2" opacity="0.3"/>`;
    }
  }

  // Nodos de región
  for (const [i, region] of allRegions.entries()) {
    const ry = regionY(i);
    svg += `<circle cx="${regionX}" cy="${ry}" r="3.5" fill="var(--text3)"/>`;
    svg += `<text x="${regionX + 9}" y="${ry + 4}" font-size="11" fill="var(--text2)" font-family="var(--font)">${_esc(region)}</text>`;
  }

  // Burbujas
  for (const [i, nav] of items.entries()) {
    const [cx, cy] = coords[i];
    const r   = getR(nav.importance_score);
    const hex = _clusterHex(nav.topic);
    const isSel = nav.topic === _selectedTema;
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${hex}" fill-opacity="${isSel ? 0.25 : 0.14}" stroke="${hex}" stroke-width="${isSel ? 2.5 : 1.8}" style="cursor:pointer" onclick="_selectTema('${_esc(nav.topic ?? '')}')"/>`;

    const words  = (nav.topic ?? '').split(' ');
    const half   = Math.ceil(words.length / 2);
    const line1  = words.slice(0, half).join(' ');
    const line2  = words.slice(half).join(' ');
    const yOff   = line2 ? -7 : 0;
    svg += `<text x="${cx}" y="${cy + yOff}" text-anchor="middle" font-size="10" font-weight="500" fill="${hex}" font-family="var(--font)" style="pointer-events:none">${_esc(line1)}</text>`;
    if (line2) svg += `<text x="${cx}" y="${cy + yOff + 13}" text-anchor="middle" font-size="10" font-weight="500" fill="${hex}" font-family="var(--font)" style="pointer-events:none">${_esc(line2)}</text>`;
  }

  svg += '</svg>';
  el.innerHTML = svg;
}

const TREND_LABEL_DEFAULT = 'Cada línea es un tema. La altura refleja su presencia simultánea en radios e historias.';

function _selectTema(clusterName) {
  // Toggle: clic en burbuja ya seleccionada → deseleccionar
  if (_selectedTema === clusterName) clusterName = null;
  _selectedTema = clusterName;

  if (_summary?.narrativas) _renderTemasBubble(_summary.narrativas);
  _applyTrendSelection(clusterName);

  const trendLabel = document.getElementById('temas-trend-label');
  const panel      = document.getElementById('temas-rationale-panel');

  const resetBtn = document.getElementById('temas-reset-btn');

  if (!clusterName) {
    if (resetBtn)    resetBtn.style.display = 'none';
    if (trendLabel) {
      const narrativas = _summary?.narrativas ?? [];
      trendLabel.textContent = narrativas.length ? _buildVeredictoConjunto(narrativas) : TREND_LABEL_DEFAULT;
      trendLabel.style.color = '';
    }
    if (panel) {
      panel.style.borderLeftColor = 'var(--border)';
      panel.innerHTML = '<div style="font-size:13px;color:var(--text3);line-height:1.6">Selecciona un tema para ver su análisis: historias activas, señal de urgencia y contexto.</div>';
    }
    return;
  }

  const nav = (_summary?.narrativas ?? []).find(n => n.topic === clusterName);
  if (!nav) {
    if (resetBtn)    resetBtn.style.display = 'none';
    if (trendLabel) { trendLabel.textContent = TREND_LABEL_DEFAULT; trendLabel.style.color = ''; }
    if (panel) panel.style.borderLeftColor = 'var(--border)';
    return;
  }

  if (resetBtn) resetBtn.style.display = 'inline-block';

  const hex = _clusterHex(clusterName);

  if (trendLabel) {
    trendLabel.textContent = _getTrendVeredicto(nav);
    trendLabel.style.color = hex;
  }

  if (!panel) return;
  const arcCount  = nav.arc_count ?? '';
  const urg       = nav.urgency_label ?? nav.urgency ?? '';
  const rationale = nav.rationale ?? '—';

  panel.style.borderLeftColor = hex;
  panel.style.borderLeftWidth = '3px';
  panel.innerHTML =
    `<div style="font-size:14px;font-weight:600;color:${hex};margin-bottom:10px">${_esc(clusterName)}</div>` +
    `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">` +
    (arcCount ? `<span style="font-size:11px;padding:2px 10px;border-radius:20px;border:1.5px solid ${hex};color:${hex}">${arcCount} historias</span>` : '') +
    (urg      ? `<span style="font-size:11px;padding:2px 10px;border-radius:20px;background:var(--surface2);color:var(--text2)">${_esc(urg)}</span>` : '') +
    `</div>` +
    `<div style="font-size:13px;color:var(--text2);line-height:1.6">${_esc(rationale)}</div>`;
}

function _calcTrendFromSeries(series) {
  if (!series?.length) return 'sin_datos';
  const sorted  = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const recent  = sorted.slice(-3).map(p => p.score);
  const prev    = sorted.slice(-6, -3).map(p => p.score);
  if (!prev.length) return 'nuevo';
  const avg = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
  const delta = avg(recent) - avg(prev);
  if (delta > 0.06)  return 'escalating';
  if (delta < -0.06) return 'descending';
  return 'stable';
}

function _getTrendVeredicto(nav) {
  const t = _calcTrendFromSeries(nav?.series);
  if (t === 'escalating') return 'Intensificándose — cobertura creciente en los últimos días.';
  if (t === 'descending') return 'Cediendo — la presencia pierde intensidad.';
  if (t === 'nuevo')      return 'Emergiendo — primer ciclo de cobertura registrado.';
  if (t === 'stable')     return 'Sostenido — presencia estable en la agenda.';
  return nav?.trend_label ?? nav?.rationale?.split('.')[0] ?? '—';
}

function _buildVeredictoConjunto(narrativas) {
  let creciendo = 0, estable = 0, cediendo = 0;
  for (const n of narrativas) {
    const t = _calcTrendFromSeries(n.series);
    if (t === 'escalating' || t === 'nuevo') creciendo++;
    else if (t === 'descending') cediendo++;
    else estable++;
  }
  const parts = [];
  if (creciendo) parts.push(`${creciendo} creciendo`);
  if (estable)   parts.push(`${estable} estable${estable > 1 ? 's' : ''}`);
  if (cediendo)  parts.push(`${cediendo} cediendo`);
  return parts.join(' · ') || 'Sin datos de tendencia.';
}

function _applyTrendSelection(clusterName) {
  if (!_trendChart) return;
  _trendChart.data.datasets.forEach(ds => {
    const hex = _clusterHex(ds.label);
    if (!clusterName) {
      ds.borderColor          = hex;
      ds.pointBackgroundColor = hex;
      ds.borderWidth          = 2;
      ds.pointRadius          = 2;
    } else if (ds.label === clusterName) {
      ds.borderColor   = hex;
      ds.borderWidth   = 3;
      ds.pointRadius   = ds.data.map(v => v !== null ? 3 : 0);
    } else {
      ds.borderColor           = _hexToRgba(hex, 0.07);
      ds.pointBackgroundColor  = _hexToRgba(hex, 0.07);
      ds.borderWidth           = 2;
      ds.pointRadius           = 1;
    }
  });
  _trendChart.update('none');
}

function _initTrendChart() {
  const canvas = document.getElementById('temas-trend');
  if (!canvas) return;
  if (_trendChart) { _trendChart.destroy(); _trendChart = null; }
  _trendChart = new Chart(canvas, {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}` } }
      },
      scales: {
        y: { display: false },
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: tickColor(), font: { size: 10 }, maxRotation: 0, maxTicksLimit: 6 }
        }
      }
    }
  });
}

function _updateTemasTrend(narrativas) {
  if (!_trendChart) _initTrendChart();
  if (!_trendChart || !narrativas?.length) return;

  const allDates = [...new Set(
    narrativas.flatMap(n => (n.series ?? []).map(p => p.date))
  )].sort();

  if (!allDates.length) return;

  const datasets = narrativas.map(n => {
    const hex = _clusterHex(n.topic);
    const byDate = Object.fromEntries((n.series ?? []).map(p => [p.date, p.score]));
    return {
      label:                n.topic ?? '—',
      data:                 allDates.map(d => byDate[d] ?? null),
      borderColor:          hex,
      backgroundColor:      'transparent',
      fill:                 false,
      tension:              0.4,
      borderWidth:          2,
      borderCapStyle:       'round',
      pointRadius:          2,
      pointHitRadius:       6,
      pointBackgroundColor: hex,
      spanGaps:             true,
    };
  });

  const rangeEl = document.getElementById('temas-trend-range');
  if (rangeEl && allDates.length) {
    const fmt = d => d.slice(5).replace('-', '/');
    rangeEl.textContent = `Importancia diaria estimada · ${fmt(allDates[0])}–${fmt(allDates[allDates.length - 1])}`;
  }

  _trendChart.data.labels   = allDates.map(d => d.slice(5));
  _trendChart.data.datasets = datasets;
  _trendChart.options.scales.x.ticks.color = tickColor();
  _trendChart.update();
  _applyTrendSelection(_selectedTema);
}

async function _loadSummary() {
  try {
    const summary = await _apiFetch('/my/summary');
    _summary = summary;
    _updateTemasFromSummary(summary);
  } catch (err) {
    console.warn('[Qontexto] summary fallido:', err.message);
  }
}

function _updateTemasFromSummary(summary) {
  // F2a — Topbar
  if (summary.topbar) {
    const tb = summary.topbar;
    _setText('stat-vent',        tb.ventana    || '—');
    _setText('stat-streams',     tb.radios     ?? '—');
    _setText('stat-alertas',     tb.alertas    ?? 0);
    _setText('stat-actualizado', tb.actualizado || limaTime());
    const alertEl = document.getElementById('stat-alertas');
    if (alertEl) {
      const n = tb.alertas ?? 0;
      alertEl.style.color = n >= 5 ? '#EF4444' : n >= 1 ? '#F59E0B' : 'inherit';
      n >= 5 ? alertEl.classList.add('alert') : alertEl.classList.remove('alert');
    }
  }

  // F2b — Veredicto
  const verdEl   = document.getElementById('veredicto-text');
  const verdCard = document.getElementById('veredicto-card');
  if (verdEl) verdEl.textContent = summary.veredicto || '—';
  if (verdCard && summary.narrativas?.length) {
    verdCard.style.borderLeftColor = _clusterHex(summary.narrativas[0]?.topic);
    verdCard.style.borderLeftWidth = '3px';
  }

  // Color map → bubble → trend (en ese orden)
  if (summary.narrativas?.length) {
    _buildClusterColorMap(summary.narrativas);
  }

  // Trend label: veredicto conjunto si no hay selección activa
  const trendLabel = document.getElementById('temas-trend-label');
  if (trendLabel && !_selectedTema && summary.narrativas?.length) {
    trendLabel.textContent = _buildVeredictoConjunto(summary.narrativas);
    trendLabel.style.color = '';
  }

  // Panel default al cargar (sin selección)
  if (!_selectedTema) {
    const panel = document.getElementById('temas-rationale-panel');
    if (panel) {
      panel.style.borderLeftColor = 'var(--border)';
      panel.innerHTML = '<div style="font-size:13px;color:var(--text3);line-height:1.6">Selecciona un tema para ver su análisis: historias activas, señal de urgencia y contexto.</div>';
    }
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function startPolling() {
  _fetchContract();

  try {
    _sessionId = await _detectSession();
  } catch (err) {
    console.info('[Qontexto] sin sesión activa:', err.message);
  }

  _updateWebhookUI();
  _updateHistorialUI();

  // Summary para Tab Resumen — siempre, independiente del modo
  _loadSummary();

  if (_sessionIsLive) {
    // Sesión activa: poll cada 30s con datos de la sesión en vivo
    const pdfBtn = document.getElementById('btn-pdf');
    if (pdfBtn) { pdfBtn.disabled = false; pdfBtn.title = 'Descargar PDF del período actual'; }
    _loadClusterNames(); // F3 FIX: cargar cluster_names dinámicos
    _loadNarrativeArcs();
    await _poll();
    _pollTimer = setInterval(() => { _poll(); _loadSummary(); }, 30_000);
  } else {
    // Sin sesión en vivo: Tab Señales muestra acumulado 30 días
    await _fetchAggregateState({ days: 30 });
    _loadClusterNames(); // F3 FIX: cargar cluster_names dinámicos
    _loadNarrativeArcs();
    _loadSessionList();
    _pollTimer = setInterval(() => { _tickLiveTime(); _loadSummary(); }, 30_000);
  }
}

// startPolling() es llamado por auth.js tras autenticación exitosa
