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

// ── Urgency mapping (institutional_relevance → color semáforo) ───────────────

const URGENCY = {
  critical: { color: '#991B1B', bg: '#FEF2F2', textColor: '#991B1B', label: 'Alerta máxima' },
  high:     { color: '#EF4444', bg: '#FEF2F2', textColor: '#B91C1C', label: 'Señal temprana' },
  medium:   { color: '#F59E0B', bg: '#FFFBEB', textColor: '#B45309', label: 'Emergiendo'    },
  low:      { color: '#4CAF50', bg: '#F0FBF1', textColor: '#2E7D32', label: 'Estable'       },
};
const _URGENCY_ORDER = ['critical', 'high', 'medium', 'low'];

const _TONE_URGENCY = {
  conspirativo:    'critical',
  confrontacional: 'critical',
  alarmista:       'high',
  critico:         'medium',
  informativo:     'low',
  positivo:        'low',
};

// 12 slots ordenados desde el centro hacia los bordes
const _WC_SLOTS   = [
  { top: 65,  left: 88  }, { top: 44,  left: 168 }, { top: 98,  left: 8   }, { top: 108, left: 162 },
  { top: 22,  left: 48  }, { top: 138, left: 85  }, { top: 78,  left: 218 }, { top: 5,   left: 168 },
  { top: 152, left: 8   }, { top: 6,   left: 4   }, { top: 158, left: 188 }, { top: 130, left: 220 },
];
const _WC_SIZES   = [28, 20, 17, 15, 13, 12, 11, 11, 10, 10, 9, 9];
const _WC_WEIGHTS = [500, 500, 500, 500, 500, 400, 400, 400, 400, 400, 400, 400];

const _TREND_CONFIG = {
  escalando: { label: 'Escalando', bg: '#FEF2F2', color: '#991B1B', arrow: '<polyline points="18 15 12 9 6 15"/>' },
  estable:   { label: 'Estable',   bg: '#FFFBEB', color: '#B45309', arrow: '<line x1="5" y1="12" x2="19" y2="12"/>' },
  cediendo:  { label: 'Cediendo',  bg: '#F0FBF1', color: '#2E7D32', arrow: '<polyline points="6 9 12 15 18 9"/>'  },
};

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

