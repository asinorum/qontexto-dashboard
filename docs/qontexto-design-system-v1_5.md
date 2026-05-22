# Qontexto · Sistema de Diseño v1.5
### Material You Edition

> Este documento establece las bases visuales de Qontexto bajo Material Design 3 (Material You).
> Define tipografía, color roles, shape, elevation, motion, tokens CSS e implementación MDUI 2
> para dashboards, reportes PDF y materiales de comunicación.
>
> **v1.5** — Sistema semáforo de urgencia restaurado y formalizado como sistema de comunicación de decisiones independiente del sistema tonal M3: 4 niveles fijos (`--q-urgency-critical/high/medium/low`), valores absolutos invariantes entre temas. Distinción explícita entre urgencia narrativa (semáforo), estado operativo (success/warning) y errores de sistema (`--mdui-color-error`). Score card y alert banner migrados a tokens de urgencia.
>
> **v1.4** — Correcciones de implementación: hex values válidos, sintaxis `rgb()` con canal alfa, tokens de shape con prefijo `-corner-`, namespace `--q-color-*`, borde `outline-variant`, logo dot fijo Terra, override de shape por selector, `--mdui-color-surface` base, escala tipográfica completa, tokens manuales como estrategia definitiva.
>
> **v1.3** — Migración completa a Material You (MDUI 2). Color roles M3. Shape system. State layers. Motion tokens.

---

## 0. Principio rector y público objetivo

> **"El director no piensa en porcentajes — piensa en veredictos."**

El usuario primario no es el consumidor final del insight — es el **courier del insight**. Toma pantallazos. El directorio decide. Cada card debe funcionar como una diapositiva autónoma con conclusión incorporada. Sin el dashboard alrededor, el card sigue teniendo sentido completo.

Este principio no es una preferencia estética. Es la restricción de diseño más fuerte del sistema: determina la jerarquía de información, el sistema semáforo, los veredictos en lugar de porcentajes, y el límite de 4 narrativas con color. Toda decisión de diseño que no sirva a este principio está justificando su existencia en el lugar equivocado.

---

### 0.1 Público objetivo

#### Primario — Analista de Inteligencia Mediática

Trabaja en medios, consultoras políticas, agencias de PR, organismos gubernamentales o corporaciones con presencia regional. Su flujo:

**genera el análisis → toma pantallazos → los presenta al director → el director decide.**

Opera el dashboard. Conoce la herramienta. Puede leer la densidad de datos del tab Señales. Su necesidad es que los pantallazos que toma sean autoexplicativos para alguien que no estuvo en la sesión.

#### Secundario — Director de Comunicaciones

No opera la herramienta. Aprueba la compra. Toma decisiones de crisis. Necesita un dashboard que le diga qué narrativa está ganando terreno **antes de que sea tendencia**. Su atención es de 5 segundos por card.

No lee tooltips. No interpreta ejes. Lee color + etiqueta y toma una decisión. Si necesita leer el número para entender el card, el card falló.

---

### 0.2 Consecuencias de diseño

Cada regla técnica de este documento deriva del principio rector y del modelo de uso:

| REGLA | DERIVA DE |
|---|---|
| Veredictos en lugar de scores (`Alerta máxima`, no `0.81`) | El director no interpreta — decide |
| Semáforo con 4 niveles fijos e invariantes | 5 segundos de atención · el color es el mensaje |
| Máximo 4 narrativas con color, resto en "Otros" | La paleta semántica no puede diluirse |
| Cada card con conclusión textual antes del gráfico | El pantallazo debe funcionar sin el dashboard |
| Nunca scores numéricos expuestos al director | Los porcentajes son del analista, no del director |
| Gramática visual consistente en los 3 cards | El director aprende una vez y lee todo |

---

### 0.3 Lo que nunca hacemos

Estas prohibiciones son consecuencias directas del principio rector. No son preferencias de estilo — son restricciones de comunicación. Violarlas no produce un dashboard menos bonito, produce un dashboard que falla en su función.

- ❌ **Mostrar porcentajes como dato principal** — el director no interpreta distribuciones, decide sobre veredictos
- ❌ **Usar colores sin significado semántico** — azul, púrpura, cualquier color que no sea del semáforo o de marca no tiene cabida en elementos de datos
- ❌ **Asignar color por volumen en lugar de urgencia** — un slice pequeño puede ser rojo; un slice grande puede ser verde; el tamaño y el color son dimensiones independientes
- ❌ **Cards sin conclusión textual** — el gráfico nunca habla solo; la conclusión siempre precede al visual
- ❌ **Más de 4 narrativas con color en el mismo gráfico** — las adicionales van en "Otros" con color neutro; la paleta semántica no se diluye
- ❌ **Eje Y visible en el sparkline** — la forma de la curva comunica la tendencia; el número exacto es ruido para el director
- ❌ **Números internos del sistema visibles al usuario** — `score 0.22` es del pipeline; el usuario ve `Estable`
- ❌ **Labels genéricos** — nunca ¿Qué? / ¿Cómo? / ¿Cuándo?; siempre **Narrativas / Voces / Momento**

---

## 1. Tipografía

La tipografía de Qontexto está fija en dos familias. Esta decisión no cambia entre versiones del sistema.

| ROL | FAMILIA | FUENTE Y LICENCIA |
|---|---|---|
| **Principal** | **Google Sans** — UI, narrativa, wordmark, labels | Google Fonts · OFL |
| **Numérica** | **JetBrains Mono** — scores, contadores, timestamps | Google Fonts · OFL |
| **Fallback Word/PDF** | **Arial** — documentos exportados únicamente | Sistema operativo |

