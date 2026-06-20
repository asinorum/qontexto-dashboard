# Qontexto · Sistema de Diseño v2.0

> **Documento de referencia para el rediseño del dashboard.**
> Aplica a: `qontexto-dashboard` (frontend) y `narrative-intelligence` (backend).
> Estado anterior documentado en: `docs/qontexto-design-system-v1_5.md`

---

## 0. Principio rector y público objetivo

> **"El director no piensa en porcentajes — piensa en veredictos."**

El usuario primario (Analista de Inteligencia Mediática) no es el consumidor final del insight — es el courier del insight. Toma pantallazos. El directorio decide. Cada card debe funcionar como una diapositiva autónoma con conclusión incorporada.

### Público objetivo

**Primario — Analista de Inteligencia Mediática**
Opera el dashboard. Filtra, navega, toma pantallazos. Puede leer la densidad de datos del tab Menciones. Necesita que sus pantallazos sean autoexplicativos para alguien que no estuvo en la sesión.

**Secundario — Director de Comunicaciones**
No opera la herramienta. Lee color + etiqueta y toma una decisión. Su atención es de 5 segundos por card. No interpreta ejes ni tooltips.

### Consecuencias de diseño que no cambian en v2

| Regla | Razón |
|---|---|
| Veredictos en lugar de scores numéricos | El director decide, no interpreta |
| Máximo 4 temas con color, resto en gris | La paleta semántica no se diluye |
| Cada card con conclusión textual | El pantallazo funciona sin el dashboard |
| Color siempre tiene significado de negocio | Nunca decorativo |

---

## 1. Vocabulario del sistema

En v2 el vocabulario cambia en toda la interfaz. Los nombres anteriores quedan en desuso.

| Término anterior | Término v2 | Descripción |
|---|---|---|
| Clusters semánticos | **Temas** | Agrupaciones narrativas detectadas por Opus |
| Arcos narrativos | **Historias** | Hilos narrativos individuales dentro de un tema |
| Señales / Alertas | **Menciones** | Eventos puntuales detectados en una ventana |
| Tab Resumen | **Tab Temas** | Vista ejecutiva de temas activos |
| Tab Contexto | **Tab Historias** | Lista de historias con filtros |
| Tab Señales | **Tab Menciones** | Timeline de menciones por sesión |
| Tab Contrato | **Tab Contrato** | Sin cambio |

**Jerarquía:** Temas → Historias → Menciones

Un Tema agrupa varias Historias. Una Historia se compone de varias Menciones.

### Ubicaciones concretas de cambio en `js/api.js`

| Función | Texto actual | Texto v2 |
|---|---|---|
| `_renderSessionNav` | `${s.alerts_total} alertas` | `${s.alerts_total} menciones` |
| `_renderAnalisis` | `N alerta/s registrada/s` | `N mención/es registrada/s` |
| `_renderStreams` | `Alertas` (key label) | `Menciones` |
| `_updateActiveFilters` | `Cluster: ...` | `Tema: ...` |
| `_showArcsEmptyState` | `"Sin arcos..."` / `"No hay arcos..."` | `"Sin historias..."` / `"No hay historias..."` |
| `_updatePaginationControls` | `"de Z arcos"` / `"Sin arcos..."` | `"de Z historias"` / `"Sin historias..."` |
| `_renderNarrativeArcs` | `"Sin arcos para el filtro..."` | `"Sin historias para el filtro..."` |

### Cambio de label en `index.html`

| Elemento | Texto actual | Texto v2 |
|---|---|---|
| Card emisoras (Tab Contrato) | `"Emisoras del contrato"` | `"Radios monitoreadas"` |

---

## 2. Tipografía

Base: MDUI 2. Google Sans Flex sobreescribe el default de Roboto que MDUI aplica vía CSS reset.

```html
<!-- En index.html — después de mdui.css, antes de app.css -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@300..700&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap">
```

La variable `--font` del bridge de compatibilidad (§3.2) sobreescribe `--mdui-typescale-body-medium-font` globalmente.

| Variable | Familia | Uso |
|---|---|---|
| `--font` | Google Sans Flex | Todo el dashboard |
| `--mono` | JetBrains Mono | IDs, timestamps, valores numéricos, `<code>` |

### Escala tipográfica — mapeo a M3 type roles

