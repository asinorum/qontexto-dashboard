# DISEÑO —  Narrative Intelligence Dashboard  (Qontexto)
**Versión 1.0 · Abril 2026**

---

## Principio rector

> **"El director no piensa en porcentajes — piensa en veredictos."**

El usuario primario (Analista de Inteligencia Mediática) no es el consumidor final del insight — es el courier del insight. Toma pantallazos. El directorio decide. Cada card debe funcionar como una diapositiva autónoma con conclusión incorporada. Sin el dashboard alrededor, el card sigue teniendo sentido completo.

---

## Público objetivo

### Primario — Analista de Inteligencia Mediática
Trabaja en medios, consultoras políticas, agencias de PR, organismos gubernamentales o corporaciones con presencia regional. Su flujo: genera el análisis → toma pantallazos → los presenta al director → el director decide.

### Secundario — Director de Comunicaciones
No opera la herramienta. Aprueba la compra. Toma decisiones de crisis. Necesita un dashboard que le diga qué narrativa está ganando terreno antes de que sea tendencia. Su atención es de 5 segundos por card.

---

## Sistema de diseño — Material You Enterprise

### Filosofía
Material You aplicado a contexto enterprise/dark significa:
- Superficies con elevación tonal, sin bordes decorativos
- Radio de esquinas pronunciado (16–20px en cards, 10px en elementos internos)
- Paleta semántica derivada del contexto de urgencia, no de marca
- Tipografía con jerarquía clara Display / Title / Body / Label
- El color nunca es decorativo — siempre tiene significado de negocio

### Tipografía — Google Sans Flex
```
@import url('https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@300..700&display=swap');
```

| Rol | Tamaño | Peso | Uso |
|---|---|---|---|
| Display | 26px | 500 | Valores de KPI en stat cards |
| Title | 15px | 500 | Nombre del producto, títulos de sección |
| Body | 13px | 400 | Conclusiones de cards, análisis narrativo |
| Body Strong | 13px | 500 | Conclusiones destacadas, veredictos |
| Label | 10px | 500 | Etiquetas de categoría (uppercase, letter-spacing: 0.1em) |
| Caption | 10–11px | 400 | Footers, metadata, notas de lectura |

---

## Sistema de color semántico — Semáforo

### Principio
El color no es decorativo. Cada color tiene un veredicto de negocio. El director aprende el sistema en el primer card y lo aplica automáticamente al resto del dashboard.

### Paleta de urgencia
| Color | Hex principal | Hex oscuro | Veredicto | Acción |
|---|---|---|---|---|
| Rojo oscuro | `#991B1B` | — | Alerta máxima | Actuar ahora |
| Rojo | `#EF4444` | — | Señal temprana | Vigilar de cerca |
| Ámbar | `#F59E0B` | — | Emergiendo | Monitorear |
| Verde | `#4CAF50` | — | Estable | Sin acción |

### Chips de veredicto (fondos)
```css
/* Rojo oscuro */
background: #FEF2F2; color: #991B1B;
/* Rojo */
background: #FEF2F2; color: #B91C1C;
/* Ámbar */
background: #FFFBEB; color: #B45309;
/* Verde */
background: #F0FBF1; color: #2E7D32;
```

### Regla crítica
- El color nunca se asigna por volumen o tamaño. Se asigna por urgencia.
- Un slice pequeño puede ser rojo. Un slice grande puede ser verde.
- Nunca hay azul, púrpura, ni colores sin significado semántico en elementos de datos.
- Máximo 4 narrativas con color. Las adicionales se agrupan en "Otros" con color neutro (`var(--text3)`).

---

## Tokens de superficie — Modo claro y oscuro

### Modo claro (default)
```css
--bg: #EFEDE6;
--surface: #FAFAF7;
--surface2: #EDEAE2;
--border: rgba(0, 0, 0, 0.07);
--text1: #1C1C1A;
--text2: #5C5A52;
--text3: #9C9A90;
```

