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

| TYPE ROLE M3 | NOMBRE QONTEXTO | TAMAÑO | PESO | USO |
|---|---|---|---|---|
| `display-large` | Slogan / Portada | 40px | 300 | Google Sans Light |
| `title-large` | Título narrativo | 18px | 400 | Narrativa dominante, encabezados de sección |
| `title-medium` | Título de sección | 16px | 500 | Subtítulos de card, títulos de módulo |
| `body-medium` | Cuerpo narrativo | 13px | 400 | Análisis, alertas, recomendaciones |
| `body-small` | Cuerpo secundario | 12px | 400 | Descripción de apoyo, sublabels |
| `label-small` | Label de tarjeta | 10px | 500 | UPPERCASE con tracking — NARRATIVA · STREAMS |
| `label-medium` | Label de chip/badge | 11px | 500 | Chips, badges, estados |

**Tipografía numérica — fuera del type scale M3:**

| Clase | Tamaño | Uso |
|---|---|---|
| `.q-score-value` | 22px / 400 | Valores de score — 0.81 / 1.0 |
| `.q-numeric` | 13px / 400 | Contadores, valores en tabla |
| `.q-timestamp` | 10px / 400 | Timestamps — 14:32 PE |

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
mdui.setColorScheme('#C4522A');  // Terra — genera el palette M3 completo
```

Esto genera automáticamente todos los `--mdui-color-*` en ambos modos. No se necesita `css/qontexto-tokens.css` con overrides manuales.

**Bridge de compatibilidad (`css/tokens.css`):**
```css
:root {
  --bg:      rgb(var(--mdui-color-surface-container-lowest));
  --surface: rgb(var(--mdui-color-surface-container));
  --surface2:rgb(var(--mdui-color-surface-container-high));
  --border:  rgb(var(--mdui-color-outline-variant));
  --text1:   rgb(var(--mdui-color-on-surface));
  --text2:   rgb(var(--mdui-color-on-surface-variant));
  --text3:   rgb(var(--mdui-color-on-surface-variant) / 0.6);
  --font:    'Google Sans Flex', var(--mdui-typescale-body-medium-font);
  --mono:    'JetBrains Mono', ui-monospace, monospace;
}
/* Dark mode gestionado por MDUI vía atributo mdui-theme — eliminar [data-theme="dark"] */
```

**Cambio de tema (JS en `app.js`):**
```js
// v1 (eliminar):
document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

// v2 (MDUI):
document.documentElement.setAttribute('mdui-theme', isDark ? 'dark' : 'light');
```

**Palette resultante:** temperatura rosada/terracota desde Terra — warm pinkish en light, rojo-negro en dark. El algoritmo M3 HCT garantiza armonía cromática con los colores de identidad de temas (`--q-cluster-*`), que permanecen como valores manuales.

### 3.3 Identidad cromática por tema

Los temas con `importance_score ≥ 0.60` reciben un color de identidad. Los demás son grises.
La asignación es por ranking de score — el tema de mayor score recibe el primer color.

**Máximo 4 temas con color.** Los temas adicionales con score ≥ 0.60 reciben gris hasta el próximo ciclo de evaluación.

Los tokens `--q-cluster-*` se añaden al archivo `css/tokens.css` junto al bridge MDUI. El dark mode usa `[mdui-theme="dark"]` para ser consistente con el sistema de temas de MDUI 2.

```css
/* En css/tokens.css — junto al bridge MDUI */
:root {
  --q-cluster-1:    #993C1D;  /* coral   — rgb(216,90,48)   */
  --q-cluster-2:    #534AB7;  /* purple  — rgb(127,119,221) */
  --q-cluster-3:    #0F6E56;  /* teal    — rgb(29,158,117)  */
  --q-cluster-4:    #854F0B;  /* amber   — rgb(186,117,23)  */
  --q-cluster-none: #5F5E5A;  /* gris neutro — sin tema asignado */
}

