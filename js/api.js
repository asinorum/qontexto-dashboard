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
  const scores    = {};

  for (const snap of snapshots) {
    const n = snap.dominant_narrative;
    if (!n) continue;
    counts[n]    = (counts[n] ?? 0) + 1;
    urgencies[n] = _maxUrgency(urgencies[n], snap.institutional_relevance);
    scores[n]    = Math.max(scores[n] ?? 0, snap.correlation_score ?? 0);
  }

  const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  if (!sorted.length) return null;

  const items = sorted.slice(0, 4).map(n => ({
    label:   n,
    weight:  counts[n],
    urgency: (function(u, s) {
      const fromScore = s >= 0.65 ? 'critical'
                      : s >= 0.50 ? 'high'
                      : s >= 0.35 ? 'medium' : 'low';
      return _maxUrgency(u ?? 'low', fromScore);
    })(urgencies[n], scores[n] ?? 0),
  }));

  const otrosWeight = sorted.slice(4).reduce((s, n) => s + counts[n], 0);
  if (otrosWeight > 0) items.push({ label: 'Otros', weight: otrosWeight, urgency: 'neutral' });

  return items;
}

function _buildNarrativeItemsFromArcs(arcs) {
  if (!arcs?.length) return null;

  const active = arcs
    .filter(a => a.status !== 'dormant')
    .sort((a, b) => (b.last_score ?? 0) - (a.last_score ?? 0));

  if (!active.length) return null;

  const top4 = active.slice(0, 4).map(a => {
    const score   = _arcScore(a);
    const urgency = a.status === 'escalating' || score >= 0.65 ? 'critical'
                  : score >= 0.50                               ? 'high'
                  : score >= 0.35                               ? 'medium'
                  :                                               'low';
    return { label: a.topic, weight: score, urgency, trend: a.trend ?? 'continuing' };
  });

  const otrosCount = active.length - top4.length;
  if (otrosCount > 0) {
    top4.push({ label: otrosCount + ' arcos adicionales', weight: 0, urgency: 'neutral', trend: null });
  }

  return top4;
}

function _updateNarrativasCard(state, items) {
  if (!items) return;
  const barsEl = document.getElementById('narrativas-bars');
  if (!barsEl) return;
  const colored   = items.filter(i => i.urgency !== 'neutral');
  const maxWeight = Math.max(...colored.map(i => i.weight), 0.01);
  const hasOtros  = items[items.length - 1]?.urgency === 'neutral';
  barsEl.className = 'qbars';
  barsEl.innerHTML = items.map((item, idx) => {
    const u         = URGENCY[item.urgency];
    const isNeutral = item.urgency === 'neutral';
    const barColor  = u?.color     ?? 'var(--text3)';
    const chipBg    = u?.bg        ?? 'var(--surface2)';
    const chipColor = u?.textColor ?? 'var(--text3)';
    const chipLabel = u?.label     ?? 'Estable';
    const pct       = isNeutral ? 38 : Math.round((item.weight / maxWeight) * 100);
    const nameClass = isNeutral ? 'qbar-name muted' : 'qbar-name';
    const sepBefore = hasOtros && idx === items.length - 1 ? '<div class="qbar-sep"></div>' : '';
    return sepBefore +
      '<div class="qbar-row">' +
        '<div class="qbar-top">' +
          '<span class="' + nameClass + '">' + _esc(item.label) + '</span>' +
          '<div class="qbar-chips">' +
            '<span class="qbar-chip" style="background:' + chipBg + ';color:' + chipColor + '">' + chipLabel + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="qbar-track">' +
          '<div class="qbar-fill" style="width:' + pct + '%;background:' + barColor + '"></div>' +
        '</div>' +
      '</div>';
  }).join('');
  const top  = items[0];
  const topU = URGENCY[top?.urgency];
  _setText('card-narrativas-title',
    top ? (topU?.label ?? '') + ': ' + top.label.toLowerCase() + '.' : '—');
  const n = state.streams_monitored?.length ?? 0;
  _setText('card-narrativas-footer',
    n + ' emisora' + (n !== 1 ? 's' : '') + ' · ' + limaTime() + ' PE');
}