Google Sans es la fuente de referencia de Material Design 3. Su uso como fuente principal hace que Qontexto sea nativa a Material You sin necesidad de adaptación.

---

### 1.1 Escala tipográfica — Mapeo a M3 Type Roles

Material You define 15 type roles. Qontexto usa 7 de ellos, ajustados a tamaños compactos para dashboards de datos densos.

| TYPE ROLE M3 | NOMBRE QONTEXTO | TAMAÑO | PESO | USO |
|---|---|---|---|---|
| `display-large` | Slogan / Portada | 40px | 300 | Google Sans Light — "La radio no espera." |
| `title-large` | Título narrativo | 18px | 400 | Narrativa dominante, encabezados de sección |
| `title-medium` | Título de sección | 16px | 500 | Subtítulos de card, títulos de módulo |
| `body-medium` | Cuerpo narrativo | 13px | 400 | Análisis, alertas, recomendaciones |
| `body-small` | Cuerpo secundario | 12px | 400 | Descripción de apoyo, sublabels |
| `label-small` | Label de tarjeta | 10px | 500 | UPPERCASE con tracking — NARRATIVA · STREAMS |
| `label-medium` | Label de chip/badge | 11px | 500 | Chips, badges, estados |

**Tipografía numérica — fuera del type scale M3:**
JetBrains Mono no forma parte del type scale de Material You. Se aplica mediante clases helper `.q-numeric`, `.q-score-value`, `.q-timestamp` directamente en los componentes que lo requieren.

| CLASE | TAMAÑO | USO |
|---|---|---|
| `.q-score-value` | 22px / 400 | Valores de score grande — 0.81 / 1.0 |
| `.q-numeric` | 13px / 400 | Contadores, valores en tabla |
| `.q-timestamp` | 10px / 400 | Timestamps — 14:32 PE · últimos 30 min |

**Token CSS de fuentes — los 7 roles activos:**

Los 7 roles usados por Qontexto se declaran explícitamente. Los 8 roles M3 restantes no se sobreescriben y usan los defaults de MDUI (Roboto). Esto es intencional: en v1.4 no hay pantallas que los activen; se revisará en v1.5 si se incorporan dialogs o componentes adicionales.

```css
/* display-large — Slogan / Portada */
--mdui-typescale-display-large-font:   "Google Sans", Arial, sans-serif;
--mdui-typescale-display-large-size:   40px;
--mdui-typescale-display-large-weight: 300;
--mdui-typescale-display-large-line-height: 1.1;
--mdui-typescale-display-large-tracking: -0.01em;

/* title-large — Título narrativo */
--mdui-typescale-title-large-font:   "Google Sans", Arial, sans-serif;
--mdui-typescale-title-large-size:   18px;
--mdui-typescale-title-large-weight: 400;
--mdui-typescale-title-large-line-height: 1.4;

/* title-medium — Título de sección */
--mdui-typescale-title-medium-font:   "Google Sans", Arial, sans-serif;
--mdui-typescale-title-medium-size:   16px;
--mdui-typescale-title-medium-weight: 500;
--mdui-typescale-title-medium-line-height: 1.4;

/* body-medium — Cuerpo narrativo */
--mdui-typescale-body-medium-font:   "Google Sans", Arial, sans-serif;
--mdui-typescale-body-medium-size:   13px;
--mdui-typescale-body-medium-weight: 400;
--mdui-typescale-body-medium-line-height: 1.55;

/* body-small — Cuerpo secundario */
--mdui-typescale-body-small-font:   "Google Sans", Arial, sans-serif;
--mdui-typescale-body-small-size:   12px;
--mdui-typescale-body-small-weight: 400;
--mdui-typescale-body-small-line-height: 1.5;

/* label-medium — Label de chip/badge */
--mdui-typescale-label-medium-font:   "Google Sans", Arial, sans-serif;
--mdui-typescale-label-medium-size:   11px;
--mdui-typescale-label-medium-weight: 500;
--mdui-typescale-label-medium-line-height: 1;

/* label-small — Label de tarjeta */
--mdui-typescale-label-small-font:    "Google Sans", Arial, sans-serif;
--mdui-typescale-label-small-size:    10px;
--mdui-typescale-label-small-weight:  500;
--mdui-typescale-label-small-tracking: 0.1em;
--mdui-typescale-label-small-line-height: 1;
```

---

## 2. Logo y marca

El logo es un wordmark tipográfico en Google Sans con un punto circular (●) en Terra. El punto es el elemento de identidad primario — señal de "al aire" universal en radio.

*"La radio no espera."* es el slogan de Qontexto. Aparece como tagline bajo el wordmark en materiales de cara al cliente.

### 2.1 Variantes

| VARIANTE | CONTEXTO |
|---|---|
| **Claro** | Reportes PDF, materiales sobre fondo blanco o crema |
| **Oscuro** | Dashboard, nav, presentaciones sobre fondo oscuro |
| **Institucional** | Solo fondo blanco. Gobierno u organismos formales. |
| **Mínima** | Favicon, notificación push, corner de gráfico exportado |

### 2.2 El punto como identidad

El punto (●) es identidad de marca fija. **Su color es siempre Terra `#C4522A`, independientemente del tema.** Esta es una excepción deliberada al sistema tonal de M3: el punto de identidad no se adapta al tema porque es el ancla de reconocimiento de marca.

> **Nota sobre M3:** En dark mode, `--mdui-color-primary` toma el valor tonal claro (`#FFB494` — melocotón pálido). Si se usara `rgb(var(--mdui-color-primary))` en dark mode, el logo dot se vería desaturado y no reconocible como Terra. Por eso se fija con valor absoluto.

```css
/* El punto del logo siempre es Terra — no sigue el sistema tonal */
.qlogo-dot,
.qsnap-dot {
  background-color: #C4522A;
}
```

