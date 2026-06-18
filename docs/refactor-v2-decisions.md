# Refactor v2 — Decisiones y puntos abiertos

> Estado: análisis completo, implementación pendiente.
> Referencia: `docs/qontexto-design-system-v2.md`
> Backend: todos los cambios (#1–#5) ya desplegados.

---

## Cambio central

v1.5 → color = urgencia. v2 → color = identidad de tema.
El mismo coral siempre = "Fraude electoral". La urgencia pasa a chip de texto neutro.

---

## Decisiones acordadas por tab

### Tab Temas (ex Resumen)

- **Veredicto card**: se mantiene encima del bubble chart. Es el texto de `summary.veredicto`.
- **Bubble chart — layout**: radial fijo determinista. 4 posiciones predefinidas (cuadrícula centrada). Sin force simulation. Radio de burbuja = `importance_score` normalizado.
  - 1 burbuja: centro
  - 2 burbujas: izquierda-centro, derecha-centro
  - 3 burbujas: triángulo
  - 4 burbujas: cuadrantes
- **Hebras a regiones**: `floor(historias_en_region / 5)` hebras. Mínimo 0 si < 5 historias. Máximo 4 hebras por región.
- **Nodos de región**: posiciones fijas en la parte inferior del SVG. Máximo 4 nodos visibles. Si hay más de 4 regiones, se muestran las 4 con más historias activas.
- **Panel de rationale — estado inicial**: panel VISIBLE pero con texto de instrucción `"Selecciona un tema para ver su análisis"`. No oculto.
- **Panel de rationale — seleccionado**: barra 3px color tema, nombre en color tema, chip "N historias" con borde color tema, chip urgencia neutro, texto `rationale`, texto `trend_label`.
- **Trend chart — rango**: toda la historia del contrato desde `start_date` hasta hoy. Solo días con actividad real. Sin ventana fija de 7 días.
- **Trend chart — texto por tema**: `trend_label` va DENTRO del panel de rationale (no debajo del gráfico). Al seleccionar una burbuja, la línea de ese tema se resalta y las demás se atenúan.
- **Topbar**: se mantiene (`stat-vent`, `stat-streams`, `stat-alertas` renombrado a "Menciones", etc.)
- **Cards eliminados**: Narrativas (barras), Voces (word cloud), Momento (sparkline) — desaparecen en v2.

### Tab Historias (ex Contexto)

- **Label card**: "Arcos narrativos" → "Historias activas"
- **Filtro Cluster**: label "Cluster" → "Tema", `id="cluster-select"` → `id="tema-select"`, `"Todos los clusters"` → `"Todos los temas"`
- **Dropdown con dots**: se necesita **dropdown custom** (native `<select>` no soporta HTML en options). Dot SVG inline por opción con color `--q-cluster-N`.
- **Colores de identidad en filas**: dot + borde izquierdo 3px + sparkline usan `--q-cluster-N` del tema. Sin urgency colors.
- **Chip de estado "Escalando"**: neutro (`var(--surface2)` / `var(--text2)`). Énfasis solo con `font-weight: 500`. El rojo desaparece de aquí.
- **Arcos sin `cluster_name`**: usan `--q-cluster-none` (#5F5E5A). Barra de 3px siempre presente (en gris).
- **Sincronización color map**: si Tab Historias carga antes que el summary, los arcos renderizan en gris. Al llegar el summary se recalcula el color map y se re-renderiza la lista.

### Tab Menciones (ex Señales)

- **Leyenda de temas**: en el header del card de timeline. Solo se muestra si alguna alerta tiene `cluster_name`. Si ninguna lo tiene, se oculta la leyenda.
- **Dot de evento**: color del `cluster_name` del alerta via `_clusterHex()`. Si no hay `cluster_name`, usa `var(--text3)` (neutro).
- **Cita textual**: color del tema si hay `cluster_name`. Si no, usa `var(--text2)` — el rojo `#991B1B` desaparece completamente del timeline.
- **Chip de urgencia**: nuevo elemento en sub-línea, siempre neutro (surface2/text2).
- **Cards de radio**: en lugar de 1 dot de urgencia, mostrar los temas activos con sus dots de color y conteo de menciones.
- **Fallback alertas sin cluster_name**: se ignoran en la leyenda, sus dots son `var(--text3)`.

### Tab Contrato

- **Lista de radios**: lista vertical (no grid de cards). Escala a cualquier número de radios.
- **Chip siempre visible**: siempre uno de los dos — "Ventana propia" o "Hereda del contrato". Nunca sin chip.
- **Chip "Ventana propia"**: `stream.stream_windows.length > 0`. Estilo: `background: rgba(186,117,23,0.12); color: #854F0B; border: 0.5px solid rgba(186,117,23,0.4)`.
- **Chip "Hereda del contrato"**: `stream.stream_windows.length === 0`. Estilo: `background: var(--surface2); color: var(--text3)`.
- **Ventana mostrada si hereda**: se muestra la primera entrada de `contract.windows[]`. Si hay varias ventanas globales, se listan todas.
- **Contract ID `<code>`**: `font-family: var(--mono)`, `background: var(--surface2)`, `border: .5px solid var(--border)`, `border-radius: 6px`, `padding: 2px 8px`.

---

## CSS tokens a añadir

### `css/tokens.css`

```css
/* Añadir import de JetBrains Mono */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

/* Identidad cromática de temas — light mode */
--q-cluster-1:    #993C1D;  /* coral */
--q-cluster-2:    #534AB7;  /* purple */
--q-cluster-3:    #0F6E56;  /* teal */
--q-cluster-4:    #854F0B;  /* amber */
--q-cluster-none: #5F5E5A;  /* gris neutro */

/* Urgencia (mantienen valores anteriores, solo se nombran) */
--q-urgency-critical: #991B1B;
--q-urgency-high:     #EF4444;
--q-urgency-medium:   #F59E0B;
--q-urgency-low:      #4CAF50;

/* Dark mode — variantes más claras para temas */
[data-theme="dark"] {
  --q-cluster-1:    #C4583A;
  --q-cluster-2:    #7B72D4;
  --q-cluster-3:    #1A9A78;
  --q-cluster-4:    #B87A1A;
  --q-cluster-none: #8A8880;
}
```

---

## Infraestructura JS nueva

```javascript
// Mapa cluster_name → CSS var (para usar en HTML/CSS)
let _clusterColorMap = {};   // topic → 'var(--q-cluster-N)'

// Mapa cluster_name → hex (para SVG, que no acepta CSS vars en atributos)
let _clusterHexMap = {};     // topic → '#RRGGBB'

// Hex de identidad (light/dark aware según isDark)
const _CLUSTER_HEXES_LIGHT = ['#993C1D', '#534AB7', '#0F6E56', '#854F0B'];
const _CLUSTER_HEXES_DARK  = ['#C4583A', '#7B72D4', '#1A9A78', '#B87A1A'];
const _CLUSTER_HEX_NONE_LIGHT = '#5F5E5A';
const _CLUSTER_HEX_NONE_DARK  = '#8A8880';

// Construir el mapa al llegar summary.narrativas
// Se llama desde _updateResumenFromSummary (antes de renderizar el bubble chart)
function _buildClusterColorMap(narrativas) { ... }

// Retorna el hex del tema (para SVG)
function _clusterHex(topicName) { ... }

// Variable de tema seleccionado en bubble chart
let _selectedTema = null;
function _selectTema(topicName) { ... }

// Chart de tendencia de temas (reemplaza sparkRef del Momento card)
let trendRef;
function _initTrendChart() { ... }
```

---

## Lista de tareas de implementación (orden)

1. `css/tokens.css` — añadir tokens y dark mode vars
2. `index.html` — renombrar tabs (labels + IDs + onclicks)
3. `index.html` — Tab Temas: nuevo contenido (bubble SVG container + rationale panel + trend canvas)
4. `index.html` — Tab Historias: labels + dropdown custom + ID tema-select
5. `index.html` — Tab Menciones: header timeline + div leyenda
6. `js/app.js` — switchTab IDs + initCharts → temas-trend
7. `js/api.js` — infraestructura color map + _buildClusterColorMap
8. `js/api.js` — _renderTemasBubble + _selectTema + rationale panel
9. `js/api.js` — _initTrendChart + _updateTemasTrend
10. `js/api.js` — _renderNarrativeArcs: colores de identidad + chips neutros
11. `js/api.js` — dropdown custom de temas
12. `js/api.js` — _renderTimeline: cluster colors + chip urgencia + leyenda
13. `js/api.js` — _renderStreams: tema dots por radio
14. `js/api.js` — _renderContratoTab: lista de radios + chips + code style
15. `js/api.js` — vocabulario global ("arcos"→"historias", "señales"→"menciones", "cluster"→"tema")

---

*Archivo temporal de trabajo — eliminar tras merge del refactor.*