[mdui-theme="dark"] {
  --q-cluster-1:    #C4583A;  /* coral más claro sobre fondo oscuro */
  --q-cluster-2:    #7B72D4;  /* purple más claro */
  --q-cluster-3:    #1A9A78;  /* teal más claro */
  --q-cluster-4:    #B87A1A;  /* amber más claro */
  --q-cluster-none: #8A8880;  /* gris más claro */
}
```

**Regla de aplicación:**

| Elemento | Canal de color |
|---|---|
| Dot de historia o mención | Color del tema |
| Borde izquierdo de fila (3px) | Color del tema |
| Sparkline inline | Color del tema |
| Burbuja en Tab Temas | Color del tema |
| Label del tema (texto) | Color del tema (opacidad plena) |
| Background de card o fila | Nunca el color del tema directamente |

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

**Bubble chart SVG (hero)**
- Una burbuja por tema activo
- Tamaño = `importance_score`
- Color = identidad del tema (`--q-cluster-N`)
- Label = nombre del tema
- Hebras bezier hacia nodos de región (Arequipa, Cajamarca, etc.)
- 1 hebra = 5 historias activas en esa región · máximo 4 hebras por región
- Interacción: clic en burbuja → selecciona el tema → activa el panel de rationale

**Panel de rationale** (al seleccionar un tema)
- Barra lateral izquierda en color del tema
- Nombre del tema (en color del tema)
- Chip "N historias" con borde del color del tema
- Chip de urgencia neutro
- Texto de rationale (generado por Haiku, consume campo `rationale` de `GET /my/summary`)

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
Cada fila de historia recibe el color de su tema en tres lugares:
- Barra lateral izquierda (3px)
- Dot de status
- Sparkline inline

La urgencia (Escalando / Activo / Dormido) pasa a ser chip de texto neutro.

**Anatomía de fila:**
```
[barra 3px, color tema] [dot, color tema] [nombre del tema — color tema]
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

## 7. Pendientes de implementación

### `qontexto-dashboard`

| Prioridad | Tarea | Depende de |
|---|---|---|
| 1 | Renombrar tabs: Resumen→Temas, Contexto→Historias, Señales→Menciones | — |
| 2 | Vocabulario global: buscar/reemplazar "cluster"→"tema", "arcos"→"historias", "señales"→"menciones" en JS y HTML | — |
| 3 | Añadir variables `--q-cluster-1..4` y `--q-cluster-none` a `css/tokens.css` | — |
| 4 | Estilizar `<code>` del contract ID (Tab Contrato): `font-mono` + fondo + borde | — |
| 5 | Tab Contrato: lista de radios con chip "Ventana propia" / "Hereda del contrato" | — (datos ya disponibles) |
| 6 | Tab Historias: color de identidad en dot, borde izquierdo y sparkline | — (datos ya disponibles) |
| 7 | Tab Historias: dropdown de tema con dots de color | — (datos ya disponibles) |
| 8 | Tab Temas: implementación completa | Backend #1, #2, #3 y #4 |
| 9 | Tab Menciones: dot de evento en color de tema | Backend #5 |
| 10 | Tab Menciones: cards de radio con dots de tema | Backend #5 |

### `narrative-intelligence`

| Prioridad | Tarea | Complejidad |
|---|---|---|
| 1 | Añadir `score_trajectory` a `GET /my/summary` → `narrativas[].score_trajectory` | Baja — ya disponible en `_rank_clusters()` via `db_assessment.get("signals")`, solo exponerlo |
| 2 | Añadir `trend_label` a `GET /my/summary` → `narrativas[].trend_label` | Baja — campo derivado de `score_trajectory`, requiere #1 |
| 3 | Añadir `unique_regions` a `GET /my/summary` → `narrativas[].unique_regions` | Baja — exponer dato ya existente en `cluster_assessments.signals` |
| 4 | Añadir `series` a `GET /my/summary` → `narrativas[].series` | Baja — `history` ya se computa en `_rank_clusters()`, solo exponerlo con rango completo y sin zeros |
| 5 | Añadir `cluster_name` a `report_state.alerts[]` | Media — match por overlap de keywords entre alerta y arcos activos |

---

## 8. Inventario de cambios en `js/api.js`

### 8.1 Código muerto a eliminar

Al eliminar los cards Narrativas / Voces / Momento del Tab Resumen, las siguientes funciones y constantes quedan sin referencias activas y deben eliminarse:

| Elemento | Motivo |
|---|---|
| `_maxUrgency` | Solo usada en `_buildNarrativeItems`, `_buildNarrativeItemsFromArcs` y `_buildVocesItems` — todas eliminadas |
| `_URGENCY_ORDER` | Solo usada en `_maxUrgency` |
| `_updateResumenFromArcs` | Código muerto hoy — ninguna ruta activa lo llama |
| `_SEV_TO_URGENCY` | Definida pero nunca usada |
| `_buildNarrativeItems` | Card Narrativas eliminado |
| `_buildNarrativeItemsFromArcs` | Card Narrativas eliminado |
| `_updateNarrativasCard` | Card Narrativas eliminado |
| `_buildVeredicto` (función snapshot) | El veredicto en v2 viene directo de `summary.veredicto` |
| `_buildVocesItems` | Card Voces eliminado |
| `_updateVocesCard` | Card Voces eliminado |
| `_detectTrend` | Card Momento eliminado |
| `_buildSparklineData` | Card Momento eliminado |
| `_updateMomentoCard` | Card Momento eliminado |
| `_updateNarrativasFromSummary` | Reemplazado por bubble chart |
| `_updateVocesFromSummary` | Card Voces eliminado |
| `_updateMomentoFromSummary` | Reemplazado por Tendencia de temas |
| `_TREND_CHIP` | Solo usada en `_updateNarrativasFromSummary` |
| `_TREND_TO_COLOR` | Solo usada en `_updateMomentoFromSummary` |
| `_TONE_URGENCY` | Solo usada en `_buildVocesItems` |
| `_WC_SLOTS`, `_WC_SIZES`, `_WC_WEIGHTS` | Word cloud eliminado |
| `_TREND_CONFIG` | Solo usada en funciones de Momento y `_updateResumenFromArcs` |