| TYPE ROLE M3 | TAMAÑO | PESO | USO EN QONTEXTO |
|---|---|---|---|
| `title-large` | 18px | 400 | Encabezados de login / portada |
| `title-medium` | 16px | 600 | **Veredicto** — `.qcard-title` — elemento más importante del dashboard |
| `label-large` / `body-medium` | 14px | 400–500 | Títulos de arcos, tabs de navegación, topbar values, nombres de emisora |
| `body-small` | 13px | 400 | Rationale en barras, subtítulos de timeline, quotes |
| `label-medium` | 12px | 400 | Leyenda de temas, stream info, hora en timeline |
| `label-small` | 11px | 500 | **Mínimo MD3.** Metadata UPPERCASE, chips, fechas, ejes de sparkline |

> **Regla:** nunca usar tamaños por debajo de 11px. El `label-small` (11px) es el mínimo absoluto de MD3. Tamaños de 13px no existen en MD3 — se usan como paso intermedio solo en elementos de apoyo (no títulos).

**Tipografía numérica — fuera del type scale M3:**

| Clase | Tamaño | Uso |
|---|---|---|
| `.q-stat-val` | 15px / 500 | Valores de stat (ventanas, streams, etc.) |
| `.q-numeric` | 14px / 400 | Contadores, valores en tabla |

---

## 3. Sistema de color

### 3.1 Principio v2 — color = identidad de tema, no urgencia

Este es el cambio central de v2 respecto a v1.5.

**v1.5:** el color codificaba urgencia. Rojo = crítico, ámbar = emergiendo, verde = estable.
**v2:** el color codifica identidad. Coral = Fraude electoral, Teal = Movilización, etc.

La urgencia sigue presente pero usa canales secundarios (fondo tintado, chip de texto). El dot, el borde lateral y el sparkline de cualquier elemento narrativo usan el color de su tema — no el de su urgencia.

**Por qué:** en períodos de alta tensión, todo el dashboard se vuelve rojo y pierde poder discriminatorio. El analista no puede distinguir entre narrativas cuando todas son críticas. Con color por identidad, el color dice QUÉ está pasando, no solo cuán grave es.

### 3.2 Variables CSS — bridge de compatibilidad con MDUI 2

El proyecto usa un bridge que mapea las variables propias (`--bg`, `--surface`, etc.) a los tokens de color M3 generados algorítmicamente por MDUI desde el color semilla Terra `#C4522A`.

**Orden de carga en `index.html`:**
```html
<link rel="stylesheet" href="https://unpkg.com/mdui@2/mdui.css">
<link rel="stylesheet" href="css/tokens.css">
<link rel="stylesheet" href="css/app.css">
<!-- JS: MDUI debe cargarse antes de api.js y app.js -->
<script src="https://unpkg.com/mdui@2/mdui.global.js"></script>
<script src="js/api.js"></script>
<script src="js/app.js"></script>
```

Sin `mdui.global.js`, `mdui.setColorScheme('#C4522A')` lanza `ReferenceError`.

**Activación del palette algorítmico (en `js/app.js`, al inicializar):**
```js
mdui.setColorScheme('#3949AB');  // Índigo — TEMPORAL, pendiente decisión definitiva
```

> ⚠️ **El color semilla `#3949AB` (Índigo) es provisional.** El usuario quiere iterar sobre esta elección. Se eligió porque el terracota anterior (`#C4522A`) generaba superficies en la misma familia cálida que los accents, perdiendo diferenciación. El índigo genera superficies neutras (beige) claramente distintas. Opciones exploradas: terracota, teal, índigo. Decisión pendiente.

Esto genera automáticamente todos los `--mdui-color-*` en ambos modos. El tema claro/oscuro se alterna con `mdui.setTheme('dark'|'light')` — **no** `setAttribute('mdui-theme', ...)` que solo activa selectores CSS sin regenerar los tokens de color.