### Modo oscuro
```css
--bg: #111110;
--surface: #1C1C1A;
--surface2: #252522;
--border: rgba(255, 255, 255, 0.07);
--text1: #EEECEA;
--text2: #9A9890;
--text3: #5A5852;
```

### Toggle de tema
El usuario elige su preferencia. Ambos modos son ciudadanos de primera clase. El ícono de toggle es sol (modo claro) / luna (modo oscuro), ubicado en la navbar derecha.

---

## Cards — Anatomía

Todo card del dashboard sigue esta estructura fija:

```
[Label de categoría]       ← 10px, uppercase, var(--text3)
[Conclusión en una línea]  ← 13px, font-weight 500, var(--text1)
[Gráfico]                  ← altura variable según tipo
[Nota de lectura]          ← 10px, background var(--surface2), border-radius 8px
[Footer]                   ← 10px, var(--text3), border-top
```

### Reglas de card
- `border-radius: 20px`
- `border: 0.5px solid var(--border)`
- `background: var(--surface)`
- `padding: 18px`
- La conclusión siempre precede al gráfico — el director lee el veredicto antes de ver el visual
- El footer siempre incluye: número de emisoras · hora · zona horaria PE
- Cada card debe ser exportable como imagen autónoma (pantallazo)

### Stat cards (KPI)
- `border-radius: 16px`
- Valor principal en Display (26px, font-weight 500)
- Subtítulo en Caption (11px, var(--text3))
- Las alertas activas colorean el valor: `color: #EF4444`

---

## Gramática visual — Regla universal

> **Tamaño + intensidad de color = urgencia**

Esta regla aplica en todos los gráficos del sistema:

| Gráfico | Tamaño codifica | Color codifica |
|---|---|---|
| Pie chart | Volumen relativo de la narrativa | Nivel de urgencia |
| Word cloud | Frecuencia de mención | Nivel de urgencia |
| Sparkline | — | Urgencia de la narrativa (grosor de línea) |

El director que aprende la gramática en el pie chart la aplica automáticamente al word cloud y al sparkline.

---

## Los tres cards principales — Secuencia narrativa

La secuencia no es decorativa. Es la historia que el analista presenta al directorio.

### 01 · Narrativas — ¿Qué?
**Tipo:** Pie chart sólido
**Pregunta que responde:** ¿Qué narrativas están activas y qué tan urgentes son?
**Layout:** Columna izquierda, fila superior
**Altura del gráfico:** 155–160px
**Leyenda:** Debajo del gráfico. Cada ítem: punto de color + nombre de narrativa + chip de veredicto
**Tooltip:** `[Nombre narrativa]: [Veredicto]` — nunca porcentajes
**Nota de lectura:** "Tamaño + color = urgencia."

### 02 · Voces — ¿Cómo?
**Tipo:** Word cloud radial
**Pregunta que responde:** ¿Con qué palabras exactas se está hablando de esto?
**Layout:** Columna derecha, fila superior
**Altura:** 170px contenedor posicionado
**Regla de posicionamiento:** Términos más urgentes (rojo oscuro, mayor tamaño) al centro. Ámbar y verde los rodean en anillos. Neutros en los bordes exteriores.
**Nota de lectura:** "Centro + color oscuro = urgencia máxima."

### 03 · Momento — ¿Cuándo?
**Tipo:** Sparkline multi-línea con área
**Pregunta que responde:** ¿Cuándo irrumpió cada narrativa y cómo evoluciona?
**Layout:** Fila inferior, ancho completo (dos columnas)
**Líneas:** Máximo 2 narrativas urgentes con línea gruesa (borderWidth: 2–2.5px, puntos visibles en eventos clave). Resto como contexto tenue (borderWidth: 1px, opacity ~35%, sin puntos).
**Veredicto pill:** Visible arriba a la derecha del card. Estado: "↑ Escalando" (rojo) / "→ Estable" (ámbar) / "↓ Cediendo" (verde)
**Eje Y:** Oculto. La forma de la curva comunica la tendencia.
**Eje X:** Timestamps de eventos clave. Color: var(--text3) al 45%.
**Nota de lectura:** "Líneas gruesas = narrativas urgentes. Líneas tenues = contexto. El color es el mismo en los tres cards."