### 8.2 Cambio de firma — `_drawSparkline`

Actualmente infiere el color del score (`last >= 0.7 → rojo`). En v2 debe recibir el hex del cluster como parámetro:

```
_drawSparkline(canvas, data, clusterHex)
```

El `clusterHex` viene del color map `_clusterHexMap[arc.cluster_name]` al renderizar cada fila de historia.

### 8.3 Dark mode — re-render de SVG y sparklines

`toggleTheme()` en `app.js` actualmente solo actualiza el atributo CSS y llama `sparkRef.update()`. En v2, como el bubble chart SVG y los `<polyline>` de sparkline usan valores hex inline (no CSS vars), el toggle de tema requiere tres pasos adicionales:

1. Reconstruir `_clusterHexMap` con los nuevos hex de dark mode (leer las vars `--q-cluster-N` del nuevo tema)
2. Re-renderizar el SVG del bubble chart
3. Re-renderizar la lista de historias (para actualizar sparklines y dots)

### 8.4 Mecanismo de re-render al llegar el summary

Al final de `_buildClusterColorMap()`, si `_allArcs.length > 0`, llamar `_renderNarrativeArcs(_allArcs)` para que los arcos ya cargados reciban sus colores de tema sin necesidad de un nuevo fetch.

### 8.5 `resetAllFilters` — dropdown custom

`resetAllFilters()` actualmente referencia `document.getElementById('cluster-select').value = ''`. Con el dropdown custom de tema este selector cambia. El reset debe limpiar el estado interno del dropdown custom y su label visible, además del valor de filtro.

### 8.6 Fallback obsoleto en `_updateClusterDropdown`

Las líneas con 5 clusters hardcodeados como fallback "hasta que el backend implemente /my/cluster-names" pueden eliminarse. El endpoint `GET /my/cluster-names` ya está implementado y funciona.

### 8.8 `surfaceColor()` y `tickColor()` en `app.js`

Las funciones `surfaceColor()` (línea 8) y `tickColor()` (línea 9) devuelven hex hardcodeados del palette anterior — `#1C1C1A` y `#FAFAF7`. Son los colores de fondo y ejes del Chart.js del trend chart.

Con MDUI esos valores cambiarán según el palette algorítmico. Deben leer desde los tokens computados post-MDUI:

```js
// v1 (eliminar):
function surfaceColor() { return isDark ? '#1C1C1A' : '#FAFAF7'; }
function tickColor()    { return isDark ? '#9A9890' : '#5C5A52'; }

// v2 — leer token computado después de que MDUI aplique el palette:
function surfaceColor() {
  return getComputedStyle(document.documentElement)
    .getPropertyValue('--bg').trim();
}
function tickColor() {
  return getComputedStyle(document.documentElement)
    .getPropertyValue('--text3').trim();
}
```

Estas funciones se llaman en el momento de renderizar el chart — si MDUI ya cargó y aplicó `setColorScheme`, el valor computado refleja el palette correcto.

Añadir a `css/app.css` las clases para el dropdown custom:

```css
.qdd-wrap     { position:relative; display:inline-block; }
.qdd-btn      { /* mismo estilo que inputs existentes */ }
.qdd-menu     { position:absolute; top:calc(100% + 4px); left:0;
                background:var(--surface); border:.5px solid var(--border);
                border-radius:10px; padding:4px; z-index:10; display:none;
                min-width:200px; }
.qdd-menu.open { display:block; }
.qdd-opt      { display:flex; align-items:center; gap:8px;
                padding:7px 10px; border-radius:8px;
                font-size:12px; cursor:pointer; color:var(--text2); }
.qdd-opt:hover { background:var(--surface2); }
.qdd-opt.sel  { background:var(--surface2); color:var(--text1); font-weight:500; }
```

---

*● Qontexto · Sistema de Diseño v2.0 · qontexto.com*