---

## 3. Color — Material You Color Roles

Material Design 3 organiza el color en **roles**, no en valores aislados. Cada rol tiene una función semántica dentro de la interfaz. Qontexto mapea su paleta de marca a estos roles usando Terra como seed color.

> **Regla crítica:** Terra (`#c4522a`) es color de marca exclusivamente — punto del logo, CTAs, enlaces activos. El token `--mdui-color-primary` canaliza Terra. **Nunca** usar primary en el sistema semántico de alertas. El color de alerta alta es Rojo Semántico (`#b03a2e`) → `--mdui-color-error`.

---

### 3.1 Color Roles — Capa de marca (Primary)

Seed color: **Terra `#c4522a`**

| TOKEN CSS | HEX (DARK) | HEX (LIGHT) | USO |
|---|---|---|---|
| `--mdui-color-primary` | `#FFB494` | `#C4522A` | Punto del logo, CTAs, FAB, botones primarios |
| `--mdui-color-on-primary` | `#691E00` | `#FFFFFF` | Texto/ícono sobre primary |
| `--mdui-color-primary-container` | `#8C3614` | `#FFDBCC` | Fondo suave de chips activos, badges |
| `--mdui-color-on-primary-container` | `#FFDBCC` | `#691E00` | Texto sobre primary-container |

**Nota de implementación:** Los valores dark son los que usa el dashboard. Los valores light aplican en reportes PDF y vista institucional.

---

### 3.2 Color Roles — Capa secundaria (Secondary)

Derivado de Terra desaturado para jerarquía secundaria.

| TOKEN CSS | HEX (DARK) | HEX (LIGHT) | USO |
|---|---|---|---|
| `--mdui-color-secondary` | `#D2B4A3` | `#785444` | Tabs inactivos, toggles, chips secundarios |
| `--mdui-color-on-secondary` | `#412519` | `#FFFFFF` | Texto sobre secondary |
| `--mdui-color-secondary-container` | `#5A3A2C` | `#FFDBCC` | Fondo de elementos secundarios activos |
| `--mdui-color-on-secondary-container` | `#FFDBCC` | `#412519` | Texto sobre secondary-container |

---

### 3.3 Color Roles — Capa terciaria (Tertiary)

Basada en **Selva `#1a3d2b`** — reservada para contexto institucional/gobierno.

| TOKEN CSS | HEX (DARK) | HEX (LIGHT) | USO |
|---|---|---|---|
| `--mdui-color-tertiary` | `#82C89B` | `#1A3D2B` | Acentos de contexto institucional |
| `--mdui-color-on-tertiary` | `#00371C` | `#FFFFFF` | Texto sobre tertiary |
| `--mdui-color-tertiary-container` | `#0A522E` | `#B4E6C8` | Fondo de badges institucionales |
| `--mdui-color-on-tertiary-container` | `#B4E6C8` | `#00371C` | Texto sobre tertiary-container |

---

### 3.4 Color Roles — Error (Rojo Semántico)

> **Nunca usar Terra aquí.** Rojo Semántico ≠ marca. El cerebro del usuario distingue Terra (cálido, identidad) de Rojo Semántico (frío, peligro) cromáticamente.

| TOKEN CSS | HEX (DARK) | HEX (LIGHT) | USO |
|---|---|---|---|
| `--mdui-color-error` | `#FFB4AB` | `#B03A2E` | Alerta crítica, coordinación alta, stream en error |
| `--mdui-color-on-error` | `#690005` | `#FFFFFF` | Texto sobre error |
| `--mdui-color-error-container` | `#8C1D18` | `#FFDAD6` | Fondo de banner de alerta |
| `--mdui-color-on-error-container` | `#FFDAD6` | `#690005` | Texto sobre error-container |

---

### 3.5 Color Roles — Surface (Ébano / temperatura cálida)

M3 define un color base `surface` más 5 niveles de contenedor. Qontexto los mapea a su paleta oscura con temperatura marrón/sepia para cohesionar con la identidad de marca.

| TOKEN CSS | HEX (DARK) | HEX (LIGHT) | USO |
|---|---|---|---|
| `--mdui-color-surface` | `#181513` | `#F4EDE4` | **Base surface** — referencia interna para componentes MDUI |
| `--mdui-color-surface-container-lowest` | `#131110` | `#F4EDE4` | **BG** — fondo principal del dashboard |
| `--mdui-color-surface-container-low` | `#181513` | `#EBE4DC` | Escalón entre BG y card |
| `--mdui-color-surface-container` | `#1C1916` | `#E4DCD4` | **Card** — fondo de tarjetas principales |
| `--mdui-color-surface-container-high` | `#23201C` | `#DAD2CA` | Cards elevadas, menús, navigation rail |
| `--mdui-color-surface-container-highest` | `#2A2520` | `#CCC8C0` | Dialogs, bottom sheets, tooltips |

---

### 3.6 Color Roles — On-Surface, Outline, Inverse

| TOKEN CSS | HEX (DARK) | HEX (LIGHT) | USO |
|---|---|---|---|
| `--mdui-color-on-surface` | `#F4EDE4` | `#2A2118` | **Crema** — texto principal sobre dark |
| `--mdui-color-on-surface-variant` | `#C8BEB4` | `#524438` | Texto secundario cálido |
| `--mdui-color-outline` | `#8C7C6E` | `#8C7C6E` | Bordes de inputs, textfields — componentes interactivos MDUI |
| `--mdui-color-outline-variant` | `#3C352F` | `#C8BEB4` | **Bordes de card** — separadores decorativos de contenedor |
| `--mdui-color-inverse-surface` | `#F4EDE4` | `#2A2118` | Snackbars, tooltips (fondo) |
| `--mdui-color-inverse-on-surface` | `#2A2118` | `#F4EDE4` | Texto en snackbars/tooltips |
| `--mdui-color-inverse-primary` | `#C4522A` | `#FFB494` | Primary invertido en snackbars |
| `--mdui-color-scrim` | `#000000` | `#000000` | Overlay de modales y drawers |