---

## Navegación — Navbar

```
[Logo · punto naranja FF5722]  [Tab: Resumen | Señales]  [Live indicator · toggle tema]
```

- Altura: 52px
- Background: `var(--surface)`
- Border-bottom: `0.5px solid var(--border)`
- Logo: punto `#FF5722` (10px) + "Qontexto" 15px font-weight 500
- Live indicator: punto verde `#4CAF50` (7px) + "N streams · HH:MM PE"
- Tabs: contenedor `var(--surface2)` border-radius 10px, padding 3px. Tab activo: `var(--surface)` border-radius 7px

## Barra de ventana temporal
```
[VENTANA label] [30 min | 1 h | 3 h | Personalizado]     [HH:MM — HH:MM PE] [Snapshot PDF]
```
- Altura: 44px
- Background: `var(--surface)`
- Border-bottom: `0.5px solid var(--border)`
- Botón Snapshot PDF: punto naranja `#FF5722` + label. Genera exportación del estado actual.

---

## Estructura de tabs

### Tab 1 — Resumen
**Audiencia:** Director de Comunicaciones (decisor)
**Contenido:**
1. Fila de 4 stat cards: Ventana · Streams · Alertas · Actualizado
2. Grid 2 columnas: Card Narrativas (¿Qué?) + Card Voces (¿Cómo?)
3. Card full-width: Momento (¿Cuándo?)

**Principio:** Cada card es exportable. El director puede tomar pantallazo de cualquiera y presentarlo de forma autónoma.

### Tab 2 — Señales
**Audiencia:** Analista de Inteligencia Mediática (operador)
**Contenido:**
1. Grid 2 columnas:
   - Línea de tiempo con eventos cronológicos
   - Análisis narrativo + recomendación
2. Resumen por emisora (grid 3 columnas)

**Principio:** Más denso, más técnico. No necesita ser presentable en PPT — es la capa de trazabilidad y evidencia.

#### Línea de tiempo — Anatomía de evento
```
[HH:MM]  [●]  [Título del evento]
              [Subtítulo: emisora · región · contexto]
              [Cita textual si aplica — italic, color urgencia]
```
- Eventos de alerta: fondo `rgba(153,27,27,0.05)`, border-radius 12px
- Dot del evento en color semáforo según urgencia
- Evento "Ahora": dot con glow `box-shadow: 0 0 0 3px rgba(76,175,80,0.2)`

#### Resumen por emisora
- Card por emisora: border-radius 16px
- Emisoras en alerta: border-color con tinte del color semáforo
- Campos: nombre · región · alertas · estado (con color semáforo)

---

## Reglas de exportación (Snapshot PDF)

Cada card debe funcionar como unidad autónoma al exportar:
- Incluye: label de categoría + conclusión + gráfico + nota de lectura + footer
- No incluye: navbar, barra de ventana, elementos de navegación
- Fondo: siempre `var(--surface)` — nunca transparente
- La nota de lectura permanece en el export — orienta al director en la primera reunión

---

## Lo que nunca hacemos

- ❌ Mostrar porcentajes como dato principal
- ❌ Usar colores sin significado semántico (azul, púrpura, etc.)
- ❌ Asignar color por volumen en lugar de urgencia
- ❌ Cards sin conclusión textual — el gráfico nunca habla solo
- ❌ Más de 4 narrativas con color en el mismo gráfico
- ❌ Eje Y visible en el sparkline
- ❌ Números internos del sistema visibles al usuario (ej: score 0.22)
- ❌ Labels genéricos (¿Qué? / ¿Cómo? / ¿Cuándo?) — usar siempre Narrativas / Voces / Momento