**Bridge de compatibilidad (`css/tokens.css`):**
```css
:root {
  --bg:                rgb(var(--mdui-color-surface-container-lowest));
  --surface:           rgb(var(--mdui-color-surface-container));
  --surface2:          rgb(var(--mdui-color-surface-container-high));
  --border:            rgb(var(--mdui-color-outline-variant));
  --text1:             rgb(var(--mdui-color-on-surface));
  --text2:             rgb(var(--mdui-color-on-surface-variant));
  --text3:             rgb(var(--mdui-color-outline));          /* rol MD3 real — NO on-surface-variant×0.6 */
  --font:              'Google Sans Flex', var(--mdui-typescale-body-medium-font);
  --mono:              'JetBrains Mono', ui-monospace, monospace;
  --primary:           rgb(var(--mdui-color-primary));
  --on-primary:        rgb(var(--mdui-color-on-primary));
  --primary-container: rgb(var(--mdui-color-primary-container));
  --on-primary-container: rgb(var(--mdui-color-on-primary-container));
  --chip-bg:           rgb(var(--mdui-color-secondary-container));  /* chips, keywords, badges */
  --chip-fg:           rgb(var(--mdui-color-on-secondary-container));
}
```

**Uso de roles MD3 activos:**
- `--primary` / `--on-primary` → elementos interactivos activos (chip seleccionado, botón)
- `--primary-container` / `--on-primary-container` → tab activo en la navegación
- `--chip-bg` / `--chip-fg` → todos los chips/tags/keywords (rol MD3: secondary-container)
- `--text3` → texto sutil (outline, no on-surface-variant diluido)

**Palette resultante (índigo):** superficies en beige neutro (light) / gris oscuro (dark). El acento principal es azul-índigo. Los accents de tema (golden angle) contrastan bien sobre estas superficies neutras.

**Cambio de tema:**
```js
// CORRECTO — regenera tokens de color en MDUI:
mdui.setTheme('dark' | 'light');

// INCORRECTO — solo activa selectores CSS, los tokens de color no cambian:
document.documentElement.setAttribute('mdui-theme', 'dark');
```

### 3.3 Identidad cromática por tema

**Implementación real (desde 2026-06-18):** todos los temas reciben un color único por golden angle — no hay límite de 4, no hay variables CSS estáticas. La asignación es dinámica en JS.

**Algoritmo (`_buildClusterColorMap` en `js/api.js`):**

```js
// Ordenados por importance_score desc; idx = posición en el ranking
const hue = (18 + idx * 137.5) % 360;           // golden angle — evita colores adyacentes similares
const sat = 55 + Math.min(score, 1) * 25;        // 55–80% — más saturado = más importante
const lit = isDark ? 62 : 38;                     // claro en dark mode, oscuro en light
const hex = hslToHex(hue, sat, lit);
_clusterHexMap[topic] = hex;                      // keyed por nombre del tema
```

El mapa `_clusterHexMap` se reconstruye en cada poll y cada vez que cambia el tema claro/oscuro. `_clusterHex(topicName)` devuelve el hex del tema o `--q-cluster-none` si no tiene asignación.

**Variables CSS de fallback (en `css/tokens.css`):**

```css
:root {
  --q-cluster-none: #5F5E5A;  /* gris neutro — tema sin score o sin asignación */
}
[mdui-theme="dark"] {
  --q-cluster-none: #8A8880;
}
```

Los colores `--q-cluster-1..4` del spec original ya no se usan — reemplazados por el mapa dinámico.

**Regla de aplicación:**

| Elemento | Canal de color | Implementación |
|---|---|---|
| Dot de historia o mención | Color del tema | `background: ${clusterHex}` |
| Borde izquierdo de fila | Color del tema | `border-left: 6px solid ${clusterHex}` |
| Sparkline inline | Color del tema | `stroke: ${clusterHex}` |
| Burbuja en Tab Temas | Color del tema | `fill: ${clusterHex}` |
| Label del tema (texto) | Color del tema | `color: ${clusterHex}` |
| Background de card o fila | **Tinte 7% del color del tema** | `background: rgba(r,g,b, 0.07)` vía `_hexToRgba(hex, 0.07)` |
| Card Veredicto | Tinte 7% del tema top | JS inline en `_updateTemasFromSummary` |
| Panel Rationale | Tinte 7% del tema seleccionado | JS inline en `_selectTema` |

> **Nota sobre el tinte de fondo:** 7% de opacidad es suficiente para que el ojo agrupe filas del mismo tema sin competir con el texto. El borde de 6px es el canal primario de identificación (se escanea verticalmente sin leer); el tinte es el canal secundario (confirma la agrupación). Juntos son más efectivos que cualquiera solo.

### 3.4 Urgencia — canales secundarios

La urgencia no desaparece. Usa dos canales que ya existen en el código:

**Canal 1 — Fondo tintado** (para eventos critical/high en timeline):
```css
background: rgba(153, 27, 27, 0.05);
```

**Canal 2 — Chip de texto neutro:**
```
[Crítica]  [Alta]  [Media]  [Baja]
```
Fondo `var(--surface2)`, texto `var(--text2)`, sin color propio.

### 3.5 Tokens de urgencia existentes

Valores absolutos, no cambian entre temas.

```css
--q-urgency-critical: #991B1B;
--q-urgency-high:     #EF4444;
--q-urgency-medium:   #F59E0B;
--q-urgency-low:      #4CAF50;
```

Estos tokens siguen en uso para: timestamps de eventos críticos, indicadores de estado de radio, veredictos de sesión en el análisis narrativo.

---

## 4. Shape system

Material You define border-radius por categoría de componente. Qontexto usa la escala completa de M3 vía MDUI 2. Todos los tokens de shape incluyen el segmento `-corner-` en el nombre.

| Nivel | Token MDUI 2 | Valor | Componentes en Qontexto |
|---|---|---|---|
| Extra Small | `--mdui-shape-corner-extra-small` | `4px` | Chips, badges, tooltips |
| Small | `--mdui-shape-corner-small` | `8px` | Botones, inputs, menús |
| Medium | `--mdui-shape-corner-medium` | `12px` | — (ver override) |
| Large | `--mdui-shape-corner-large` | `16px` | Navigation rail |
| Full | `--mdui-shape-corner-full` | `9999px` | Pills de estado |

**Override de cards — a nivel de selector, no de token global:**
```css
/* css/app.css — override selectivo */
.qcard { border-radius: 16px; }
.qstat { border-radius: 16px; }
```

El valor 16px es una excepción documentada al token `medium` (12px), justificada por la densidad visual del dashboard. Sobreescribir el token global afectaría otros componentes MDUI que comparten ese nivel.

**Barras laterales de identidad de tema:** `border-radius: 2px` — excepción explícita, no mapea a ningún nivel M3.

Ver v1.5 §4 para la tabla completa de niveles y v1.5 §6–7 para State layers y Motion — sin cambios en v2.

---

## 5. Diseño por tab

### 5.1 Tab Temas (ex Resumen)

**Objetivo:** el analista ve de un vistazo qué temas están activos, su peso relativo y su evolución. El director lee color + tamaño y tiene el veredicto en 5 segundos.

**Componentes:**

**Bubble chart SVG (hero) — implementación D3 v7 (desde 2026-06-19)**
- Una burbuja por tema activo (todos los temas, sin límite)
- Tamaño = `importance_score` · radio entre 28px (score mínimo) y 58px (score máximo)
- Color = `_clusterHex(topic)` del color map dinámico
- Label = nombre del tema, partido en dos líneas si > 2 palabras
- Font proporcional al radio: `fs = round(11 + (r-22)/(maxBubbleR-22) * 3)` → 11–14px
- Burbujas con r < 22px no muestran texto
- Hebras bezier hacia nodos de región (Arequipa, Cajamarca, etc.)
- 1 hebra = 5 historias activas en esa región · máximo 4 hebras por burbuja
- Regiones posicionadas bajo el cluster real (no bajo el SVG completo)
- Interacción: clic en burbuja → selecciona el tema → activa el panel de rationale

**Layout D3 force-directed (sincrónico):**
- D3 v7 desde CDN (`d3@7/dist/d3.min.js`)
- Posiciones iniciales: espiral compacta al centro — `x = centerX + cos(i*2.4)*(i+1)*5`
- Simulación: `simulation.stop()` + loop de ticks hasta convergencia (sin animación)
- Fuerzas: `forceCollide(r+14, 1.0)` · `forceManyBody(-120)` · `forceX/Y(center, 0.018/0.015)`
- Post-simulación: eliminar aire arriba (`shiftY`), calcular `finalRegionRowY`, dimensionar SVG
- SVG renderiza una sola vez con posiciones finales — sin `on('tick')`, sin transiciones

**Panel de rationale** (al seleccionar un tema)
- `border-left: 6px solid clusterHex` + `background: rgba(clusterHex, 0.07)` — mismo lenguaje visual que Historias
- Nombre del tema (en color del tema, 14px bold)
- Chip "N historias" con borde del color del tema
- Chip de urgencia neutro (`secondary-container`)
- Texto de rationale (generado por Haiku, consume campo `rationale` de `GET /my/summary`, 14px)