function _maxUrgency(a, b) {
  const ia = _URGENCY_ORDER.indexOf(a ?? 'low');
  const ib = _URGENCY_ORDER.indexOf(b ?? 'low');
  return ia <= ib ? (a ?? 'low') : (b ?? 'low');
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

// ── Card Narrativas ───────────────────────────────────────────────────────────

function _buildNarrativeItems(snapshots) {
  if (!snapshots?.length) return null;

  const counts    = {};
  const urgencies = {};

  for (const snap of snapshots) {
    const n = snap.dominant_narrative;
    if (!n) continue;
    counts[n]    = (counts[n] ?? 0) + 1;
    urgencies[n] = _maxUrgency(urgencies[n], snap.institutional_relevance);
  }

  const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  if (!sorted.length) return null;

  const items = sorted.slice(0, 4).map(n => ({
    label:   n,
    weight:  counts[n],
    urgency: urgencies[n] ?? 'low',
  }));

  const otrosWeight = sorted.slice(4).reduce((s, n) => s + counts[n], 0);
  if (otrosWeight > 0) items.push({ label: 'Otros', weight: otrosWeight, urgency: 'neutral' });

  return items;
}

function _updateNarrativasCard(state, items) {
  if (!items) return;

  if (typeof pieRef !== 'undefined' && pieRef) {
    pieRef.data.labels                      = items.map(i => i.label);
    pieRef.data.datasets[0].data            = items.map(i => i.weight);
    pieRef.data.datasets[0].backgroundColor = items.map(i =>
      URGENCY[i.urgency]?.color ?? '#9E9E9E'
    );
    _pieVerdicts = items.map(i => URGENCY[i.urgency]?.label ?? 'Otros');
    pieRef.update();
  }

  const legendEl = document.getElementById('pie-legend');
  if (legendEl) {
    legendEl.innerHTML = items.map((item, idx) => {
      const u        = URGENCY[item.urgency];
      const dotColor = u?.color     ?? 'var(--text3)';
      const tagBg    = u?.bg        ?? 'var(--surface2)';
      const tagColor = u?.textColor ?? 'var(--text3)';
      const tagLabel = u?.label     ?? 'Otros';
      const mb       = idx === items.length - 1 ? 'margin-bottom:0' : '';
      return `<div class="qleg-row" style="${mb}">` +
        `<span style="display:flex;align-items:center;min-width:0;flex:1">` +
        `<span class="qleg-dot" style="background:${dotColor}"></span>` +
        `<span class="qleg-name">${_esc(item.label)}</span></span>` +
        `<span class="qleg-tag" style="background:${tagBg};color:${tagColor}">${tagLabel}</span>` +
        `</div>`;
    }).join('');
  }

  const title = state.latest_snapshot?.dominant_narrative ?? items[0]?.label ?? '';
  _setText('card-narrativas-title', title);

  const n = state.streams_monitored?.length ?? 0;
  _setText('card-narrativas-footer', `${n} emisora${n !== 1 ? 's' : ''} · ${limaTime()} PE`);
}

// ── Card Voces ────────────────────────────────────────────────────────────────

function _buildVocesItems(snapshot, allSnapshots) {
  // En modo agregado usa todos los snapshots para tener keywords y tonos variados.
  // En modo sesión individual usa solo el snapshot más reciente.
  const sources = (allSnapshots?.length > 1) ? allSnapshots : (snapshot ? [snapshot] : []);
  if (!sources.length) return null;

  const freq    = {};
  const urgency = {};

  for (const snap of sources) {
    if (!snap?.per_stream) continue;
    for (const stream of Object.values(snap.per_stream)) {
      const su = _TONE_URGENCY[stream.tone] ?? 'low';
      for (const kw of (stream.top_keywords ?? [])) {
        freq[kw]    = (freq[kw] ?? 0) + 1;
        urgency[kw] = _maxUrgency(urgency[kw], su);
      }
    }
  }

  const sorted = Object.keys(freq).sort((a, b) => freq[b] - freq[a]);
  if (!sorted.length) return null;

  return sorted.slice(0, _WC_SLOTS.length).map(kw => ({
    label:   kw,
    count:   freq[kw],
    urgency: urgency[kw] ?? 'low',
  }));
}

function _updateVocesCard(state) {
  const items = _buildVocesItems(state.latest_snapshot, state.snapshots);
  if (!items) return;

  const wcEl = document.getElementById('word-cloud');
  if (wcEl) {
    wcEl.innerHTML = items.map((item, i) => {
      const slot   = _WC_SLOTS[i];
      const size   = _WC_SIZES[i]   ?? 9;
      const weight = _WC_WEIGHTS[i] ?? 400;
      const color  = URGENCY[item.urgency]?.color ?? 'var(--text3)';
      return `<span style="font-size:${size}px;font-weight:${weight};color:${color};` +
        `top:${slot.top}px;left:${slot.left}px">${_esc(item.label)}</span>`;
    }).join('');
  }

  if (items.length >= 2) {
    _setText('card-voces-title', `${items[0].label} y ${items[1].label} dominan el centro`);
  } else if (items.length === 1) {
    _setText('card-voces-title', `${items[0].label} domina el centro`);
  }

  const n = state.streams_monitored?.length ?? 0;
  _setText('card-voces-footer', `${n} emisora${n !== 1 ? 's' : ''} · ${limaTime()} PE`);
}

// ── Card Momento ─────────────────────────────────────────────────────────────

function _detectTrend(snapshots, narrative) {
  const series = snapshots
    .filter(s => s.dominant_narrative === narrative)
    .sort((a, b) => new Date(a.window_start) - new Date(b.window_start))
    .map(s => s.correlation_score);

  if (series.length < 2) return 'estable';
  const last = series[series.length - 1];
  const avg  = series.slice(0, -1).reduce((s, v) => s + v, 0) / (series.length - 1);
  if (last > avg * 1.15) return 'escalando';
  if (last < avg * 0.85) return 'cediendo';
  return 'estable';
}

function _buildSparklineData(snapshots, narrativeItems) {
  if (!snapshots?.length || !narrativeItems?.length) return null;

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.window_start) - new Date(b.window_start)
  );
  const labels = sorted.map(s => limaTime(new Date(s.window_start)));
  const top4   = narrativeItems.filter(i => i.urgency !== 'neutral').slice(0, 4);

  const datasets = top4.map((item, idx) => {
    const data    = sorted.map(s =>
      s.dominant_narrative === item.label
        ? Math.round(s.correlation_score * 100) / 10  // 0.0–1.0 → 0.0–10.0
        : null
    );
    const color   = URGENCY[item.urgency]?.color ?? '#9E9E9E';
    const isTop   = idx < 2;
    return {
      label:               item.label,
      data,
      spanGaps:            false,
      borderColor:         isTop ? color : _hexToRgba(color, 0.35),
      backgroundColor:     idx === 0 ? _hexToRgba(color, 0.07) : 'transparent',
      fill:                idx === 0,
      tension:             0.4,
      borderWidth:         isTop ? 2.5 : 1,
      pointRadius:         data.map(v => v !== null ? (isTop ? 5 : 3) : 0),
      pointBackgroundColor: color,
      pointBorderWidth:    0,
    };
  });

  return { labels, datasets };
}

