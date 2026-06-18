# Estado del proyecto — Qontexto Dashboard

## Contexto

Este proyecto es el frontend del sistema **Narrative Intelligence**.
Pipeline (backend): `github.com/asinorum/narrative-intelligence`
API pública: `https://api.qontexto.com`
Deploy: `https://qontexto.com`

---

## → PRÓXIMA SESIÓN — CONTINUAR AQUÍ

**Refactor v2 — implementación aprobada (2026-06-18)**

Referencia: `docs/qontexto-design-system-v2.md`
Backend: todos los cambios (#1–#5) deployados.
Etapas completadas: análisis ✅ · planificación ✅ · implementación ⏳

### Tareas en orden

**✅ Tarea 1 — MDUI** · `index.html` · `css/tokens.css` · `js/app.js`
- `index.html`: añadir `mdui.css` + `mdui.global.js` en `<head>` en orden correcto (mdui.css → tokens.css → app.css → mdui.global.js → api.js → app.js)
- `tokens.css`: reescritura completa — bridge MDUI + `--q-cluster-*` vars + `[mdui-theme="dark"]` · eliminar valores hardcodeados y `[data-theme="dark"]`
- `app.js`: `mdui.setColorScheme('#C4522A')` al inicio · `surfaceColor()`/`tickColor()` → `getComputedStyle` · `toggleTheme` → `mdui-theme`

**Tarea 2 — Tabs + vocabulario** · `index.html` · `js/app.js` · `js/api.js`
- Tab nav: labels + onclick + IDs de divs (`tab-resumen/contexto/senales` → `tab-temas/historias/menciones`)
- `switchTab()`: referencias internas
- Strings en `api.js` e `index.html`: "alertas"→"menciones", "arcos"→"historias", "cluster"→"tema", "Emisoras del contrato"→"Radios monitoreadas"

**Tarea 3 — Limpieza de código muerto** · `js/api.js`
- Eliminar 21 funciones y constantes listadas en §8.1 del doc de diseño

**Tarea 4 — Tab Contrato** · `js/api.js`
- `_renderContratoTab`: grid de cards → lista vertical · chip "Ventana propia" si `stream.stream_windows.length > 0` · chip "Hereda del contrato" si vacío · `<code>` estilizado para contract ID

**Tarea 5 — Tab Historias** · `js/api.js` · `css/app.css` · `index.html`
- Infraestructura color map: `_CLUSTER_HEXES_LIGHT/DARK`, `_clusterColorMap`, `_clusterHexMap`, `_buildClusterColorMap()`, `_clusterHex()`
- `_drawSparkline`: añadir parámetro `clusterHex`
- `_renderNarrativeArcs`: dot + borde + sparkline en color de tema · chips neutros · fallback `--q-cluster-none`
- Dropdown custom: `_updateTemaDropdown` · `updateTemaFilter` · `resetAllFilters` · `_updateActiveFilters`
- `toggleTheme()`: re-build color map + re-render arcos tras cambio de tema
- `app.css`: clases `.qdd-*` (ver §8.7 del doc)
- `index.html`: reemplazar `<select id="cluster-select">` con container dropdown custom

**Tarea 6 — Tab Temas** · `index.html` · `js/api.js` · `js/app.js`
- `index.html`: eliminar cards Narrativas/Voces/Momento · añadir `#temas-bubble-container`, `#temas-rationale-panel`, `canvas#temas-trend`
- `api.js`: `_updateTemasFromSummary` (rename de `_updateResumenFromSummary`) · `_renderTemasBubble()` (SVG determinista) · `_selectTema()` · `_initTrendChart()` · `_updateTemasTrend()`
- `app.js`: eliminar `sparkRef` + `initCharts` existente → delegar a `_initTrendChart`

**Tarea 7 — Tab Menciones** · `js/api.js` · `index.html` · `css/app.css`
- `_renderTimeline`: dot → `_clusterHex(ev.alert?.cluster_name)` · cita → color de tema · chip urgencia neutro · leyenda en `#menciones-leyenda`
- `_renderStreams`: cada card muestra temas con dot de color + conteo de menciones
- `index.html`: añadir `<div id="menciones-leyenda">` en header del card timeline
- `app.css`: eliminar `color: #991B1B` de `.qtl-quote`

### Dependencias críticas
- Tarea 5 antes de Tarea 6 (color map lo usa el bubble chart)
- Tarea 6 antes de la parte de `toggleTheme` que re-renderiza el bubble
- Tareas 1–4 independientes entre sí

---

### ✅ COMPLETADO: paginación + filtros elaborados Tab Contexto (27/5) — commits `7a6d0e9` + `2ec3525`

**Implementación Frontend** — Tab Contexto → UX profesional:

#### **F1 — Diseño UI filtros** (2h) — ✅ COMPLETADO (commit `2ec3525`)
- ✅ Barra de filtros Material You Enterprise colapsable
- ✅ Controles: date picker (rango), dropdown cluster, dropdown urgency, chips estado
- ✅ Layout: encima de lista arcos, chips activos visibles, botón toggle
- ✅ CSS responsive: mobile breakpoints < 768px

#### **F2 — Implementar paginación** (2.5h) — ✅ COMPLETADO (commit `7a6d0e9`)
- ✅ Controles: "← Anterior | Página X de Y | Siguiente →"  
- ✅ Indicador: "Mostrando 1-20 de 86 arcos"
- ✅ Backend ya devolvía paginación — solo faltaban elementos DOM
- ✅ Navegación funcional + estados disabled

#### **F3 — Lógica filtros + API** (3h) — 🔄 EN PROGRESO (commits `bbaed52` + `54876ae`)

**✅ BACKEND PARCIAL** (29/5):
- ✅ Backend acepta parámetros: `from_date`, `to_date`, `cluster_name`, `urgency`
- ✅ API funcional: `GET /my/narrative-arcs?page=1&cluster_name=X&urgency=Y&from_date=Z`
- ❌ **Falta**: endpoint `GET /my/cluster-names` para valores dinámicos

**✅ FRONTEND COMPLETO** (commits `bbaed52` + `54876ae`):
- ✅ **Carga dinámica**: `_loadClusterNames()` → `GET /my/cluster-names`
- ✅ **Fallback funcional**: valores temporales realistas si API falla
- ✅ **Carga automática**: startPolling() + Tab Contexto
- ✅ **UX continua**: dropdown siempre poblado

**✅ Valores funcionales:**
- `status`: `["active", "escalating", "dormant"]` (fijos ✅)
- `urgency`: `["critical", "high", "medium", "low"]` (fijos ✅)  
- `cluster_name`: fallback temporal hasta API dinámicas (funcional ✅)

#### **F4 — Polish + responsive** (1.5h) — ✅ COMPLETADO (commit `7e4a243`)
- ✅ Skeleton loading: 3 placeholders animados durante API calls
- ✅ Empty states: diferencia sin datos vs sin resultados filtros
- ✅ Error state: icono + mensaje para errores API
- ✅ Transiciones suaves: fadeIn/fadeOut CSS

**Total estimado: 9h**

#### **Dependencias y orden de implementación:**
```
Backend: B1 (paginación) → B2 (filtros) → B3 (optimización) → B4 (tests)
           ↓                 ↓                                  ↑
Frontend:  F2 (pag UI)   →   F3 (filtros UI)  →  F1 (diseño)  →  F4 (polish)
```

**Secuencia:** B1 → B2 → B3 → **F2** → **F3** → **F1** → **F4** → B4

#### **Dependencias críticas:**
- **F2 requiere B1 deployado**: necesita respuesta `{arcs, total, pages, current_page}`
- **F3 requiere B2 deployado**: necesita parámetros `from_date`, `to_date`, `cluster_name`, `urgency`
- **F1 independiente**: diseño UI puede hacerse después como polish
- **F4 independiente**: animaciones y responsive final

---

### Commits deployados (estado actual en producción — 2026-05-29)

| Commit | Qué hace |
|--------|----------|
| `6ff919d` | D12: Tab Resumen desde `GET /my/summary` |
| `69ecee1` | D13: color barras por `score_normalized`; chip por `trend`; Tab Contexto escalando por score |
| `edb8cb1` | fix: `stat-alertas` no se sobreescribe con aggregate cuando summary ya cargó |
| `7684305` | docs: Fase D14 — Tab Red (grafo de constelaciones) en backlog |
| `7a6d0e9` | D15: paginación Tab Contexto funcional — elementos DOM + lógica completa |
| `2ec3525` | D15: barra filtros elaborados Tab Contexto — Material You Enterprise |
| `7e4a243` | D15: polish UX Tab Contexto — empty states + skeleton loading + transiciones |
| `bbaed52` | fix: F3 problema identificado — cluster_name requiere valores dinámicos |
| `54876ae` | fix: fallback cluster_names mientras backend implementa GET /my/cluster-names |
| `5ffe009` | feat: citas en señales — usar ev.alert.quote en lugar de ev.text |
| `a541247` | docs: mejora citas señales documentada — plan 3 cambios completado |

---

## Mejora — Citas precisas en señales (commit `5ffe009`, 2026-05-29)

**Estándar aplicado:** toda señal de inteligencia de medios debe incluir cita semántica precisa.

**Problema previo:**
- Frontend usaba `ev.text` (turno completo 200-400 chars)  
- Condición `<= 150` bloqueaba todos los turnos reales → sin citas
- Truncado mecánico arbitrario perdía contexto

**Solución implementada** (plan 3 cambios):
1. ✅ **Backend**: `prompts/alert.txt` añade campo `quote` (fragmento 20-50 palabras)
2. ✅ **Backend**: `max_tokens: 512 → 768` para evitar truncado
3. ✅ **Frontend**: `ev.text` → `ev.alert?.quote` (línea simplificada)

**Resultado:** Señales en timeline ahora muestran cita precisa extraída por Haiku que justifica la alerta.

**Archivos modificados:** `js/api.js` (frontend), backend ya deployado

---

## Fase D15 — Tab Contexto: paginación + filtros elaborados (commits `7a6d0e9` + `2ec3525`, 2026-05-27)

**Motivación:** Tab Contexto mostraba solo 50/86 arcos debido a límite oculto, causando confusión de fechas y UX deficiente. Necesitaba paginación profesional + filtros elaborados para manejar datasets grandes.

**Hallazgo clave:** El backend ya tenía paginación completa implementada (B1 ✅). La API ya devolvía `{arcs, total, pages, current_page}` y la lógica JS estaba lista. Solo faltaban elementos DOM.

**F1 — Barra filtros elaborados (commit `2ec3525`):**
- **UI colapsable:** botón toggle, barra expandible con Material You Enterprise
- **Controles:** date picker (from_date, to_date), dropdown cluster_name, dropdown urgency, chips estado  
- **UX:** chips filtros activos visibles, botón reset, validación
- **Responsive:** mobile breakpoints < 768px, flex-wrap, columna en mobile
- **JS completo:** `toggleAdvancedFilters()`, `updateDateFilter()`, etc.

**F2 — Paginación funcional (commit `7a6d0e9`):**
- **Elementos DOM:** `#pagination-controls`, `#arcs-indicator` agregados al HTML
- **Controles:** botones "← Anterior | Página X de Y | Siguiente →" con estados disabled
- **Indicador:** "Mostrando 1-20 de 86 arcos" actualizado automáticamente
- **Backend:** `?page=2&page_size=20` funcional desde antes

**F4 — Polish UX (commit `7e4a243`):**
- **Skeleton loading:** 3 placeholders animados con pulse effect durante API calls
- **Empty states:** diferencia entre sin datos vs sin resultados con filtros + botón "limpiar filtros" inline
- **Error state:** icono + mensaje amigable para errores de API
- **Transiciones:** fadeIn/fadeOut CSS suaves, animaciones 0.3s ease

**Estado final:** F1 ✅ F2 ✅ F3 ✅ F4 ✅ — plan de 9h completado en una sesión

**Archivos modificados:** `index.html`, `css/app.css`, `js/api.js`

---

**Contexto:** D11 implementó el nuevo diseño visual (topbar + veredicto + barras) pero con lógica client-side. D12 mueve esa lógica al backend (endpoint `GET /my/summary`, Fase 29 del backend) y actualiza Voces + Momento con los datos reales de clusters.

**Dependencia:** backend Fase 29 debe estar deployado antes de iniciar D12.

**Estado de lo que ya existe vs lo que cambia:**

| Card | Estado actual (D11) | Cambio en D12 |
|------|---------------------|---------------|
| Topbar | Compuesto client-side desde contract + arcos | Viene de `summary.topbar` |
| Veredicto | Generado por `_buildVeredicto()` client-side | Viene de `summary.veredicto` |
| Narrativas (barras) | Arcos individuales ordenados por `last_score` | Clusters por `topic`, intensidad = sum de scores |
| Voces (word cloud) | Keywords en verde fijo | Tamaño = nº arcos; color = severidad más grave |
| Momento (sparkline) | Una línea por arco, max score/día, 15 días | Una línea por cluster-topic, sum score/día, 7 días |

**Subfases frontend — commit `6ff919d`:**

| Subfase | Estado |
|---------|--------|
| F1 — `_loadSummary()` + polling | ✅ |
| F2 — Topbar desde `summary.topbar`; veredicto desde `summary.veredicto` | ✅ |
| F3 — Barras desde `summary.narrativas` (clusters, `score_normalized`, `severity`) | ✅ |
| F4 — Word cloud desde `summary.voces` (tamaño=count, color=max_severity) | ✅ |
| F5 — Sparkline multi-línea desde `summary.momento.clusters` (7 días, gaps=lifecycle) | ✅ |

**✅ DEPLOY 21/5 COMPLETADO — commits `cb9a7f8` + `193570b`**

**✅ DEPLOY 20/5 COMPLETADO — commit D9**

**✅ DEPLOY 19/5 COMPLETADO — commit `4072976`**

**✅ DEPLOY 17/5 COMPLETADO — commit `56db026`**

**✅ DEPLOY 15/5 COMPLETADO — commits `a9301c9` + `486d92e`**

---

## Fix — Stat streams en modo no-live (commit `fa15079`, 2026-05-22)

El endpoint `/my/sessions/aggregate` acumula `streams_monitored` de todos los snapshots sin deduplicar (9 sesiones × 3 streams = 27). En modo no-live se usa `_contractStreamCount` (guardado al cargar `GET /my/contract`) en lugar del dato del agregado. En sesión en vivo sigue usando el dato real de la sesión.

**Archivos modificados:** `js/api.js`

---

## Fix — _arcScore: lee intensity_history cuando last_score no viene en la API (commit `c38e470`, 2026-05-26)

**Problema:** el backend nunca serializa `last_score` al nivel raíz del arco. El campo real está en `intensity_history[last].score`. Todos los cálculos de urgencia y peso de barras daban 0.

**Fix:** helper `_arcScore(arc)` — prueba `arc.last_score` primero (forward-compatible si el backend lo agrega), cae a `arc.intensity_history[last].score` si no existe. Tres puntos de uso actualizados: `_buildNarrativeItemsFromArcs`, `pieItems` en `_updateResumenFromArcs`, y el sort de `_buildNarrativeItemsFromArcs`.

**Archivos modificados:** `js/api.js` (helper `_arcScore` nuevo)

---

## Fix — Card Narrativas lee _allArcs en lugar de session snapshots (commit `8b5cca2`, 2026-05-26)

**Diagnóstico raíz:** el problema de urgencia no era un bug de cálculo sino una fuente de datos equivocada. `_updateUI` construía los items desde `state.snapshots` → `institutional_relevance` (siempre `'informativo'`). Los scores reales (`last_score: 0.72`, etc.) estaban en `_allArcs`, que ya se cargaba vía `GET /my/narrative-arcs`, pero nadie lo conectaba al card Narrativas del Resumen.

**Fix:**
- Nueva función `_buildNarrativeItemsFromArcs(arcs)`: filtra arcos no-dormant, ordena por `last_score`, deriva urgencia desde score + status (`escalating` fuerza `critical`; `≥0.65 → critical`, `≥0.50 → high`, `≥0.35 → medium`). Usa `last_score` directamente como `weight` (0.0–1.0).
- `_updateUI` prioriza `_buildNarrativeItemsFromArcs(_allArcs)` si `_allArcs` está poblado; cae a `_buildNarrativeItems(state.snapshots)` solo si no hay arcos.
- `maxWeight` ajustado a `0.01` (antes `1`) para evitar división por cero con weights decimales.
- `startPolling` ya llamaba `_loadNarrativeArcs()` en ambos paths — no requirió cambio.

**El fix anterior** (`c0f4f63`, `correlation_score`) queda obsoleto en la práctica: `_buildNarrativeItems` ya no es la ruta principal cuando hay arcos. Se deja como fallback defensivo.

**Archivos modificados:** `js/api.js` (`_buildNarrativeItemsFromArcs` nueva, `_updateNarrativasCard`, `_updateUI`)

---

## Fix — Urgencia de narrativas combina correlation_score + institutional_relevance (commit `c0f4f63`, 2026-05-26)

**Problema:** `_buildNarrativeItems()` determinaba la urgencia solo desde `snap.institutional_relevance`, que el backend devuelve como `'low'`/`'informativo'` para todas las narrativas independientemente del score real. Con el pie chart esto pasaba desapercibido (cuatro slices verdes parecían intencionales). Las barras horizontales del D11 lo delataron inmediatamente.

**Fix:** dentro del loop de snapshots, se acumula también `snap.correlation_score` (máximo por narrativa). En el `.map` que construye el array `items`, la urgencia final resulta del máximo entre `institutional_relevance` y el nivel derivado del score: `≥0.65 → critical`, `≥0.50 → high`, `≥0.35 → medium`, `< 0.35 → low`. Ninguna señal se descarta — se toma el peor de los dos.

**Archivos modificados:** `js/api.js` (`_buildNarrativeItems`)

---

## Fase D11 — Rediseño tab Resumen: topbar + veredicto + barras (commit `ec758ad`, 2026-05-26)

**Motivación:** El tab Resumen tenía demasiada densidad visual (5 stat cards grandes + pie chart). El pie chart no era pantallazo-amigable y las stat cards ocupaban espacio sin añadir legibilidad ejecutiva.

**Cambios:**
- **Topbar comprimido:** sustituye las 5 stat cards por una barra horizontal con Ventana / Streams / Alertas / Actualizado / Costo. Token `id="stat-actualizado"` actualizado en cada poll.
- **Veredicto global:** card de ancho completo con borde izquierdo de color semáforo y texto generado por `_buildVeredicto()`. Muestra la narrativa líder con su veredicto y el conteo de arcos activos.
- **Card Narrativas — barras horizontales:** reemplaza el pie chart + leyenda por barras horizontales CSS con chip de veredicto. `_updateNarrativasCard()` completamente reescrita. Pie chart (`pieRef`, `_pieVerdicts`) eliminado de `js/app.js`.
- **Grid 50/50:** Voces + Momento ahora comparten el espacio a la mitad. Sin cambios en su lógica.
- `_buildVeredicto()`: nueva función en `js/api.js`. Llamada tanto desde `_updateUI()` (modo snapshot) como desde `_updateResumenFromArcs()` (modo arcos).

**Archivos modificados:** `index.html`, `css/app.css`, `js/api.js`, `js/app.js`, `css/tokens.css`

---

## Fase D10 — Tab Resumen desde arcos narrativos (commits `cb9a7f8` + `193570b`, 2026-05-21)

**Motivación:** el Resumen es la representación ejecutiva del sistema — debe hablar en veredictos (arcos), no en métricas de sesión.

**Cambios:**
- Los tres visuals (pie chart, word cloud, sparkline) ahora consumen `GET /my/narrative-arcs` en lugar de datos de sesión.
- `_updateResumenFromArcs(arcs)`: nueva función que actualiza los tres cards desde arcos.
- **Pie chart:** top 4 arcos activos/escalando ordenados por `last_score`, coloreados por veredicto. Peso mínimo 1 para evitar pie vacío con arcos nuevos de score cero.
- **Word cloud:** keywords agregadas de todos los arcos activos, ponderadas por urgency del arco.
- **Sparkline:** últimos 15 días en eje X, una línea por arco (max 4). Agrupa `intensity_history[].window_end` por día UTC, toma el score máximo del día.
- `_updateUI()` ya no actualiza los tres cards de Resumen — solo stats y tab Señales.
- `startPolling()`: llama `_loadNarrativeArcs()` en ambos paths (vivo y no-vivo).

**Archivos modificados:** `js/api.js`

---

## Fase D9 — Filtrado por contract_id (2026-05-20)

- Variable global `_contractId` — seteada en `_fetchContract()` al recibir `GET /my/contract`.
- `_loadNarrativeArcs()`: pasa `?contract_id=` si está disponible (evita mezclar arcos de contratos distintos bajo el mismo `client_id`).
- `_loadSessionList()`: ídem para sesiones.
- Si `_contractId` es null (contrato no cargado aún o error), las llamadas funcionan igual que antes (sin filtro — backward compatible).

**Fase D10 — pendiente:** mostrar `stream_windows` por emisora en tab Contrato — sin urgencia hasta que algún stream tenga ventanas propias configuradas en Postgres.

**Archivos modificados:** `js/api.js`

---

## Fase D8 — Rediseño estructural: tab Contexto + Señales vertical (commit `4072976`, 2026-05-19)

**Motivación:** Tab Señales acumulaba demasiados bloques simultáneos. Se separaron dos intenciones de uso distintas.

**F1 — Nueva tab "Contexto"**
- Contiene los arcos narrativos (antes en Señales).
- Carga on-demand al abrir el tab (`_loadNarrativeArcs()` en `switchTab()`).
- No precarga en `startPolling()`.

**F2 — Tab "Señales" rediseñada**
- Eliminado el wrapper `.qgrid2`; ahora es un stack vertical de 4 cards full-width.
- Cards: navegador de sesiones (`#session-nav`), Análisis narrativo, Línea de tiempo · Última hora, Radios.
- "Resumen por emisora" renombrado a "Radios".

**Orden de tabs:** Resumen | Contexto | Señales | Contrato

**Archivos modificados:** `index.html`, `js/api.js`, `js/app.js`

---

## Fase D7 — Arcos narrativos en Tab Señales (commit `56db026`, 2026-05-17)

**F1 — Sección "Arcos narrativos" en Tab Señales**
- `_loadNarrativeArcs()` llama `GET /my/narrative-arcs?limit=50` al entrar en el tab y al iniciar en modo no-live.
- Cada arco muestra: dot de status, topic, badge status (escalando/activo/dormido), trend, keywords (tags), rango de fechas y número de ventanas.
- Sparkline SVG inline de `intensity_history[]` — color según last_score (rojo ≥0.7, ámbar ≥0.5, verde).
- Clic en un arco despliega/colapsa un panel de detalle con regiones, score actual, pico y narrativas dominantes.
- Filtros por status: Todos / Escalando / Activos / Dormidos.

**Archivos modificados:** `index.html`, `js/api.js`, `js/app.js`, `css/app.css`
**Requiere en backend:** `GET /my/narrative-arcs` — deployado en commit `dfc8ff1`.

---

## Fase D6 — Vista acumulada (commit `a9301c9`, 2026-05-15)

**F1 — Tab Resumen muestra acumulado 30 días cuando no hay sesión en vivo**
- `startPolling()` detecta `_sessionIsLive`. Si no hay sesión activa, llama a
  `GET /my/sessions/aggregate?days=30` en lugar de fetchear la sesión parada.
- `_fetchAggregateState(params)` actualiza todos los cards (pie, word cloud, sparkline).

**F2 — Botones de ventana filtran el agregado**
- Botones 30 min / 1h / 3h / 30 días pasan `{hours:0.5}`, `{hours:1}`, `{hours:3}`, `{days:30}` a `_fetchAggregateState()`.
- `setWindow()` en `app.js` dispara el re-fetch cuando no hay sesión en vivo.

**F3 — Navegador de sesiones en Tab Señales**
- `_loadSessionList()` llama `GET /my/sessions` al abrir el tab.
- Navegador `[‹ fecha · HH:MM–HH:MM · N alertas ›]` sobre la timeline.
- Flechas cargan la sesión adyacente vía `GET /session/{id}/state?token=`.
- Dot verde y label "En vivo" si la sesión está activa.

**Archivos modificados:** `js/api.js`, `js/app.js`, `index.html`
**Requiere en backend:** `GET /my/sessions` y `GET /my/sessions/aggregate` — deployados en commit `90380a4`.

---

## Cambios aplicados en sesión 14/5 — fix dashboard datos históricos

### Bug fix: `_detectSession()` mostraba datos demo hardcodeados post-08:00

**Causa:** `_detectSession()` solo buscaba `status === 'active'`. Después de las 08:00
no hay sesión activa → `_sessionId = null` → dashboard mostraba datos demo del `app.js`.

**Fix (commit `c3b34e9`):**
- Si hay sesión activa → comportamiento anterior (polling cada 30s)
- Si no hay activa → usa la sesión parada más reciente con su `read_token`
- Para sesiones paradas: fetch único sin polling (los datos no cambian)

Nuevo flag `_sessionIsLive` controla si se activa el `setInterval` de 30s.

---

## Cambios aplicados en sesión 2026-05-10 — Fase D5

### Fase 21.6 — Auth0 SPA SDK ✅

Archivos nuevos:
- `js/config.js` — constantes Auth0 (dominio, client_id, audience)
- `js/auth.js` — `createAuth0Client()`, `getToken()`, `login()`, `logout()`, `initAuth()`

Cambios:
- `index.html` — overlay de login (position:fixed, z-index:100, diseño Material You); chip usuario + botón Salir en navbar; CDN Auth0 SPA JS 2.1.3; scripts config.js + auth.js
- `js/api.js` — `_apiFetch()` añade `Authorization: Bearer` en todas las requests; intercepta 401 → `login()`; `startPolling()` ya no se llama automáticamente (lo llama auth.js tras autenticación)

Flujo: al cargar → `initAuth()` → si no autenticado muestra overlay → clic "Iniciar sesión" → Auth0 redirect → callback → `handleRedirectCallback()` → `_showDashboard()` → `startPolling()`.

---

## Cambios aplicados en sesión anterior (2026-05-07)

### read_token fix ✅
`GET /session/{id}/state` requería `?token=` desde commit `62a769e` (Fase 14).
Dashboard devolvía 422 en todos los polls. Fix aplicado en `js/api.js`:
- `_detectSession()` lee `read_token` del response de `GET /sessions`
- `_poll()` pasa `?token=` en cada llamada a `/state`
- Manejo de 403 (log warning, sin crash)

### PDF button activado ✅
Botón "Snapshot PDF" habilitado con `id="btn-pdf"` y `onclick="downloadSnapshotPDF()"`.
Se habilita automáticamente cuando se detecta una sesión activa.
Llama a `GET /session/{id}/report.pdf?token=` (Fase 7b del backend).
Descarga el PDF directamente desde el navegador (blob → `<a download>`).

### Fase D1 — Panel de costos ✅
Nueva stat card "Costos" en el grid de stats (5ª columna).
`_fetchCosts()` llama `GET /session/{id}/costs?token=` en cada poll (paralelo, silencioso si falla).
Muestra `$X.XX` (costo total) y `$X.XX precio s.` (precio sugerido) — `totals.total_usd` + `totals.suggested_price_usd`.

### Fase D2 — Webhook URL ✅
`_detectSession()` extrae `active.webhook_url` de `GET /sessions`.
Chip sutil en la timebar (zona derecha), visible solo si hay webhook configurado.
URL truncada a 28 chars con tooltip completo en `title`.

### Fase D3 — Indicador sesiones anteriores (Redis) ✅
`_detectSession()` cuenta sesiones con `status !== 'active'` en `GET /sessions`.
Badge "N en historial" en el navbar (qnav-right), visible si count > 0.
Aparece tanto si hay sesión activa como si no (útil tras reinicio del contenedor).

---

## Backlog — próximas fases del dashboard

| Prioridad | Fase | Descripción | Depende de |
|---|---|---|---|
| ✅ | **Fase D1** | Costos en vivo: panel con `GET /session/{id}/costs?token=` | Backend Fase 16 ✅ |
| ✅ | **Fase D2** | Campo webhook_url en UI de nueva sesión | Backend Fase 12 ✅ |
| ✅ | **Fase D3** | Indicador de sesiones anteriores recuperadas desde Redis | Backend Fase 17 ✅ |
| ✅ | **Fase D4** | Multi-tenancy: login + aislar sesiones por cliente | Backend Fase 21 ✅ |
| ✅ | **Fase D5** | Pestaña Contrato — institución, tier, ventanas, emisoras, keywords | 2026-05-10 |
| ✅ | **Fase D6** | Vista acumulada: Resumen 30 días + ventana + navegador Señales | 2026-05-15 |
| ✅ | **Fase D7** | Arcos narrativos en Tab Señales — sparkline + filtros + detalle expandible | 2026-05-17 |
| ✅ | **Fase D8** | Rediseño estructural — nueva tab Contexto + Señales como stack vertical | 2026-05-19 |
| ✅ | **Fase D9** | Filtrar arcos y sesiones por `contract_id` (Fases backend 26/27/28) | 2026-05-20 |
| ✅ | **Fase D10** | Tab Resumen: pie chart, word cloud y sparkline desde arcos narrativos | 2026-05-21 |
| ✅ | **Fix** | Stat streams muestra emisoras del contrato en modo no-live | 2026-05-22 |
| ⏳ | **Fase D11** | Tab Contrato: mostrar `stream_windows` por emisora | Pendiente — sin datos reales en DEMO aún |
| 🔮 | **Fase D14** | Tab Red — grafo de constelaciones de arcos narrativos | Backend: `GET /my/narrative-graph` (nodos + aristas por Jaccard) |

---

### Fase D14 — Tab Red (grafo de constelaciones)

Visualización de arcos narrativos como nodos conectados por similitud semántica.

**Modelo de datos:**
- Nodo = arco (`arc_id`, `topic_key`, `current_score`, urgencia)
- Arista = Jaccard similarity entre `keywords` de dos arcos, si supera un umbral (e.g. 0.2)
- Tamaño del nodo = `current_score`; color = urgencia (mismo semáforo que barras)
- Grupos naturales = clusters por `topic_key`

**Backend requerido:** endpoint `GET /my/narrative-graph` que devuelva `{nodes, edges}`.
Cálculo O(n²) sobre `keywords` — con ~65 arcos son 2080 pares, muy rápido.
Las conexiones más fuertes son arcos que comparten `snapshot_ids` (co-ocurrencia directa en la misma ventana de monitoreo).

**Frontend:** librería de grafos force-directed (D3, vis.js o Cytoscape.js).

---

### Fase D5 — Creación de sesión ⚠️ BLOQUEADA — requiere decisiones de producto

Antes de implementar el formulario, hay una sesión de diseño de producto pendiente. Preguntas sin responder:

- **¿Quién crea la sesión?** ¿El admin configura y el cliente lanza? ¿Self-service con límites por tier? ¿Híbrido (admin define contrato, cliente opera dentro)?
- **¿Qué es un "contrato"?** Horas de monitoreo/mes, emisoras permitidas, tier de precio.
- **¿Cómo se relaciona con el precio?** El backend ya calcula `suggested_price_usd` — ¿es el precio del tier o solo referencia interna?
- **¿Una sesión = franja horaria fija o corre hasta que el cliente la detiene?**
- **¿El cliente elige las emisoras o el admin las pre-configura?**

Mientras tanto: sesiones se crean manualmente vía curl con JWT del usuario autenticado.

---

### Fase D4 — Multi-tenancy con Auth0 (Fase 21 del backend)

Login por cliente vía **Auth0** (free tier — hasta 7,500 usuarios activos/mes).
Auth0 maneja rotación de tokens, refresh automático y MFA futuro sin código adicional.

**Estado del backend (todas completadas 2026-05-08/09):**

| Etapa | Descripción | Estado |
|---|---|---|
| ~~21.1~~ ✅ | `client_id` en sesiones + filtrado `GET /sessions` | 2026-05-08 |
| ~~21.2~~ ✅ | Auth0: tenant + aplicación + API identifier configurados | 2026-05-08 |
| ~~21.3~~ ✅ | Backend: `verify_auth()` unificado — JWT RS256 o API_KEY | 2026-05-08 |
| ~~21.4~~ ✅ | Aislamiento estricto: `GET /sessions` + `/state` filtrados por cliente | 2026-05-08 |
| ~~21.5~~ ✅ | Gestión de clientes: `POST/GET/PATCH/DELETE /admin/clients` + Redis | 2026-05-09 |
| ~~21.6~~ ✅ | Dashboard: Auth0 SPA SDK — login flow, token en headers | 2026-05-09 |

---

### Fase 21.6 — Detalle de implementación en el dashboard

**Contexto de cambios en la API que afectan al dashboard:**

Desde Fase 21.3–21.4, la API en modo JWT exige `Authorization: Bearer <token>` en:
- `GET /sessions` — antes público, ahora requiere Bearer y auto-filtra por `client_id`
- `GET /session/{id}/state?token=` — sigue requiriendo `?token=` + ahora también Bearer
- `GET /session/{id}/costs?token=` — igual
- `GET /session/{id}/report.pdf?token=` — igual

El `read_token` sigue existiendo y sigue siendo necesario para los 3 endpoints públicos.
No hay que eliminarlo: con JWT activo, `GET /sessions` solo devuelve sesiones del cliente
autenticado, así que `read_token` en la respuesta no filtra datos de otros clientes.

**Credenciales Auth0 que el dashboard necesita (client-side):**

| Variable | Valor | Dónde |
|---|---|---|
| `AUTH0_DOMAIN` | `dev-h6rqtclj6hyrv000.us.auth0.com` | `js/auth.js` o `config.js` |
| `AUTH0_CLIENT_ID` | `9V473qyN6yuFDVnFYeA6yQWXTESAz3DQ` | ídem |
| `AUTH0_AUDIENCE` | `https://api.qontexto.com` | ídem (para que el token sea aceptado por la API) |

Como no hay build step (Vanilla JS), estas constantes van directamente en un archivo
`js/config.js` que se carga antes que el SDK.

**Sub-tareas:**

| Sub-fase | Archivo | Descripción |
|---|---|---|
| **21.6.1** | `index.html` | Cargar Auth0 SPA JS desde CDN (`@auth0/auth0-spa-js`) + nuevo `<script src="js/config.js">` + `<script src="js/auth.js">` |
| **21.6.2** | `js/config.js` (nuevo) | Constantes `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_AUDIENCE` |
| **21.6.3** | `js/auth.js` (nuevo) | Inicializar `createAuth0Client()`; al cargar: `isAuthenticated()` → si no, mostrar pantalla de login; manejar callback con `handleRedirectCallback()` |
| **21.6.4** | `index.html` | Pantalla de login: overlay o sección visible solo cuando no autenticado (logo + botón "Iniciar sesión") |
| **21.6.5** | `js/auth.js` | `getTokenSilently()` exportado como `getToken()` — el SDK hace refresh automático |
| **21.6.6** | `js/api.js` | Añadir `Authorization: Bearer <token>` en **todas** las requests (`_apiFetch()` centraliza esto); eliminar `?client_id=` del `GET /sessions` (ya no es necesario, el backend lo filtra del JWT) |
| **21.6.7** | `js/api.js` | Interceptar 401 → llamar `auth.loginWithRedirect()`; interceptar 403 → mostrar toast "Acceso denegado" |
| **21.6.8** | `index.html` / `js/auth.js` | UI: chip con nombre de usuario + botón "Cerrar sesión" (`auth.logout()`) en `qnav-right` |
| **21.6.9** | — | Test en `localhost:3000` con usuario real de Auth0 |
| **21.6.10** | Vultr | Deploy: `git pull && docker compose up -d --build` en `/opt/qontexto-dashboard` |

**Flujo completo esperado tras 21.6:**

```
Usuario abre qontexto.com
  └─ auth.js: isAuthenticated() → false
       └─ Mostrar overlay de login (logo + botón)
            └─ Click "Iniciar sesión"
                 └─ loginWithRedirect() → Auth0
                      └─ Auth0 autentica → redirect a qontexto.com/callback
                           └─ handleRedirectCallback() → token guardado en SDK
                                └─ Dashboard carga; getTokenSilently() en cada request
                                     └─ API responde con sesiones del cliente
```

**Nota sobre `read_token`:**
El `read_token` sigue siendo necesario para `/state`, `/costs`, `/report.pdf`.
El dashboard lo sigue extrayendo de `GET /sessions` (ahora protegido con Bearer)
y lo pasa como `?token=` en los polls. No hay cambio en esa lógica.

**Archivos a tocar:**
- `index.html` — 3 `<script>` tags nuevos, overlay de login, chip de usuario
- `js/config.js` — nuevo (constantes Auth0)
- `js/auth.js` — nuevo (wrapper sobre Auth0 SPA SDK)
- `js/api.js` — `_apiFetch()` con Bearer + interceptores 401/403

⚠️ **No afecta** a `js/charts.js`, `js/ui.js` ni ningún archivo de visualización.

---

## Fases completadas

### Fase 13 — Dashboard Qontexto ✅ (2026-05-04 → 2026-05-05)

| Subfase | Descripción | Estado |
|---|---|---|
| 13.1 | Proyecto base — estructura, CSS, shell estático con Docker | ✅ 2026-05-04 |
| 13.2 | Conexión API — sesión activa, poll 30s, stat cards | ✅ 2026-05-04 |
| 13.3 | Card Narrativas — pie chart dinámico, veredictos | ✅ 2026-05-04 |
| 13.4 | Card Voces — word cloud dinámico | ✅ 2026-05-04 |
| 13.5 | Card Momento — sparkline dinámico, pill de tendencia | ✅ 2026-05-04 |
| 13.6 | Tab Señales — timeline, análisis narrativo, emisoras | ✅ 2026-05-04 |
| 13.7 | Deploy en qontexto.com | ✅ 2026-05-05 |

---

## Correcciones aplicadas en narrative-intelligence que impactan el dashboard

| Fecha | Commit | Descripción | Acción requerida |
|---|---|---|---|
| 2026-05-05 | `62a769e` | `read_token` en `GET /session/{id}/state` | ✅ Aplicado en api.js |
| 2026-05-05 | `230f529` | label en streams_monitored | — transparente |
| 2026-05-06 | `de2d717` | CostMeter: `GET /session/{id}/costs` disponible | → Fase D1 |
| 2026-05-06 | `8d4948b` | Webhook saliente por sesión | → Fase D2 |
| 2026-05-06 | `5010ba8` | PDF renderer: `GET /session/{id}/report.pdf` | ✅ Aplicado en api.js + index.html |
| 2026-05-06 | `1853b80` | Redis state backend | — transparente |
| 2026-05-06 | `0a85d92` | Redis TTL: sesiones stopped expiran en SESSION_RETAIN_DAYS días | — transparente |
| 2026-05-06 | (este commit) | Fix RuntimeWarning tests + `_KILL_TIMEOUT_S` constant | — no impacta dashboard |

---

## Decisiones de arquitectura

### Dos contenedores en Vultr
```
nginx (host, 64.176.16.172)
  ├── qontexto.com      → contenedor frontend  (puerto 3000)
  └── api.qontexto.com  → contenedor API        (puerto 8000)
```
Cada repo tiene su propio `docker-compose.yml`. Se despliegan de forma independiente.

### CORS
`CORSMiddleware` habilitado en `narrative-intelligence/src/api/server.py`
para `https://qontexto.com` y `http://localhost:3000`. Implementado en 13.2.

### read_token — seguridad y sesiones detectadas automáticamente
`GET /sessions` devuelve `read_token` en cada sesión. El dashboard lo lee al
detectar la sesión activa y lo usa para todos los polls y el PDF.
⚠️ En multi-tenancy (Fase D4) hay que excluir `read_token` de `GET /sessions`
y requerir autenticación por cliente.

### Sin frameworks
Vanilla HTML/CSS/JS para minimizar dependencias y facilitar el mantenimiento.
Chart.js (CDN) solo para pie chart y sparkline.
Word cloud: CSS puro con posicionamiento absoluto.