**Card Veredicto** (siempre visible, refleja el tema top)
- `border-left: 6px solid topHex` + `background: rgba(topHex, 0.07)` — seteado en JS por `_updateTemasFromSummary`
- Texto del veredicto: `font-size: 16px` (Title Medium — el elemento más importante del dashboard)

**Tendencia de temas**
- Fuente: `narrativas[].series` — campo pendiente de añadir al backend (ver §6)
- Una línea por tema. Eje X = tiempo (días desde inicio del contrato hasta hoy). Eje Y = suma de scores de `intensity_history` de todos los arcos del tema ese día — no `importance_score`
- Solo días con actividad real. Sin padding de ceros. Sin ventana fija de 7 días
- Color de la línea = color del tema (no color de urgencia)
- Sin eje Y numérico — label descriptivo: "Más historias y radios = línea más alta"
- Texto de tendencia debajo: consume `trend_label` (ver §6 — requerimientos de backend)
- Default state (sin selección): "Cada línea es un tema. La altura refleja su presencia simultánea en radios e historias."

**Leyendas**
- "1 hebra = 5 historias" (ícono SVG de hebras)
- "Más historias y radios = línea más alta" (ícono SVG de línea)

**Datos requeridos del backend:** ver §6.

---

### 5.2 Tab Historias (ex Contexto)

**Objetivo:** el analista navega las historias activas, filtra por tema y estado, y lee el detalle de cada una.

**Layout:** lista plana ordenada por `last_seen DESC` (igual que Tab Contexto actual). Sin cambios estructurales.

**Cambio principal — identidad cromática:**
Cada fila de historia recibe el color de su tema en cuatro canales:
- Barra lateral izquierda **6px** (canal primario — se escanea sin leer)
- Fondo tintado al 7% del color del tema (canal secundario — agrupa visualmente)
- Dot de status
- Sparkline inline

La urgencia (Escalando / Activo / Dormido) pasa a ser chip de texto neutro.

**Anatomía de fila:**
```
[barra 6px, color tema │ fondo rgba(tema, 0.07)]
  [dot, color tema] [nombre del tema — color tema]
                    [título de la historia]
                    [fecha inicio — fecha fin · Región]
                    [keywords] · [chip estado] · [chip urgencia] · [chip trend]
                    [sparkline 80px, color tema]
```

**Filtros:** sin cambio estructural respecto a Tab Contexto actual.
- Un botón "Filtros" colapsa/expande el panel completo
- Dentro del panel: status chips + dropdown de tema + date picker + dropdown urgencia
- El dropdown de cluster se convierte en dropdown de **tema** con dot de color por opción
- Los dots de color en el dropdown siguen el mismo sistema `--q-cluster-N`

**Datos requeridos del backend:** `cluster_name` ya disponible en `GET /my/narrative-arcs` via `_enrich_arcs_with_cluster_data`. Sin cambios de backend necesarios para este tab.

---

### 5.3 Tab Menciones (ex Señales)

**Objetivo:** el analista revisa el timeline de una sesión específica, navega entre sesiones e identifica qué temas están activos en cada radio.

**Layout:** stack vertical de 4 bloques full-width (estructura actual desde D8, sin cambios):
1. Navegador de sesiones
2. Análisis narrativo (card)
3. Línea de tiempo (card)
4. Radios (grid 3 columnas)

**Navegador de sesiones:** sin cambios.
```
[← Anterior]   Jue 3 jun · 07:00–08:00 · 11 menciones · [● En vivo]   [Siguiente →]
```

**Análisis narrativo:** sin cambios de diseño. Texto generado por Sonnet.

**Línea de tiempo — cambio principal:**

El dot de cada evento cambia de color de urgencia a color de tema.

| Elemento | v1.5 | v2 |
|---|---|---|
| Dot del evento | Color de urgencia | Color del tema |
| Fondo del evento (critical/high) | `rgba(153,27,27,0.05)` | Sin cambio — canal de urgencia |
| Color del timestamp (critical) | `#791F1F` | Sin cambio — canal de urgencia |
| Color de la cita textual | `#991B1B` | Color del tema |
| Chip de urgencia | No existía | Chip neutro en sub-línea |