function _buildVeredicto(state, items) {
  const el   = document.getElementById('veredicto-text');
  const card = document.getElementById('veredicto-card');
  if (!el) return;
  if (!items?.length) {
    el.innerHTML = 'Sin sesión activa.';
    return;
  }
  const top         = items[0];
  const u           = URGENCY[top.urgency];
  const verdictTxt  = (u?.label ?? 'Narrativa activa').toLowerCase();
  const borderColor = u?.color ?? '#4CAF50';
  const colored     = items.filter(i => i.urgency !== 'neutral');
  const otrosItem   = items.find(i => i.urgency === 'neutral');
  const extraCount  = otrosItem ? parseInt(otrosItem.label.match(/\d+/)?.[0] ?? '0', 10) : 0;
  const arcCount    = colored.length + extraCount;
  el.innerHTML =
    '<span style="color:' + borderColor + ';font-weight:500">' +
    _esc(top.label) + '</span> lidera con ' + verdictTxt +
    '. ' + arcCount + ' arcos activos en esta ventana.';
  if (card) {
    card.style.borderLeftColor = borderColor;
    card.style.borderLeftWidth = '3px';
  }
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
  const streamCount = _sessionIsLive
    ? (state.streams_monitored?.length ?? 0)
    : (_contractStreamCount ?? state.streams_monitored?.length ?? 0);

  _setText('stat-streams', streamCount);
  // stat-alertas lo gestiona _updateResumenFromSummary (tb.alertas = arcos activos).
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

function _updateResumenFromArcs(arcs) {
  if (!arcs?.length) return;

  const pool = [...arcs]
    .filter(a => a.status !== 'dormant')
    .sort((a, b) => {
      if (a.status === 'escalating' && b.status !== 'escalating') return -1;
      if (b.status === 'escalating' && a.status !== 'escalating') return  1;
      return (b.last_score ?? 0) - (a.last_score ?? 0);
    });
  const top4 = (pool.length ? pool : arcs.slice().sort((a, b) => (b.last_score ?? 0) - (a.last_score ?? 0))).slice(0, 4);

  // ── Barras (Card Narrativas) ─────────────────────────────────────────────
  const pieItems = top4.map(a => ({
    label:   a.topic,
    weight:  Math.max(1, Math.round((_arcScore(a)) * 100)),
    urgency: _scoreToUrgency(_arcScore(a)),
  }));
  _buildVeredicto({}, pieItems);
  _updateNarrativasCard({}, pieItems);
  _setText('card-narrativas-footer', `${top4.length} arco${top4.length !== 1 ? 's' : ''} activos · ${limaTime()} PE`);

  // ── Word cloud (Card Voces) ──────────────────────────────────────────────
  const kwFreq = {};
  const kwUrgency = {};
  for (const arc of (pool.length ? pool : arcs)) {
    const u = _scoreToUrgency(arc.last_score ?? 0);
    for (const kw of (arc.keywords ?? [])) {
      kwFreq[kw]    = (kwFreq[kw] ?? 0) + 1;
      kwUrgency[kw] = _maxUrgency(kwUrgency[kw], u);
    }
  }
  const kwSorted = Object.keys(kwFreq).sort((a, b) => kwFreq[b] - kwFreq[a]);
  if (kwSorted.length) {
    const wcItems = kwSorted.slice(0, _WC_SLOTS.length).map(kw => ({
      label: kw, count: kwFreq[kw], urgency: kwUrgency[kw] ?? 'low',
    }));
    const wcEl = document.getElementById('word-cloud');
    if (wcEl) {
      wcEl.innerHTML = wcItems.map((item, i) => {
        const slot = _WC_SLOTS[i];
        const color = URGENCY[item.urgency]?.color ?? 'var(--text3)';
        return `<span style="font-size:${_WC_SIZES[i] ?? 9}px;font-weight:${_WC_WEIGHTS[i] ?? 400};` +
          `color:${color};top:${slot.top}px;left:${slot.left}px">${_esc(item.label)}</span>`;
      }).join('');
    }
    if (wcItems.length >= 2) _setText('card-voces-title', `${wcItems[0].label} y ${wcItems[1].label} dominan el centro`);
    else if (wcItems.length === 1) _setText('card-voces-title', `${wcItems[0].label} domina el centro`);
  }
  _setText('card-voces-footer', `${(pool.length ? pool : arcs).length} arco${(pool.length ? pool : arcs).length !== 1 ? 's' : ''} · ${limaTime()} PE`);

  // ── Sparkline (Card Momento) — últimos 15 días ───────────────────────────
  const today = new Date();
  const days  = Array.from({ length: 15 }, (_, i) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - (14 - i));
    return d.toISOString().slice(0, 10);
  });
  const months = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const sparkLabels = days.map(d => {
    const [, m, dd] = d.split('-');
    return `${parseInt(dd)} ${months[parseInt(m)]}`;
  });

  const sparkDatasets = top4.map((arc, idx) => {
    const urgency = _scoreToUrgency(arc.last_score ?? 0);
    const color   = URGENCY[urgency]?.color ?? '#9E9E9E';
    const isTop   = idx < 2;
    const byDay   = {};
    for (const e of (arc.intensity_history ?? [])) {
      const day = (e.window_end ?? '').slice(0, 10);
      if (day && (byDay[day] == null || e.score > byDay[day])) byDay[day] = e.score;
    }
    const data = days.map(d => byDay[d] != null ? Math.round(byDay[d] * 100) / 10 : null);
    return {
      label:               arc.topic,
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

  if (typeof sparkRef !== 'undefined' && sparkRef) {
    sparkRef.data.labels   = sparkLabels;
    sparkRef.data.datasets = sparkDatasets;
    sparkRef.update();
  }

  const arcTrend = top4[0]?.trend;
  const trend    = arcTrend === 'escalating' ? 'escalando'
                 : arcTrend === 'declining'  ? 'cediendo'
                 : 'estable';
  const tConf    = _TREND_CONFIG[trend];
  const pillEl   = document.getElementById('card-momento-pill');
  if (pillEl && tConf) {
    pillEl.style.background = tConf.bg;
    pillEl.style.color      = tConf.color;
    pillEl.innerHTML =
      `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="${tConf.color}" ` +
      `stroke-width="2.5" stroke-linecap="round">${tConf.arrow}</svg> ${tConf.label}`;
  }
  _setText('card-momento-title', top4[0]?.topic ?? '');
  _setText('card-momento-footer', `Últimos 15 días · ${limaTime()} PE`);
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
    if (el) el.innerHTML = '<div class="qarcs-error"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Error al cargar arcos. Intenta nuevamente.</div>';
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
    ? 'Sin arcos con estos filtros'
    : 'No hay arcos narrativos registrados aún';

  const suggestion = hasActiveFilters
    ? 'Intenta ampliar los criterios de búsqueda o <button onclick="resetAllFilters()" style="background:none;border:none;color:var(--text2);text-decoration:underline;cursor:pointer;font-family:var(--font)">limpiar filtros</button>.'
    : 'Los arcos aparecerán conforme el sistema detecte patrones narrativos.';

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
    indicator.textContent = `Mostrando ${startIdx}-${endIdx} de ${_totalArcs} arcos`;
  } else {
    indicator.textContent = 'Sin arcos para mostrar';
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

function updateClusterFilter() {
  _advancedFilters.cluster = document.getElementById('cluster-select').value;
  _currentPage = 1;
  _loadNarrativeArcs(_currentPage);
  _updateActiveFilters();
}

function updateUrgencyFilter() {
  _advancedFilters.urgency = document.getElementById('urgency-select').value;
  _currentPage = 1;
  _loadNarrativeArcs(_currentPage);
  _updateActiveFilters();
}

function resetAllFilters() {
  // Reset estado
  _arcStatusFilter = null;
  _advancedFilters = { dateFrom: '', dateTo: '', cluster: '', urgency: '' };

  // Reset UI
  document.getElementById('date-from').value = '';
  document.getElementById('date-to').value = '';
  document.getElementById('cluster-select').value = '';
  document.getElementById('urgency-select').value = '';

  document.querySelectorAll('#status-chips .qchip').forEach(c => c.classList.remove('active'));
  document.querySelector('#status-chips .qchip[data-status=""]').classList.add('active');

  // Recargar
  _currentPage = 1;
  _loadNarrativeArcs(_currentPage);
  _updateActiveFilters();
}

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
    activeChips.push(`<span class="qactive-chip">Cluster: ${_advancedFilters.cluster}</span>`);
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
    const score   = _arcScore(arc);
    const isEsc   = arc.trend === 'escalating' || score >= 0.65;
    const cfg     = isEsc ? _ARC_STATUS.escalating : (_ARC_STATUS[arc.status] ?? _ARC_STATUS.active);
    const trend   = _ARC_TREND[arc.trend] ?? arc.trend;
    const cluster = _formatClusterData(arc);
    const kws     = (arc.keywords ?? []).slice(0, 5).map(k => `<span style="font-size:10px;background:var(--surface2);border-radius:4px;padding:1px 6px;color:var(--text2)">${_esc(k)}</span>`).join('');
    const spark   = _drawSparkline(arc.intensity_history ?? []);
    const last    = arc.last_seen ? new Date(arc.last_seen).toLocaleDateString('es-PE', { day: 'numeric', month: 'numeric', timeZone: 'America/Lima' }) : '—';
    const first   = arc.first_seen ? new Date(arc.first_seen).toLocaleDateString('es-PE', { day: 'numeric', month: 'numeric', timeZone: 'America/Lima' }) : '—';
    const pts     = (arc.intensity_history ?? []).length;

    // Línea de cluster semántico (si hay datos)
    const clusterLine = cluster.hasData
      ? `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
           ${cluster.nameSpan}${cluster.urgencyChip}
         </div>`
      : '';

    return `<div onclick="_toggleArcDetail('${_esc(arc.arc_id)}')" style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:.5px solid var(--border);cursor:pointer" data-arc-id="${_esc(arc.arc_id)}">
      <div style="width:8px;height:8px;border-radius:50%;background:${cfg.dot};flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
          <span style="font-size:13px;font-weight:500;color:var(--text1)">${_esc(arc.topic || '—')}</span>
          <span style="font-size:10px;background:${cfg.bg};color:${cfg.color};border-radius:5px;padding:1px 7px;font-weight:500">${cfg.label}</span>
          <span style="font-size:11px;color:var(--text3)">${trend}</span>
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
    _contractId          = contract.contract_id ?? null;
    _contractStreamCount = contract.streams?.length ?? null;
    _renderContratoTab(contract);
  } catch {
    const el = document.getElementById('contrato-stats');
    if (el) el.innerHTML = '<p style="font-size:13px;color:var(--text3)">Sin contrato activo.</p>';
  }
}

// ── D12: Summary ─────────────────────────────────────────────────────────────

const _TREND_TO_COLOR = {
  escalating:   '#991B1B',
  reactivation: '#EF4444',
  new:          '#EF4444',
  continuing:   '#F59E0B',
  dormant:      '#9C9A90',
};

const _SEV_TO_URGENCY = { critical: 'critical', high: 'high', medium: 'medium', stable: 'low' };

async function _loadSummary() {
  try {
    const summary = await _apiFetch('/my/summary');
    _summary = summary;
    _updateResumenFromSummary(summary);
  } catch (err) {
    console.warn('[Qontexto] summary fallido:', err.message);
  }
}

function _updateResumenFromSummary(summary) {
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
    const top = summary.narrativas[0];
    const clr = URGENCY[_scoreToUrgency(top?.score_normalized ?? 0)]?.color ?? '#4CAF50';
    verdCard.style.borderLeftColor = clr;
    verdCard.style.borderLeftWidth = '3px';
  }

  // F3 — Narrativas
  _updateNarrativasFromSummary(summary.narrativas ?? [], summary.narrativas_adicionales ?? 0);

  // F4 — Voces
  _updateVocesFromSummary(summary.voces ?? []);

  // F5 — Momento
  _updateMomentoFromSummary(summary.momento);
}

const _TREND_CHIP = {
  escalating:   { label: '↑ Escalando',  bg: '#FEF2F2', color: '#991B1B' },
  new:          { label: '★ Nuevo',       bg: '#FFFBEB', color: '#B45309' },
  reactivation: { label: '↺ Reactivado', bg: '#FFF7ED', color: '#C2410C' },
};

function _updateNarrativasFromSummary(narrativas, adicionales) {
  const barsEl = document.getElementById('narrativas-bars');
  if (!barsEl) return;

  if (!narrativas.length) {
    barsEl.innerHTML = '<div style="font-size:13px;color:var(--text3);padding:8px 0">Sin narrativas activas.</div>';
    _setText('card-narrativas-title', '—');
    return;
  }

  const rows = narrativas.map(n => {
    const urgKey   = _scoreToUrgency(n.score_normalized ?? 0);
    const u        = URGENCY[urgKey];
    const pct      = Math.round((n.score_normalized ?? 0) * 100);
    const label    = n.arc_count > 1 ? `${n.topic} · ${n.arc_count} arcos` : n.topic;
    const chip     = _TREND_CHIP[n.trend];
    const chipHtml = chip
      ? `<span class="qbar-chip" style="background:${chip.bg};color:${chip.color}">${chip.label}</span>`
      : '';
    const rationaleHtml = n.rationale
      ? `<div class="qbar-rationale">${_esc(n.rationale)}</div>`
      : '';
    return `<div class="qbar-row">` +
      `<div class="qbar-top">` +
      `<span class="qbar-name">${_esc(label)}</span>` +
      `<div class="qbar-chips">${chipHtml}</div>` +
      `</div>` +
      `<div class="qbar-track"><div class="qbar-fill" style="width:${pct}%;background:${u?.color ?? 'var(--text3)'}"></div></div>` +
      rationaleHtml +
      `</div>`;
  });

  if (adicionales > 0) {
    rows.push(
      `<div class="qbar-sep"></div>` +
      `<div class="qbar-row">` +
      `<div class="qbar-top">` +
      `<span class="qbar-name muted">${adicionales} arco${adicionales !== 1 ? 's' : ''} adicionales</span>` +
      `<div class="qbar-chips"></div>` +
      `</div>` +
      `<div class="qbar-track"><div class="qbar-fill" style="width:38%;background:var(--text3)"></div></div>` +
      `</div>`
    );
  }

  barsEl.className = 'qbars';
  barsEl.innerHTML = rows.join('');

  const top  = narrativas[0];
  const topU = URGENCY[_scoreToUrgency(top?.score_normalized ?? 0)];
  _setText('card-narrativas-title', top ? `${topU?.label ?? ''}: ${top.topic.toLowerCase()}.` : '—');
  _setText('card-narrativas-footer', `${narrativas.length} cluster${narrativas.length !== 1 ? 's' : ''} · ${limaTime()} PE`);
}

function _updateVocesFromSummary(voces) {
  const wcEl = document.getElementById('word-cloud');
  if (!wcEl || !voces.length) return;

  const top      = voces.slice(0, _WC_SLOTS.length);
  const counts   = top.map(w => w.count);
  const maxCount = Math.max(...counts, 1);
  const minCount = Math.min(...counts);
  const range    = maxCount - minCount || 1;

  const _sev2color = { critical: '#991B1B', high: '#EF4444', medium: '#F59E0B', stable: 'var(--text3)', low: 'var(--text3)' };

  wcEl.innerHTML = top.map((w, i) => {
    const slot   = _WC_SLOTS[i];
    const ratio  = (w.count - minCount) / range;
    const size   = Math.round(9 + ratio * 19);
    const weight = size >= 20 ? 600 : size >= 14 ? 500 : 400;
    const color  = _sev2color[w.max_severity] ?? 'var(--text3)';
    return `<span style="font-size:${size}px;font-weight:${weight};color:${color};` +
      `top:${slot.top}px;left:${slot.left}px">${_esc(w.word)}</span>`;
  }).join('');

  if (top.length >= 2) _setText('card-voces-title', `${top[0].word} y ${top[1].word} concentran el léxico`);
  else if (top.length === 1) _setText('card-voces-title', `${top[0].word} domina el espacio narrativo`);
  _setText('card-voces-footer', `${voces.length} término${voces.length !== 1 ? 's' : ''} · ${limaTime()} PE`);
}

