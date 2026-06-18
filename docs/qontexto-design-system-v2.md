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

---

## 2. Tipografía

Sin cambios respecto a v1.5. Dos familias únicas.

```css
/* Carga en index.html */
@import url('https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@300..700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
```

| Variable | Familia | Uso |
|---|---|---|
| `--font` | Google Sans Flex | Todo el dashboard |
| `--mono` | JetBrains Mono | IDs, timestamps, valores numéricos, `<code>` |

### Escala tipográfica

| Rol | Tamaño | Peso | Uso |
|---|---|---|---|
| Display | 26px | 500 | Valores KPI en stat cards |
| Title | 15px | 500 | Nombre del producto, títulos de sección |
| Body | 13px | 400 | Contenido de cards, análisis narrativo |
| Body Strong | 13px | 500 | Veredictos, conclusiones destacadas |
| Label | 11px | 400 | Labels de componente |
| Caption | 10–11px | 400 | Footers, metadata, notas |
| Micro | 10px | 500 | Chips de urgencia, badges (uppercase) |

---

## 3. Sistema de color

### 3.1 Principio v2 — color = identidad de tema, no urgencia

Este es el cambio central de v2 respecto a v1.5.

**v1.5:** el color codificaba urgencia. Rojo = crítico, ámbar = emergiendo, verde = estable.
**v2:** el color codifica identidad. Coral = Fraude electoral, Teal = Movilización, etc.

La urgencia sigue presente pero usa canales secundarios (fondo tintado, chip de texto). El dot, el borde lateral y el sparkline de cualquier elemento narrativo usan el color de su tema — no el de su urgencia.

**Por qué:** en períodos de alta tensión, todo el dashboard se vuelve rojo y pierde poder discriminatorio. El analista no puede distinguir entre narrativas cuando todas son críticas. Con color por identidad, el color dice QUÉ está pasando, no solo cuán grave es.

### 3.2 Variables CSS del sistema actual

Definidas en `css/tokens.css`. Este es el sistema en producción — no ha migrado a MDUI.

```css
:root {
  /* Fondos */
  --bg:       #EFEDE6;   /* fondo global */
  --surface:  #FAFAF7;   /* cards, inputs */
  --surface2: #EDEAE2;   /* fondos secundarios, chips, filtros */
  --border:   rgba(0,0,0,0.07);

  /* Texto */
  --text1:    #1C1C1A;   /* texto primario */
  --text2:    #5C5A52;   /* texto secundario */
  --text3:    #9C9A90;   /* texto terciario, labels, metadata */

  /* Tipografía */
  --font:     'Google Sans Flex', sans-serif;
  --mono:     'JetBrains Mono', ui-monospace, monospace;
}

[data-theme="dark"] {
  --bg:       #111110;
  --surface:  #1C1C1A;
  --surface2: #252522;
  --border:   rgba(255,255,255,0.07);
  --text1:    #EEECEA;
  --text2:    #9A9890;
  --text3:    #5A5852;
}
```

### 3.3 Identidad cromática por tema

Los temas con `importance_score ≥ 0.60` reciben un color de identidad. Los demás son grises.
La asignación es por ranking de score — el tema de mayor score recibe el primer color.

**Máximo 4 temas con color.** Los temas adicionales con score ≥ 0.60 reciben gris hasta el próximo ciclo de evaluación.

```css
:root {
  --q-cluster-1:    #993C1D;  /* coral   — rgb(216,90,48)   */
  --q-cluster-2:    #534AB7;  /* purple  — rgb(127,119,221) */
  --q-cluster-3:    #0F6E56;  /* teal    — rgb(29,158,117)  */
  --q-cluster-4:    #854F0B;  /* amber   — rgb(186,117,23)  */
  --q-cluster-none: #5F5E5A;  /* gris neutro — sin tema asignado */
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

Sin cambios respecto a v1.5.

| Componente | Border-radius |
|---|---|
| Cards (`.qcard`, `.qstat`) | 16px |
| Inputs, selects, chips | 8px |
| Chips de estado / pills | 20px (full) |
| Barras laterales de identidad | 2–3px, border-radius: 2px |

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
Lista vertical (no grid). Escala a cualquier número de radios sin overflow.

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

*● Qontexto · Sistema de Diseño v2.0 · qontexto.com*