> **Regla de uso de outline:** `outline` (más oscuro/saturado) es para bordes de componentes interactivos que requieren contraste alto — inputs, checkboxes, selects. `outline-variant` (más sutil) es para bordes decorativos de contenedor — cards, separadores, dividers. En el dashboard, todos los bordes de card usan `outline-variant`.

---

### 3.7 Colores de estado operativo (Custom Colors)

Independiente de los roles M3. Se definen bajo el namespace `--q-color-*` para prevenir colisiones con MDUI.

> **Distinción crítica — estado operativo ≠ urgencia narrativa:**
> `--q-color-success` y `--q-color-warning` comunican el **estado técnico del sistema**: stream conectado/degradado, costo dentro/fuera de umbral, pipeline operativo/con fallo. **No se usan para urgencia de narrativa** — eso es el semáforo (sección 3.8). Un stream puede estar técnicamente en warning (latencia alta) mientras la narrativa que transmite está en urgency-critical. Son dimensiones ortogonales.

> **Regla de uso:** `--q-color-success/warning` solo en: indicador de stream online/offline, badge de costo, estado de pipeline. Nunca en pie chart, word cloud, sparkline, leyenda de narrativas, ni timeline de alertas.

| NOMBRE | TOKEN CSS | HEX (DARK) | USO |
|---|---|---|---|
| **Verde operativo** | `--q-color-success` | `#82DCA0` | Stream activo, costo OK, pipeline running |
| Verde on | `--q-color-on-success` | `#004426` | Texto sobre success |
| Verde container | `--q-color-success-container` | `#0A7841` | Fondo de badge de estado OK |
| Verde on-container | `--q-color-on-success-container` | `#C2FFD5` | Texto sobre success-container |
| **Ámbar operativo** | `--q-color-warning` | `#FFD26E` | Stream degradado, latencia alta, costo en umbral |
| Ámbar on | `--q-color-on-warning` | `#442C00` | Texto sobre warning |
| Ámbar container | `--q-color-warning-container` | `#966414` | Fondo de badge de estado degradado |
| Ámbar on-container | `--q-color-on-warning-container` | `#FFEAB4` | Texto sobre warning-container |

**Declaración en `css/qontexto-tokens.css`:**
```css
/* Estado operativo del sistema — extensión de producto, fuera del sistema tonal M3.
   NO usar para urgencia narrativa — ver --q-urgency-* en sección 3.8. */
:root,
[mdui-theme="dark"] {
  --q-color-success:              130 220 160;
  --q-color-on-success:           0   68  38;
  --q-color-success-container:    10 120  65;
  --q-color-on-success-container: 194 255 213;

  --q-color-warning:              255 210 110;
  --q-color-on-warning:           68  44   0;
  --q-color-warning-container:    150 100  20;
  --q-color-on-warning-container: 255 234 180;
}

[mdui-theme="light"] {
  --q-color-success:              20 120  60;
  --q-color-on-success:           255 255 255;
  --q-color-success-container:    194 255 213;
  --q-color-on-success-container: 0   68  38;

  --q-color-warning:              140  80   0;
  --q-color-on-warning:           255 255 255;
  --q-color-warning-container:    255 234 180;
  --q-color-on-warning-container: 68  44   0;
}
```

---

### 3.8 Sistema semáforo — Urgencia narrativa

> **"El director no piensa en porcentajes — piensa en veredictos."**

El semáforo es un sistema de **comunicación de decisiones**, no de color decorativo. Sus cuatro niveles no representan categorías estéticas sino instrucciones de acción. El color es el mensaje.

**Principio de invarianza:** Los colores del semáforo son **absolutos y fijos** en cualquier modo (dark/light). Un rojo de alerta máxima es `#991B1B` siempre — si se adaptara al tema tonal y se convirtiera en rosa pálido, el director no leería "actuar ahora". La urgencia no negocia con el tema visual.

| TOKEN CSS | HEX | VEREDICTO | INSTRUCCIÓN |
|---|---|---|---|
| `--q-urgency-critical` | `#991B1B` | **Alerta máxima** | Actuar ahora |
| `--q-urgency-high` | `#EF4444` | **Señal temprana** | Vigilar de cerca |
| `--q-urgency-medium` | `#F59E0B` | **Emergiendo** | Monitorear |
| `--q-urgency-low` | `#4CAF50` | **Estable** | Sin acción |

**Chips de veredicto — fondos fijos:**

| TOKEN CSS | HEX | USO |
|---|---|---|
| `--q-urgency-critical-bg` | `#FEF2F2` | Fondo chip Alerta máxima |
| `--q-urgency-high-bg` | `#FEF2F2` | Fondo chip Señal temprana |
| `--q-urgency-medium-bg` | `#FFFBEB` | Fondo chip Emergiendo |
| `--q-urgency-low-bg` | `#F0FBF1` | Fondo chip Estable |

