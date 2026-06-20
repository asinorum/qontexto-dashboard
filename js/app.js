mdui.setColorScheme('#3949AB');

let isDark = false;

// D6 — estado del navegador de sesiones
let _sessionList  = [];
let _sessionIndex = 0;

function surfaceColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
}

function toggleTheme() {
  isDark = !isDark;
  mdui.setTheme(isDark ? 'dark' : 'light');
  document.getElementById('ico-sun').style.display  = isDark ? 'none'  : 'block';
  document.getElementById('ico-moon').style.display = isDark ? 'block' : 'none';
  if (typeof _buildClusterColorMap === 'function') _buildClusterColorMap();
  if (typeof _updateTemasTrend === 'function' && typeof _summary !== 'undefined' && _summary?.narrativas?.length) {
    _updateTemasTrend(_summary.narrativas);
  }
}

function switchTab(tab, el) {
  document.querySelectorAll('.qtab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('tab-temas').style.display     = tab === 'temas'     ? 'block' : 'none';
  document.getElementById('tab-historias').style.display = tab === 'historias' ? 'block' : 'none';
  document.getElementById('tab-menciones').style.display = tab === 'menciones' ? 'block' : 'none';
  document.getElementById('tab-contrato').style.display  = tab === 'contrato'  ? 'block' : 'none';
  if (tab === 'temas') {
    if (typeof _loadSummary === 'function') _loadSummary();
  }
  if (tab === 'historias') {
    if (typeof _loadClusterNames === 'function') _loadClusterNames();
    if (typeof _loadNarrativeArcs === 'function') _loadNarrativeArcs();
  }
  if (tab === 'menciones' && !_sessionIsLive) {
    if (typeof _loadSessionList === 'function' && !_sessionList.length) _loadSessionList();
  }
}

function setWindow(el, label, params) {
  document.querySelectorAll('.qwt').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('stat-vent').textContent = label;
  if (!_sessionIsLive && typeof _fetchAggregateState === 'function') {
    _fetchAggregateState(params ?? { days: 30 });
  }
}


