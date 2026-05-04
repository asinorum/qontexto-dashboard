let isDark = false;
let pieRef, sparkRef;
let _pieVerdicts = ['Alerta máxima', 'Señal temprana', 'Emergiendo', 'Estable'];

function surfaceColor() { return isDark ? '#1C1C1A' : '#FAFAF7'; }
function tickColor()    { return isDark ? 'rgba(154,152,144,0.45)' : 'rgba(90,88,80,0.4)'; }

function initCharts() {
  if (pieRef)   pieRef.destroy();
  if (sparkRef) sparkRef.destroy();

  pieRef = new Chart(document.getElementById('pieChart'), {
    type: 'pie',
    data: {
      labels: ['Paro regional Áncash', 'Conflicto Antamina', 'Tensión social San Marcos', 'Reforestación minera'],
      datasets: [{
        data: [40, 30, 20, 10],
        backgroundColor: ['#991B1B', '#EF4444', '#F59E0B', '#4CAF50'],
        borderWidth: 3,
        borderColor: surfaceColor(),
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => ` ${c.label}: ${_pieVerdicts[c.dataIndex] ?? ''}`
          }
        }
      }
    }
  });

  sparkRef = new Chart(document.getElementById('sparkline'), {
    type: 'line',
    data: {
      labels: ['13:32', '13:45', '14:00', '14:08', '14:15', '14:21', '14:28', '14:32'],
      datasets: [
        { label: 'Paro regional Áncash',   data: [0,0,0,0,1,2,5,8], borderColor: '#991B1B', backgroundColor: 'rgba(153,27,27,0.07)', fill: true,  tension: 0.4, borderWidth: 2.5, pointRadius: [0,0,0,0,5,4,7,7], pointBackgroundColor: '#991B1B', pointBorderWidth: 0 },
        { label: 'Conflicto Antamina',      data: [0,1,1,2,2,3,4,5], borderColor: '#EF4444', backgroundColor: 'transparent',           fill: false, tension: 0.4, borderWidth: 2,   pointRadius: [0,0,0,3,0,3,5,5], pointBackgroundColor: '#EF4444', pointBorderWidth: 0 },
        { label: 'Tensión San Marcos',      data: [1,1,2,2,3,3,3,3], borderColor: 'rgba(245,158,11,0.35)',                              fill: false, tension: 0.4, borderWidth: 1,   pointRadius: 0 },
        { label: 'Reforestación minera',    data: [2,3,3,3,3,2,2,2], borderColor: 'rgba(76,175,80,0.35)',                               fill: false, tension: 0.4, borderWidth: 1,   pointRadius: 0 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}` } }
      },
      scales: {
        y: { display: false, min: -0.5, max: 10 },
        x: { grid: { display: false }, border: { display: false }, ticks: { color: tickColor(), font: { size: 10 }, maxRotation: 0 } }
      }
    }
  });
}

function toggleTheme() {
  isDark = !isDark;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  document.getElementById('ico-sun').style.display  = isDark ? 'none'  : 'block';
  document.getElementById('ico-moon').style.display = isDark ? 'block' : 'none';
  if (pieRef)   { pieRef.data.datasets[0].borderColor = surfaceColor(); pieRef.update(); }
  if (sparkRef) { sparkRef.options.scales.x.ticks.color = tickColor(); sparkRef.update(); }
}

function switchTab(tab, el) {
  document.querySelectorAll('.qtab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('tab-resumen').style.display = tab === 'resumen' ? 'block' : 'none';
  document.getElementById('tab-senales').style.display = tab === 'senales' ? 'block' : 'none';
}

function setWindow(el, label) {
  document.querySelectorAll('.qwt').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('stat-vent').textContent = label;
}

initCharts();