**Declaración en `css/qontexto-tokens.css`:**
```css
/* Sistema semáforo — comunicación de urgencia narrativa.
   Valores ABSOLUTOS: no siguen el sistema tonal M3.
   Los mismos en dark y light porque el significado no cambia con el tema. */
:root {
  --q-urgency-critical:    153  27  27;  /* #991B1B — Alerta máxima  · Actuar ahora     */
  --q-urgency-high:        239  68  68;  /* #EF4444 — Señal temprana · Vigilar de cerca */
  --q-urgency-medium:      245 158  11;  /* #F59E0B — Emergiendo     · Monitorear       */
  --q-urgency-low:          76 175  80;  /* #4CAF50 — Estable        · Sin acción       */

  /* Fondos de chip — fijos */
  --q-urgency-critical-bg: 254 242 242;  /* #FEF2F2 */
  --q-urgency-high-bg:     254 242 242;  /* #FEF2F2 */
  --q-urgency-medium-bg:   255 251 235;  /* #FFFBEB */
  --q-urgency-low-bg:      240 251 241;  /* #F0FBF1 */
}
/* Sin bloque [mdui-theme="dark"] — la invarianza es intencional */
```

**Gramática visual del semáforo:**

El color del semáforo es consistente en los tres cards del tab Resumen. El director aprende la gramática en el pie chart y la aplica automáticamente al word cloud y al sparkline.

| COMPONENTE | FUENTE DE DATOS | USO DEL SEMÁFORO |
|---|---|---|
| Pie chart (Narrativas) | `GET /my/narrative-arcs` | Color de slice = urgencia del arco (`last_score` → veredicto). Tamaño = intensidad del arco (mínimo 1). |
| Word cloud (Voces) | `GET /my/narrative-arcs` | Color de término = urgencia del arco al que pertenece la keyword. Tamaño = frecuencia entre arcos activos. |
| Sparkline (Momento) | `GET /my/narrative-arcs` | Color de línea = urgencia. Grosor = relevancia (urgentes gruesas, contexto tenues). Eje X = últimos 15 días; un punto por día (score máximo si hubo múltiples ventanas). |
| Leyenda de narrativas | — | Chip de veredicto con fondo `--q-urgency-*-bg` y texto `--q-urgency-*`. |
| Timeline de alertas | `GET /session/{id}/state` | Dot del evento en `--q-urgency-*` según severidad. Fondo del evento urgente: `rgb(var(--q-urgency-critical) / 0.05)`. |

> **Nota de implementación (D10):** Los tres cards del tab Resumen consumen arcos narrativos, no datos de sesión. Esto desacopla el Resumen del ciclo de polling de 30s — los arcos se cargan al iniciar la sesión de usuario y al abrir el tab Contexto. La sparkline refleja la evolución histórica de los arcos (días), no el pulso de la sesión en vivo (minutos). En sesión activa, los cards de Resumen son estables; el detalle en tiempo real vive en el tab Señales.

**Límite de 4 narrativas con color:**
Máximo 4 narrativas reciben color del semáforo en el pie chart. Las narrativas adicionales se agrupan en "Otros" con color neutro (`--mdui-color-on-surface-variant`). Esto evita que la paleta semántica se diluya con colores sin significado asignado.

**Reserva de `--mdui-color-error`:**
`--mdui-color-error` queda reservado exclusivamente para **errores de sistema**: stream desconectado, timeout de API, fallo de pipeline. No se usa en urgencia narrativa. La distinción es importante: un stream puede fallar técnicamente (error de sistema) mientras transmite una narrativa estable (urgency-low). Son eventos independientes.

---

### 3.9 Contraste WCAG

| TOKEN | HEX (DARK) | CONTRASTE SOBRE CARD | CUMPLE |
|---|---|---|---|
| `--mdui-color-on-surface` (Crema) | `#F4EDE4` | 14.8:1 | ✓ AAA |
| `--mdui-color-on-surface-variant` | `#C8BEB4` | 7.2:1 | ✓ AA |
| `--mdui-color-outline-variant` | `#3C352F` | — | Solo bordes, no texto |
| `on-surface` @ 35% opacidad (Dimmed) | — | 2.8:1 | ✗ Falla AA y AAA |

> **Guardrail Dimmed:** `rgb(var(--mdui-color-on-surface) / 0.35)` falla WCAG AA (2.8:1 < 4.5:1 requerido). Su uso está **restringido a dos casos únicos**: timestamps en el footer de card (`HH:MM PE`) y el separador de rango en la timebar. Implementar como clase `.q-text-dimmed` para hacer el scope rastreable en el código. **Prohibido** en cualquier texto que lleve información operativa, labels de componente, valores de KPI o estados de alerta.

---

## 4. Shape System

Material You define border-radius por categoría de componente, no por componente individual. Qontexto usa la escala completa de M3. En MDUI 2, todos los tokens de shape incluyen el segmento `-corner-` en el nombre.

| NIVEL | TOKEN CSS MDUI 2 | VALOR | COMPONENTES |
|---|---|---|---|
| Extra Small | `--mdui-shape-corner-extra-small` | `4px` | Chips, badges, tooltips, snackbars |
| Small | `--mdui-shape-corner-small` | `8px` | Botones, input fields, menús contextuales |
| Medium | `--mdui-shape-corner-medium` | `12px` | Cards del dashboard — ver nota de override |
| Large | `--mdui-shape-corner-large` | `16px` | Bottom sheets (esquinas superiores), navigation rail |
| Extra Large | `--mdui-shape-corner-extra-large` | `28px` | Dialogs, FAB, side sheets |
| Full | `--mdui-shape-corner-full` | `9999px` | Pills de estado, avatar chips |

> **Override de cards — a nivel de selector, no de token global:**
> El proyecto actual usa `border-radius: 16–20px` en `.qcard` y `.qstat`. Sobreescribir `--mdui-shape-corner-medium` globalmente alteraría también menús contextuales, time pickers y otros componentes MDUI que comparten ese nivel. El override correcto es por selector:
>
> ```css
> /* En css/app.css — override selectivo, no afecta otros componentes medium */
> .qcard  { border-radius: 16px; }
> .qstat  { border-radius: 16px; }
> ```
>
> El valor 16px es una excepción documentada al token `medium` (12px), justificada por la densidad visual del dashboard. Se revisará cuando se incorporen componentes MDUI nativos que compartan el nivel medium.