**Leyenda de temas:** inline en el header del card de timeline.
```
Temas: [● coral] Fraude  [● purple] Desconfianza  [● teal] Movilización  [● amber] Gira
```

**Cards de radio (resumen por radio):**
Cada card muestra los temas activos en esa radio con sus dots de color, en lugar de un único color de urgencia.
```
Radio Metropolitana — Arequipa
5 menciones · Vigilancia crítica
[● coral] Fraude electoral · 3
[● purple] Desconfianza · 1
[● amber] Gira castillista · 1
```

**Datos requeridos del backend:** `cluster_name` en cada alerta de `report_state.alerts[]`. Actualmente las alertas no tienen este campo. Ver §6.

---

### 5.4 Tab Contrato

**Objetivo:** el analista verifica la configuración del contrato — ventanas, radios y keywords activos.

**Layout:**
```
[Stats: Institución · Sector · Tier · Vigencia desde]

[Card izquierda]              [Card derecha]
Ventana global del contrato   Radios monitoreadas (lista)
Keywords configurados
ID de contrato
```

**Stats row:** 4 stats en grid `repeat(4, 1fr)`.

**Card izquierda:**
- Ventana global del contrato (hora + días + timezone)
- Keywords como chips `var(--surface2)`
- ID de contrato en `font-family: var(--mono)` con fondo `var(--surface2)` y borde

**Card derecha — lista de radios:**
Lista vertical (no grid). Escala a cualquier número de radios sin overflow. Label del card: `"Radios monitoreadas"` (actualmente `"Emisoras del contrato"` en `index.html`).

Cada fila:
```
[dot verde] Radio Metropolitana — Arequipa
            07:00 — 08:00 · L–V   [Ventana propia]

[dot verde] Turbo Mix 710 AM — Cajamarca
            07:00 — 08:00 · L–V   [Hereda del contrato]
```

Chip **"Ventana propia"**: `background: rgba(186,117,23,0.12); color: #854F0B; border: 0.5px solid rgba(186,117,23,0.4)` — visible solo si el stream tiene `stream_windows` propias.

Chip **"Hereda del contrato"**: fondo y color de `var(--surface2)` / `var(--text3)` — visible si `stream_windows` está vacío.

**Lógica de determinación (frontend):**
`GET /my/contract` ya devuelve `stream_windows: []` por cada stream (desde commit `3957cd0`). Si `stream.stream_windows.length > 0` → "Ventana propia". Si `stream.stream_windows.length === 0` → "Hereda del contrato". No requiere cambios de backend.

**Migración CSS:** las variables `var(--surface)`, `var(--text1)`, etc. ya son el sistema actual. No hay migración pendiente — el Tab Contrato usa las mismas variables que el resto del dashboard. Lo que sí falta es que `<code>` del contract ID no tiene estilo propio — cae al estilo browser por defecto.

---

## 6. Requerimientos de backend

Datos que el dashboard v2 necesita del backend, organizados por disponibilidad.

### Disponibles hoy — sin cambios necesarios

| Dato | Endpoint | Campo | Tab que lo consume |
|---|---|---|---|
| Nombre del tema/cluster | `GET /my/summary` | `narrativas[].topic` | Temas — **no es `cluster_name`**, ese campo no existe en este endpoint |
| importance_score por cluster | `GET /my/summary` | `narrativas[].importance_score` | Temas |
| urgency por cluster | `GET /my/summary` | `narrativas[].urgency` | Temas, Historias |
| rationale por cluster | `GET /my/summary` | `narrativas[].rationale` | Temas |
| Tendencia del arco dominante por cluster | `GET /my/summary` | `narrativas[].trend` | Temas — valores: `new/continuing/escalating/reactivation` |
| cluster_name en arcos | `GET /my/narrative-arcs` | `arc.cluster_name` | Historias |
| importance_score en arcos | `GET /my/narrative-arcs` | `arc.importance_score` | Historias |
| urgency en arcos | `GET /my/narrative-arcs` | `arc.urgency` | Historias |
| Lista de nombres de temas | `GET /my/cluster-names` | `[ ]` | Historias (filtro dropdown) |
| stream_windows por radio | `GET /my/contract` | `stream.stream_windows` | Contrato |

### Pendientes — requieren cambios en `narrative-intelligence`