function _updateMomentoCard(state, narrativeItems) {
  const snap = state.latest_snapshot;
  if (!snap || !narrativeItems?.length) return;

  const sparkData = _buildSparklineData(state.snapshots, narrativeItems);
  if (sparkData && typeof sparkRef !== 'undefined' && sparkRef) {
    sparkRef.data.labels   = sparkData.labels;
    sparkRef.data.datasets = sparkData.datasets;
    sparkRef.update();
  }

  const trend  = _detectTrend(state.snapshots ?? [], snap.dominant_narrative ?? '');
  const tConf  = _TREND_CONFIG[trend];
  const pillEl = document.getElementById('card-momento-pill');
  if (pillEl && tConf) {
    pillEl.style.background = tConf.bg;
    pillEl.style.color      = tConf.color;
    pillEl.innerHTML =
      `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="${tConf.color}" ` +
      `stroke-width="2.5" stroke-linecap="round">${tConf.arrow}</svg> ${tConf.label}`;
  }

  const title = snap.cross_stream_signals?.[0] ?? snap.dominant_narrative ?? '';
  _setText('card-momento-title', title);

  const n     = state.streams_monitored?.length ?? 0;
  const start = state.session_start ? limaTime(new Date(state.session_start)) : '';
  _setText('card-momento-footer',
    start
      ? `${n} emisora${n !== 1 ? 's' : ''} · ${start} — ${limaTime()} PE`
      : `${n} emisora${n !== 1 ? 's' : ''} · ${limaTime()} PE`
  );
}

// ── UI update ─────────────────────────────────────────────────────────────────