---

## 5. Elevation — Surface Containers

Material You reemplaza las sombras de box-shadow por **tinte de color progresivo** sobre la surface. Los 5 niveles de `surface-container` ya definidos en la sección 3.5 implementan este sistema.

| NIVEL M3 | TOKEN | USO |
|---|---|---|
| Level 0 — lowest | `surface-container-lowest` | BG del dashboard |
| Level 1 — low | `surface-container-low` | Escalón de separación |
| Level 2 — base | `surface-container` | Cards principales |
| Level 3 — high | `surface-container-high` | Navigation, menús flotantes |
| Level 4 — highest | `surface-container-highest` | Dialogs, modales |

---

## 6. State Layers

Material You define overlays de color para cada estado interactivo. Se aplican como una capa `::after` con opacidad fija sobre el color `on-surface` del componente.

| ESTADO | OPACIDAD | TOKEN CSS |
|---|---|---|
| Hover | 8% | `--q-state-hover-opacity: 0.08` |
| Focus | 12% | `--q-state-focus-opacity: 0.12` |
| Pressed | 12% | `--q-state-pressed-opacity: 0.12` |
| Dragged | 16% | `--q-state-dragged-opacity: 0.16` |

**Implementación:**
```css
.q-interactive { position: relative; overflow: hidden; }
.q-interactive::after {
  content: "";
  position: absolute;
  inset: 0;
  background-color: rgb(var(--mdui-color-on-surface));
  opacity: 0;
  transition: opacity 200ms cubic-bezier(0.2, 0, 0, 1);
  pointer-events: none;
  border-radius: inherit;
}
.q-interactive:hover::after  { opacity: 0.08; }
.q-interactive:focus::after  { opacity: 0.12; }
.q-interactive:active::after { opacity: 0.12; }
```

---

## 7. Motion

Material You define un sistema de easing y duración. El "300ms ease-out" del v1.2 se mapea formalmente a `medium2` con easing `standard`.

### 7.1 Curvas de easing

| NOMBRE M3 | TOKEN CSS | CURVA | USO |
|---|---|---|---|
| Standard | `--mdui-motion-easing-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Transiciones de estado general |
| Standard Accelerate | `--mdui-motion-easing-standard-accelerate` | `cubic-bezier(0.3, 0, 1, 1)` | Elementos que salen de pantalla |
| Standard Decelerate | `--mdui-motion-easing-standard-decelerate` | `cubic-bezier(0, 0, 0, 1)` | Elementos que entran a pantalla |
| Emphasized | `--mdui-motion-easing-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | Animaciones de énfasis (FAB, score) |
| Emphasized Accelerate | `--mdui-motion-easing-emphasized-accelerate` | `cubic-bezier(0.3, 0, 0.8, 0.15)` | Salida con énfasis |
| Emphasized Decelerate | `--mdui-motion-easing-emphasized-decelerate` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | Entrada con énfasis |

### 7.2 Duraciones

| TOKEN CSS | VALOR | USO EN QONTEXTO |
|---|---|---|
| `--mdui-motion-duration-short4` | `200ms` | State layers (hover/focus) |
| `--mdui-motion-duration-medium2` | `300ms` | **Transición de score al cambiar** |
| `--mdui-motion-duration-medium4` | `400ms` | Entrada de cards, navigation |
| `--mdui-motion-duration-long2` | `500ms` | Animaciones de énfasis, pulso del logo |

---

## 8. Componentes clave

### 8.1 Score de coordinación

Dos capas de lectura: Director (color + etiqueta) y Analista (+ valor numérico en JetBrains Mono).

El score de coordinación es urgencia narrativa — usa el semáforo (`--q-urgency-*`), no los colores de estado operativo.

| ESTADO | ETIQUETA + VALOR | TOKEN SEMÁFORO | VEREDICTO |
|---|---|---|---|
| **Baja** | ● Baja · 0.22 / 1.0 | `--q-urgency-low` | Estable · Sin campaña articulada |
| **Media** | ● Media · 0.54 / 1.0 | `--q-urgency-medium` | Emergiendo · Narrativa en expansión |
| **Alta** | ● Alta · 0.81 / 1.0 | `--q-urgency-critical` | Alerta máxima · Campaña coordinada |

```css
/* Card de score */
.q-score-card {
  background-color: rgb(var(--mdui-color-surface-container));
  border: 0.5px solid rgb(var(--mdui-color-outline-variant));
  border-radius: var(--mdui-shape-corner-medium);
  padding: 16px;
}

/* Dot de estado — semáforo, valores absolutos.
   .q-score-dot--high no existe: --q-urgency-high (Señal temprana)
   no aplica al score individual — ver nota debajo. */
.q-score-dot--low      { background-color: rgb(var(--q-urgency-low)); }
.q-score-dot--medium   { background-color: rgb(var(--q-urgency-medium)); }
.q-score-dot--critical { background-color: rgb(var(--q-urgency-critical)); }

/* Valor numérico */
.q-score-value {
  font-family: "JetBrains Mono", monospace;
  font-size: 22px;
  font-variant-numeric: tabular-nums;
}
```

> **Nota:** El score no tiene nivel "high" (`--q-urgency-high` / Señal temprana) porque el score es un valor continuo que se mapea a tres rangos de decisión. "Señal temprana" emerge en el pie chart de narrativas cuando varias fuentes independientes mencionan la misma narrativa sin coordinación clara — no del score individual. Los cuatro niveles del semáforo están activos en el pie chart; el score card usa tres.