| # | Dato | Endpoint afectado | Campo a añadir | Tab | Tipo de cambio |
|---|---|---|---|---|---|
| 1 | `score_trajectory` del cluster | `GET /my/summary` | `narrativas[].score_trajectory` | Temas | Exponer `signals.score_trajectory` (ascending/descending/stable) de `cluster_assessments` en `narrativas[]`. Actualmente en `db_assessment.get("signals", {}).get("score_trajectory")` dentro de `_rank_clusters()` pero no se incluye en el dict de salida. Sin cambio de schema. |
| 2 | `trend_label` como texto | `GET /my/summary` | `narrativas[].trend_label` | Temas | Campo derivado de `score_trajectory` + `importance_score`. Requiere que #1 esté implementado. Sin cambio de schema. |
| 3 | Regiones activas por cluster | `GET /my/summary` | `narrativas[].unique_regions` | Temas | Exponer `signals.unique_regions` de `cluster_assessments` en el response. Sin cambio de schema. |
| 4 | Serie temporal de actividad por cluster | `GET /my/summary` | `narrativas[].series` | Temas (Tendencia) | Añadir `series` a cada item de `narrativas[]`. El campo ya se computa en `_rank_clusters()` como `history` pero no se expone. Debe cubrir toda la historia disponible del contrato (no solo 7 días), incluyendo únicamente días con actividad real (score > 0). Shape: `[{"date": "YYYY-MM-DD", "score": float}]`. |
| 5 | `cluster_name` en alertas | `GET /session/{id}/state?token=` | `alerts[].cluster_name` | Menciones | Enriquecer `report_state.alerts[]` con el tema al que pertenece cada alerta, usando overlap de keywords con arcos activos. |

### Mapeo de `trend_label` (cambio #2)

Derivado de `narrativas[].score_trajectory` + `importance_score`:

| `score_trajectory` | `importance_score` | `trend_label` |
|---|---|---|
| `ascending` | cualquiera | "Creciendo sostenidamente" |
| `descending` | cualquiera | "Perdiendo fuerza" |
| `stable` | ≥ 0.60 | "Instalado" |
| `stable` | < 0.60 | "Contenido" |

---

## 7. Estado de implementación

### `qontexto-dashboard` — completado

| # | Tarea | Estado | Commit |
|---|---|---|---|
| 1 | Renombrar tabs: Resumen→Temas, Contexto→Historias, Señales→Menciones | ✅ | `fb97f1e` |
| 2 | Vocabulario global: "cluster"→"tema", "arcos"→"historias", "señales"→"menciones" | ✅ | `fb97f1e` |
| 3 | Sistema de color dinámico por golden angle (reemplaza --q-cluster-1..4 estáticos) | ✅ | `fb97f1e` |
| 4 | `<code>` del contract ID: font-mono + fondo + borde | ✅ | `fb97f1e` |
| 5 | Tab Contrato: lista de radios con chip "Ventana propia" / "Hereda del contrato" | ✅ | `fb97f1e` |
| 6 | Tab Historias: color de identidad en dot, borde izquierdo y sparkline | ✅ | `fb97f1e` |
| 7 | Tab Historias: dropdown de tema con dots de color | ✅ | `fb97f1e` |
| 8 | Tab Temas: bubble chart D3 + panel rationale + tendencia + veredicto dinámico | ✅ | `fb97f1e` + `f9815e4` + `fbac15c` + `ff1cd34` + `f8fd966` + `962ac84` |
| 9 | Tab Menciones: dot de evento en color de tema | ✅ | `fb97f1e` |
| 10 | Tab Menciones: cards de radio con dots de tema | ✅ | `fb97f1e` |

### `qontexto-dashboard` — pendiente de decisión

| Tarea | Contexto |
|---|---|
| Sparkline de tendencia: migrar de Chart.js a D3 | Permitiría transiciones suaves al seleccionar temas. Costo: reescribir `_updateTemasTrend`. Decisión pendiente del usuario. |

### `narrative-intelligence` — pendientes

