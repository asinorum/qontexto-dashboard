// API client — conecta con https://api.qontexto.com

const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:8000'
  : 'https://api.qontexto.com';

const API_KEY = '';  // configurar antes del deploy

let _sessionId  = null;
let _pollTimer  = null;

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
  const r = await fetch(`${API_BASE}${path}`, { headers: hdrs });
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

// ── Session detection ─────────────────────────────────────────────────────────

async function _detectSession() {
  const sessions = await _apiFetch('/sessions');
  const list     = Array.isArray(sessions) ? sessions : [sessions];
  const active   = list.find(s => s.status === 'active') ?? null;
  return active?.session_id ?? null;
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

function _updateNarrativasCard(state) {
  const items = _buildNarrativeItems(state.snapshots);
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

function _buildVocesItems(snapshot) {
  if (!snapshot?.per_stream) return null;

  const freq    = {};
  const urgency = {};

  for (const stream of Object.values(snapshot.per_stream)) {
    const su = _TONE_URGENCY[stream.tone] ?? 'low';
    for (const kw of (stream.top_keywords ?? [])) {
      freq[kw]    = (freq[kw] ?? 0) + 1;
      urgency[kw] = _maxUrgency(urgency[kw], su);
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
  const items = _buildVocesItems(state.latest_snapshot);
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

  _updateNarrativasCard(state);
  _updateVocesCard(state);
}

// ── Poll ──────────────────────────────────────────────────────────────────────

async function _poll() {
  try {
    const state = await _apiFetch(`/session/${_sessionId}/state`);
    _updateUI(state);
  } catch (err) {
    console.warn('[Qontexto] poll fallido:', err.message);
  }
}

function _tickLiveTime() {
  const el = document.getElementById('live-label');
  if (!el) return;
  const m = el.textContent.match(/^(\d+)/);
  const n = m ? +m[1] : 0;
  el.textContent = `${n} stream${n !== 1 ? 's' : ''} · ${limaTime()} PE`;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function startPolling() {
  try {
    _sessionId = await _detectSession();
  } catch (err) {
    console.info('[Qontexto] sin sesión activa:', err.message);
  }

  if (_sessionId) {
    await _poll();
    _pollTimer = setInterval(_poll, 30_000);
  } else {
    // No session — still keep the live timestamp ticking
    _tickLiveTime();
    _pollTimer = setInterval(_tickLiveTime, 30_000);
  }
}

startPolling();