### 8.2 Señal de atención (Banner de urgencia media)

El banner de señal de atención usa `--q-urgency-medium` (Emergiendo), no `--q-color-warning` (estado operativo). La distinción es semántica: el banner aparece cuando una narrativa supera el umbral de vigilancia activa, que es urgencia, no fallo de sistema.

```css
.q-alert-banner {
  border-left: 3px solid rgb(var(--q-urgency-medium));
  background-color: rgb(var(--q-urgency-medium-bg) / 0.6);
  border-radius: 0 var(--mdui-shape-corner-extra-small) var(--mdui-shape-corner-extra-small) 0;
  padding: 12px 16px;
}

/* Variante crítica — cuando la señal escala a alerta máxima */
.q-alert-banner--critical {
  border-left-color: rgb(var(--q-urgency-critical));
  background-color: rgb(var(--q-urgency-critical-bg) / 0.6);
}
```

### 8.3 Logo dot — identidad fija Terra

```css
/* El punto del logo es SIEMPRE Terra — no sigue el sistema tonal.
   Ver sección 2.2 para justificación. */
.qlogo-dot,
.qsnap-dot {
  background-color: #C4522A;
  border-radius: var(--mdui-shape-corner-full);
}
```

> ~~**Corrección del v1.2:**~~ El proyecto usaba `#FF5722` para el punto del logo — un rojo que no coincide con Terra `#c4522a`. Corregido en v1.3. En v1.4 se abandona `rgb(var(--mdui-color-primary))` porque en dark mode `primary` toma el valor tonal claro (`#FFB494`), que no es Terra.

---

## 9. Iconografía

Material Symbols (variable font de Google) es el sistema de iconos oficial de Material You.

**Configuración recomendada para Qontexto:**

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20,300,0,0">
```

| PARÁMETRO | VALOR | RAZÓN |
|---|---|---|
| Variante | `Rounded` | Cohesiona con la temperatura cálida de la marca |
| Optical size | `20` | Dashboard de alta densidad — íconos compactos |
| Weight | `300` | Alineado con Google Sans Light del tipo display |
| Fill | `0` | Outlined por defecto; filled solo para estado activo |
| Grade | `0` | Neutro — sin énfasis adicional |

**Regla de convivencia con el ●:** El punto (●) es identidad de marca, no un ícono de sistema. Los Material Symbols cubren navegación, acciones y estados. El punto nunca se reemplaza por un ícono de Material Symbols.

---

## 10. Tokens CSS — Implementación MDUI 2

El archivo completo de tokens está en `css/qontexto-tokens.css`. Se carga después de `mdui.css` y antes de `css/app.css`.

```html
<html mdui-theme="dark">
<head>
  <link rel="stylesheet" href="https://unpkg.com/mdui@2/mdui.css">
  <link rel="stylesheet" href="css/qontexto-tokens.css">
  <link rel="stylesheet" href="css/app.css">
</head>
```

**Puente de compatibilidad** — `css/tokens.css` mapea las variables heredadas del proyecto a los tokens M3:

```css
:root {
  --bg:      rgb(var(--mdui-color-surface-container-lowest));
  --surface: rgb(var(--mdui-color-surface-container));
  --surface2:rgb(var(--mdui-color-surface-container-high));
  --border:  rgb(var(--mdui-color-outline-variant));  /* outline-variant para bordes de contenedor */
  --text1:   rgb(var(--mdui-color-on-surface));
  --text2:   rgb(var(--mdui-color-on-surface-variant));
  --text3:   rgb(var(--mdui-color-on-surface-variant) / 0.6);  /* sintaxis moderna: / para canal alfa */
  --font:    var(--mdui-typescale-body-medium-font);
}
/* Eliminar el bloque [data-theme="dark"] —
   MDUI maneja el tema vía atributo mdui-theme="dark" en <html> */
```

**Cambio de tema (JS):**
```js
// Antes (v1.2):
document.documentElement.dataset.theme = isDark ? 'dark' : 'light';