| # | Tarea | Complejidad | Estado |
|---|---|---|---|
| 1 | `score_trajectory` en `GET /my/summary` → `narrativas[].score_trajectory` | Baja | ✅ ya disponible vía `signals.score_trajectory` en el backend, frontend usa `_calcTrendFromSeries` como alternativa |
| 2 | `trend_label` en `GET /my/summary` → `narrativas[].trend_label` | Baja | ✅ frontend genera `_buildVeredictoConjunto` y `_getTrendVeredicto` sin depender del campo |
| 3 | `unique_regions` en `GET /my/summary` → `narrativas[].unique_regions` | Baja | ✅ implementado — ya viene del backend en la respuesta actual |
| 4 | `series` en `GET /my/summary` → `narrativas[].series` | Baja | ✅ implementado — ya viene del backend; frontend usa `nav.series` para sparkline y tendencia |
| 5 | `cluster_name` en `report_state.alerts[]` | Media | ⏳ pendiente — Tab Menciones ya usa `ev.alert?.cluster_name` pero el campo no siempre viene |

---

## 8. Estado del código en `js/api.js` — refactor v2

### 8.1 Código muerto eliminado ✅

Todas las funciones listadas a continuación fueron eliminadas en el commit `fb97f1e`:
`_maxUrgency`, `_URGENCY_ORDER`, `_updateResumenFromArcs`, `_SEV_TO_URGENCY`, `_buildNarrativeItems`, `_buildNarrativeItemsFromArcs`, `_updateNarrativasCard`, `_buildVeredicto` (snapshot), `_buildVocesItems`, `_updateVocesCard`, `_detectTrend`, `_buildSparklineData`, `_updateMomentoCard`, `_updateNarrativasFromSummary`, `_updateVocesFromSummary`, `_updateMomentoFromSummary`, `_TREND_CHIP`, `_TREND_TO_COLOR`, `_TONE_URGENCY`, `_WC_SLOTS`, `_WC_SIZES`, `_WC_WEIGHTS`, `_TREND_CONFIG`.

### 8.2 `_drawSparkline` — firma actualizada ✅

Recibe `clusterHex` como tercer parámetro. El color del sparkline es el del tema, no derivado del score.

### 8.3 Dark mode — re-render ✅

`toggleTheme()` reconstruye `_clusterHexMap` y re-renderiza el bubble chart y la lista de historias.

### 8.4 `_buildClusterColorMap` + re-render de arcos ✅

Al final de `_buildClusterColorMap()`, si `_allArcs.length > 0`, llama `_renderNarrativeArcs(_allArcs)` automáticamente.

### 8.5 Dropdown custom de tema ✅

`resetAllFilters()` limpia el estado interno del dropdown custom. CSS en `app.css` con clases `.qdd-*`.

### 8.6 Fallback de cluster names eliminado ✅

El endpoint `GET /my/cluster-names` está implementado. Los hardcodeados fueron eliminados.

### 8.7 `surfaceColor()` y `tickColor()` ✅

Leen desde tokens computados: `getComputedStyle(...).getPropertyValue('--bg')` y `'--text3'`. No hay hex hardcodeados del palette anterior.

### 8.8 Funciones del Tab Temas (nuevas) ✅

| Función | Propósito |
|---|---|
| `_updateTemasFromSummary(summary)` | Punto de entrada — llama bubble + trend + veredicto |
| `_buildClusterColorMap(narrativas)` | Construye `_clusterHexMap` por golden angle · se llama antes de colorear el veredicto |
| `_clusterHex(topic)` | Lookup de hex del tema o fallback `--q-cluster-none` |
| `_renderTemasBubble(narrativas)` | SVG con D3 force sincrónico · posiciones finales directas |
| `_selectTema(clusterName)` | Toggle de selección · actualiza burbujas in-place · actualiza panel y trend |
| `_applyTrendSelection(clusterName)` | Resalta línea del tema en Chart.js sparkline |
| `_initTrendChart()` | Inicializa Chart.js para el sparkline de tendencia |
| `_updateTemasTrend(narrativas)` | Popula el sparkline con series por tema |
| `_buildVeredictoConjunto(narrativas)` | Texto de tendencia cuando no hay tema seleccionado |
| `_calcTrendFromSeries(series)` | Calcula veredicto de un tema desde su serie temporal |
| `_getTrendVeredicto(nav)` | Dispatcher: usa `_calcTrendFromSeries` si hay series, `nav.trend` como fallback |
| `_calcCircleR(N)` | Radio del círculo inicial para N nodos (posiciones de partida de D3) |
| `_bubbleCoords(N, cx, cy, r)` | Coordenadas iniciales en círculo para D3 (reemplazado por espiral compacta) |

---

*● Qontexto · Sistema de Diseño v2.0 · qontexto.com*