function _updateMomentoFromSummary(momento) {
  if (!momento?.clusters?.length || typeof sparkRef === 'undefined' || !sparkRef) return;

  const clusters = momento.clusters;
  const series0  = clusters[0]?.series ?? [];
  const labels   = series0.map(e => {
    const [, m, d] = (e.date ?? '').split('-');
    return `${parseInt(d)}/${parseInt(m)}`;
  });

  const allScores = [];
  const datasets  = clusters.slice(0, 4).map((cl, idx) => {
    const color = _TREND_TO_COLOR[cl.trend] ?? '#9C9A90';
    const isTop = idx < 2;
    const data  = cl.series.map(e => (e.score != null && e.score > 0) ? e.score : null);
    data.forEach(v => { if (v != null) allScores.push(v); });
    return {
      label:                cl.label,
      data,
      spanGaps:             true,
      borderColor:          isTop ? color : _hexToRgba(color, 0.35),
      backgroundColor:      idx === 0 ? _hexToRgba(color, 0.07) : 'transparent',
      fill:                 idx === 0,
      tension:              0.4,
      borderWidth:          isTop ? 2.5 : 1,
      pointRadius:          data.map(v => v != null ? (isTop ? 5 : 3) : 0),
      pointBackgroundColor: color,
      pointBorderWidth:     0,
    };
  });

  sparkRef.data.labels   = labels;
  sparkRef.data.datasets = datasets;
  const yMax = allScores.length ? Math.max(...allScores) * 1.25 : 1;
  sparkRef.options.scales.y.max = yMax > 0 ? yMax : 1;
  sparkRef.update();

  const topTrend = clusters[0]?.trend ?? 'continuing';
  const pillTrend = (topTrend === 'escalating' || topTrend === 'new' || topTrend === 'reactivation')
    ? 'escalando' : topTrend === 'dormant' ? 'cediendo' : 'estable';
  const tConf = _TREND_CONFIG[pillTrend];
  const pillEl = document.getElementById('card-momento-pill');
  if (pillEl && tConf) {
    pillEl.style.background = tConf.bg;
    pillEl.style.color      = tConf.color;
    pillEl.innerHTML =
      `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="${tConf.color}" ` +
      `stroke-width="2.5" stroke-linecap="round">${tConf.arrow}</svg> ${tConf.label}`;
  }

  _setText('card-momento-title', clusters[0]?.label ?? '');
  _setText('card-momento-footer', `${momento.days ?? 7} días de historial · ${limaTime()} PE`);
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
    _loadNarrativeArcs();
    await _poll();
    _pollTimer = setInterval(() => { _poll(); _loadSummary(); }, 30_000);
  } else {
    // Sin sesión en vivo: Tab Señales muestra acumulado 30 días
    await _fetchAggregateState({ days: 30 });
    _loadNarrativeArcs();
    _loadSessionList();
    _pollTimer = setInterval(() => { _tickLiveTime(); _loadSummary(); }, 30_000);
  }
}

// startPolling() es llamado por auth.js tras autenticación exitosa