// Después (v1.3 — MDUI 2):
document.documentElement.setAttribute('mdui-theme', isDark ? 'dark' : 'light');
```

---

## 11. Pendientes v1.5

| ELEMENTO | DESCRIPCIÓN |
|---|---|
| **Figma tokens** | Exportar `qontexto-tokens.css` al kit de Figma usando Tokens Studio (plugin). Sin esto, diseñador y frontend siguen desincronizados. |
| **Guía responsive** | Breakpoints para laptop 13" (caso principal), monitor 24" (sala de monitoreo), tablet 10" (lectura de resumen). MDUI 2 provee Navigation Rail y Navigation Drawer adaptativos. |
| **Estados vacíos y error** | Definir pantallas para: sin datos, stream fallido, carga inicial, sin alertas. Usar `empty state` ilustrado con el punto ● como elemento central. |
| **Material Symbols — catálogo** | Definir qué íconos usa Qontexto: stream activo/error, categorías de alerta, acciones de navegación. Máximo 20 íconos en v1.5. |
| **Modo claro — validación** | Las variantes `*-light` están definidas en tokens. Validar contraste y coherencia visual antes de activar en producción (reportes PDF, vista institucional). |

> **Dynamic color — descartado como estrategia principal:**
> `setTheme({ primary: '#c4522a' })` de MDUI JS genera todo el esquema tonal en runtime a partir de un seed. Esta opción y los tokens manuales de las secciones 3.1–3.6 son **mutuamente excluyentes**: si se activa dynamic color, MDUI sobreescribe los valores de surface containers, secondary, tertiary y error con los calculados algorítmicamente, borrando la paleta Ébano de temperatura cálida.
>
> **Decisión v1.4:** Qontexto usa **tokens manuales** como estrategia definitiva. La razón es control: la temperatura marrón/sepia de los surfaces (Ébano) es una decisión de identidad que el algoritmo de M3 no puede respetar al derivar automáticamente desde Terra. Dynamic color queda descartado salvo que en el futuro se incorpore una feature de personalización por cliente.

---

---

## Anexo A — Estrategia de migración a Material You

### Dos estrategias, un solo perfil de riesgo aceptable

**Estrategia A — Token swap**
Adoptar los tokens CSS de MDUI sin tocar los componentes HTML. El dashboard sigue siendo vanilla HTML con clases custom; MDUI aporta el sistema de tokens y el CSS base. Es la estrategia de este documento.

**Estrategia B — Web Components**
Reemplazar elementos custom (`.qcard`, `.qtab`, `.qstat`) por componentes MDUI nativos (`<mdui-card>`, `<mdui-navigation-tab>`, etc.).

**Estrategia B descartada:** `api.js` genera HTML dinámicamente con strings interpolados en más de 600 líneas de `innerHTML`. Convertir eso a web components requiere reescribir prácticamente todo el layer de UI, con riesgo de regresión en cada endpoint. El ROI no justifica el riesgo dado el stack vanilla.

---

### Fase 1 — Token layer (1–2 días · riesgo bajo)

Tres archivos cambian. La lógica de negocio no se toca.

**`index.html` — orden de carga:**
```html
<link rel="stylesheet" href="https://unpkg.com/mdui@2/mdui.css">
<link rel="stylesheet" href="css/qontexto-tokens.css">
<link rel="stylesheet" href="css/app.css">
```

**`css/tokens.css` — bridge de compatibilidad:**
```css
:root {
  --bg:      rgb(var(--mdui-color-surface-container-lowest));
  --surface: rgb(var(--mdui-color-surface-container));
  --surface2:rgb(var(--mdui-color-surface-container-high));
  --border:  rgb(var(--mdui-color-outline-variant));
  --text1:   rgb(var(--mdui-color-on-surface));
  --text2:   rgb(var(--mdui-color-on-surface-variant));
  --text3:   rgb(var(--mdui-color-on-surface-variant) / 0.6);
  --font:    var(--mdui-typescale-body-medium-font);
}
/* Eliminar el bloque [data-theme="dark"] —
   MDUI maneja el tema vía atributo mdui-theme en <html> */
```

**`js/app.js` — cambio de tema (una línea):**
```js
// Antes
document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

// Después
document.documentElement.setAttribute('mdui-theme', isDark ? 'dark' : 'light');
```

**`js/app.js` — Chart.js leyendo token computado:**
```js
// Antes — valor hardcodeado
function surfaceColor() { return isDark ? '#1C1C1A' : '#FAFAF7'; }

// Después — leer del token MDUI en tiempo de ejecución
function surfaceColor() {
  return getComputedStyle(document.documentElement)
    .getPropertyValue('--mdui-color-surface-container').trim();
}
```

**Riesgo real:** MDUI aplica un CSS reset y fuerza Roboto como fuente global. Si los tokens tipográficos de `qontexto-tokens.css` no se cargan antes de `app.css`, habrá un flash de Roboto. El orden de `<link>` lo resuelve. Los colores del semáforo en Chart.js (`#991B1B`, `#EF4444`, etc.) son valores absolutos — no cambian y no requieren ajuste.

---

### Fase 2 — Urgency classes en api.js (1 día · riesgo medio)

`api.js` inyecta colores como inline styles en cada elemento generado dinámicamente:

```js
// Estado actual — color hardcodeado en string HTML
`<span class="qleg-dot" style="background:${dotColor}"></span>`
`<span class="qleg-tag" style="background:${tagBg};color:${tagColor}">`
```

Después de Fase 1 estos colores siguen funcionando — `#991B1B` es `#991B1B` independientemente del sistema de tokens. Fase 2 los migra a clases CSS que referencian `--q-urgency-*`, lo que permite que el modo claro funcione correctamente en reportes PDF y vista institucional.

El objeto `URGENCY` de `api.js` ya tiene los valores correctos que coinciden con el semáforo de v1.5. El trabajo es mecánico: reemplazar inline styles por clases del tipo `.q-urgency--critical`, `.q-urgency--high`, etc.

**Riesgo real:** Requiere tests visuales contra datos reales de sesión después de cada cambio. Un error en la interpolación de strings puede silenciar alertas o romper el pie chart sin lanzar errores en consola.

---

### Fase 3 — State layers y shape (½ día · riesgo bajo)

Añadir la clase `.q-interactive` (definida en sección 6) a los elementos clicables del dashboard: tabs, botones de ventana temporal, botón PDF. Verificar que `.qcard` y `.qstat` tengan `border-radius` explícito en `app.css` (no en tokens globales de shape — ver sección 4).

---

### Resumen

| Fase | Trabajo | Riesgo | Puede romperse |
|---|---|---|---|
| 1 — Token layer | 1–2 días | Bajo | Flash de fuente · color de borde |
| 2 — Urgency classes | 1 día | Medio | Generación dinámica de HTML en `api.js` |
| 3 — State layers / shape | ½ día | Bajo | Nada crítico |
| 4 — Web Components | 3–5 días | Alto | Todo el layer de UI dinámico |

**Recomendación:** Fase 1 → deploy → verificar en producción → Fase 2 → deploy → Fase 3. Fase 4 no tiene ROI suficiente dado el stack vanilla.

---

*● Qontexto · La radio no espera. · Sistema de Diseño v1.5 · qontexto.com*