function _updateUI(state) {
  const streamCount = state.streams_monitored?.length ?? 0;
  const alertCount  = state.summary?.alerts_total    ?? 0;

  _setText('stat-streams', streamCount);
  _setText('stat-alertas', alertCount);
  _setText('live-label', `${streamCount} stream${streamCount !== 1 ? 's' : ''} · ${limaTime()} PE`);

  const alertEl = document.getElementById('stat-alertas');
  if (alertEl) {
    alertEl.style.color = alertCount >= 5 ? '#EF4444'
                        : alertCount >= 1 ? '#F59E0B'
                        : 'inherit';
  }

  const narrativeItems = _buildNarrativeItems(state.snapshots);
  _updateNarrativasCard(state, narrativeItems);
  _updateVocesCard(state);
  _updateMomentoCard(state, narrativeItems);
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

  for (const ev of sorted) {
    const sev      = ev.alert?.severity ?? 'low';
    const color    = _SEV_COLOR[sev] ?? 'var(--text3)';
    const isUrgent = sev === 'critical' || sev === 'high';
    const time     = limaTime(new Date(ev.timestamp));
    const summary  = _esc(ev.alert?.summary ?? '');
    const sub      = [ev.radio_id, ev.region].filter(Boolean).map(_esc).join(' · ');
    const raw      = ev.text ?? '';
    const quote    = raw.length > 0 && raw.length <= 150
      ? _esc(raw.length > 120 ? raw.slice(0, 119) + '…' : raw)
      : '';

    const wrap  = isUrgent
      ? `style="background:rgba(153,27,27,0.05);border-radius:12px;padding:10px;margin:0 -4px"`
      : '';
    const tSty  = isUrgent ? ` style="color:${color};font-weight:500"` : '';
    const hdSty = isUrgent ? ` style="color:${color}"` : '';

    rows.push(
      `<div class="qtevent" ${wrap}><div class="qtl-left">` +
      `<div class="qtl-time"${tSty}>${time}</div>` +
      `<div class="qtl-dot" style="background:${color}"></div><div class="qtl-line"></div></div>` +
      `<div><div class="qtl-title"${hdSty}>${summary}</div>` +
      (sub   ? `<div class="qtl-sub">${sub}</div>` : '') +
      (quote ? `<div class="qtl-quote">"${quote}"</div>` : '') +
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
      ? `<p>${n} alerta${n !== 1 ? 's' : ''} registrada${n !== 1 ? 's' : ''}. Análisis disponible con el próximo ciclo.</p>`
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

  const alertCount = {};
  const maxSev     = {};

  for (const ev of alerts) {
    const sid = ev.stream_id;
    if (!sid) continue;
    alertCount[sid] = (alertCount[sid] ?? 0) + 1;
    const sev = ev.alert?.severity ?? 'low';
    if (!maxSev[sid] || _SEV_ORDER.indexOf(sev) < _SEV_ORDER.indexOf(maxSev[sid])) {
      maxSev[sid] = sev;
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
    const cntSty = cnt > 0 ? ` style="color:${status.color}"` : '';

    return `<div class="qstream"${border}>` +
      `<div class="qstream-name">` +
      `<div style="width:8px;height:8px;border-radius:50%;background:${status.color};flex-shrink:0"></div>` +
      `${name}</div>` +
      `<div class="qstream-region">${region}</div>` +
      `<div class="qstream-row"><span class="qstream-key">Alertas</span>` +
      `<span class="qstream-val"${cntSty}>${cnt}</span></div>` +
      `<div class="qstream-row"><span class="qstream-key">Estado</span>` +
      `<span class="qstream-val" style="color:${status.color}">${status.label}</span></div>` +
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
    _sessionList  = await _apiFetch('/my/sessions');
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
    `<span style="color:${s.alerts_total > 0 ? '#F59E0B' : 'var(--text3)'}">${s.alerts_total} alertas</span>` +
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

async function _loadNarrativeArcs() {
  try {
    _allArcs = await _apiFetch('/my/narrative-arcs?limit=50');
    _renderNarrativeArcs(_allArcs);
  } catch (err) {
    const el = document.getElementById('narrative-arcs-list');
    if (el) el.innerHTML = '<div style="font-size:13px;color:var(--text3);padding:8px 0">No hay arcos narrativos registrados aún.</div>';
    console.warn('[Qontexto] narrative-arcs fallido:', err.message);
  }
}

function filterArcs(status, btnEl) {
  _arcStatusFilter = status;
  document.querySelectorAll('.qarc-filter').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  const filtered = status ? _allArcs.filter(a => a.status === status) : _allArcs;
  _renderNarrativeArcs(filtered);
}

function _drawSparkline(history) {
  if (!history?.length) return '<svg width="120" height="30"></svg>';
  const scores = history.map(h => h.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 0.01;
  const W = 120, H = 28, pad = 2;
  const xs = scores.map((_, i) => pad + (i / Math.max(scores.length - 1, 1)) * (W - pad * 2));
  const ys = scores.map(s => H - pad - ((s - min) / range) * (H - pad * 2));
  const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const last = scores[scores.length - 1];
  const color = last >= 0.7 ? '#EF4444' : last >= 0.5 ? '#F59E0B' : '#4CAF50';
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block">` +
    `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>` +
    `<circle cx="${xs[xs.length-1].toFixed(1)}" cy="${ys[ys.length-1].toFixed(1)}" r="2.5" fill="${color}"/>` +
    `</svg>`;
}

function _renderNarrativeArcs(arcs) {
  const el = document.getElementById('narrative-arcs-list');
  if (!el) return;
  if (!arcs?.length) {
    el.innerHTML = '<div style="font-size:13px;color:var(--text3);padding:8px 0">Sin arcos para el filtro seleccionado.</div>';
    return;
  }
  el.innerHTML = arcs.map(arc => {
    const cfg   = _ARC_STATUS[arc.status] ?? _ARC_STATUS.active;
    const trend = _ARC_TREND[arc.trend] ?? arc.trend;
    const kws   = (arc.keywords ?? []).slice(0, 5).map(k => `<span style="font-size:10px;background:var(--surface2);border-radius:4px;padding:1px 6px;color:var(--text2)">${_esc(k)}</span>`).join('');
    const spark  = _drawSparkline(arc.intensity_history ?? []);
    const last   = arc.last_seen ? new Date(arc.last_seen).toLocaleDateString('es-PE', { day: 'numeric', month: 'numeric', timeZone: 'America/Lima' }) : '—';
    const first  = arc.first_seen ? new Date(arc.first_seen).toLocaleDateString('es-PE', { day: 'numeric', month: 'numeric', timeZone: 'America/Lima' }) : '—';
    const pts    = (arc.intensity_history ?? []).length;
    return `<div onclick="_toggleArcDetail('${_esc(arc.arc_id)}')" style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:.5px solid var(--border);cursor:pointer" data-arc-id="${_esc(arc.arc_id)}">
      <div style="width:8px;height:8px;border-radius:50%;background:${cfg.dot};flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
          <span style="font-size:13px;font-weight:500;color:var(--text1)">${_esc(arc.topic || '—')}</span>
          <span style="font-size:10px;background:${cfg.bg};color:${cfg.color};border-radius:5px;padding:1px 7px;font-weight:500">${cfg.label}</span>
          <span style="font-size:11px;color:var(--text3)">${trend}</span>
        </div>
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
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px">
    <div><span style="color:var(--text3)">Regiones:</span> ${_esc(regions)}</div>
    <div><span style="color:var(--text3)">Score actual:</span> ${last} · pico: ${peak}</div>
    <div><span style="color:var(--text3)">Narrativas detectadas:</span></div>
    <div></div>
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
        `<code style="font-size:11px;color:var(--text3);word-break:break-all">${_esc(contract.contract_id)}</code>` +
        `</div>`;
    }
  }

  const streamEl = document.getElementById('contrato-emisoras');
  if (streamEl) {
    const streams = contract.streams ?? [];
    streamEl.innerHTML = !streams.length
      ? '<p style="font-size:13px;color:var(--text3)">Sin emisoras configuradas.</p>'
      : `<div class="qstream-grid">` + streams.map(s =>
          `<div class="qstream">` +
          `<div class="qstream-name">` +
          `<div style="width:8px;height:8px;border-radius:50%;background:var(--text3);flex-shrink:0"></div>` +
          `${_esc(s.radio_id || s.label || '—')}</div>` +
          `<div class="qstream-region">${_esc(s.region || '—')}</div>` +
          `<div class="qstream-row"><span class="qstream-key">Ciudad</span>` +
          `<span class="qstream-val">${_esc(s.city || '—')}</span></div>` +
          `<div class="qstream-row"><span class="qstream-key">Plataforma</span>` +
          `<span class="qstream-val">${_esc(s.platform || '—')}</span></div>` +
          `</div>`
        ).join('') + `</div>`;
  }
}

async function _fetchContract() {
  try {
    const contract = await _apiFetch('/my/contract');
    _renderContratoTab(contract);
  } catch {
    const el = document.getElementById('contrato-stats');
    if (el) el.innerHTML = '<p style="font-size:13px;color:var(--text3)">Sin contrato activo.</p>';
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

  if (_sessionIsLive) {
    // Sesión activa: poll cada 30s con datos de la sesión en vivo
    const pdfBtn = document.getElementById('btn-pdf');
    if (pdfBtn) { pdfBtn.disabled = false; pdfBtn.title = 'Descargar PDF del período actual'; }
    await _poll();
    _pollTimer = setInterval(_poll, 30_000);
  } else {
    // Sin sesión en vivo: Tab Resumen muestra acumulado 30 días
    await _fetchAggregateState({ days: 30 });
    // Tab Señales: precargar lista de sesiones
    _loadSessionList();
    _pollTimer = setInterval(_tickLiveTime, 30_000);
  }
}

// startPolling() es llamado por auth.js tras autenticación exitosa
