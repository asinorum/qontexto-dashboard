# Estado del proyecto — Qontexto Dashboard

## Contexto

Este proyecto es el frontend del sistema **Narrative Intelligence**.
Pipeline (backend): `github.com/asinorum/narrative-intelligence`
API pública: `https://api.qontexto.com`
Deploy: `https://qontexto.com`

---

## Próxima sesión — continuar aquí

> ⚠️ **BREAKING CHANGE — arreglar antes de cualquier prueba en producción**
>
> `GET /session/{id}/state` ahora requiere `?token=<read_token>` (commit `62a769e` en narrative-intelligence).
> El dashboard devuelve **422** en todos los polls hasta que se actualice.
>
> **Dos cambios requeridos en `app.js` (o donde esté el polling):**
> 1. Al crear la sesión: guardar `read_token` del response de `POST /session/start` en `localStorage`.
> 2. En cada poll: añadir `?token=${localStorage.getItem("read_token")}` a `GET /session/{id}/state`.
> 3. Manejar 403 explícitamente (token inválido) — mostrar mensaje en lugar de loading infinito.

---

**Fase 13 completada ✅**
Dashboard en producción: `https://qontexto.com`
API en producción: `https://api.qontexto.com`

Próximo: arreglar el breaking change del `read_token` (ver arriba), luego probar con sesión activa real.

---

## Fases

### Fase 13 — Dashboard Qontexto

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

## Correcciones aplicadas en narrative-intelligence

### `label` faltante en streams_monitored ✅ (2026-05-05)
Añadido `"label": s.get("label", "")` al dict de `streams_metadata` en
`_engine_for_session` (`src/api/routers/reports.py`).
El Tab Señales ahora muestra el nombre legible de la emisora.

---

### Fase 12 — Notificaciones salientes (posterior)
Webhook o integración n8n cuando `severity: critical`.
Depende de que haya clientes reales usando el dashboard.
Implementar en repo `narrative-intelligence`.

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

### Snapshot PDF
El botón "Snapshot PDF" queda visible pero deshabilitado hasta que el backend
implemente `GET /report/{id}/pdf` (Fase 7b de `narrative-intelligence`).

### Sin frameworks
Vanilla HTML/CSS/JS para minimizar dependencias y facilitar el mantenimiento.
Chart.js (CDN) solo para pie chart y sparkline.
Word cloud: CSS puro con posicionamiento absoluto.

### Preparado para crecer
Estructura de archivos pensada para incorporar en el futuro:
- Autenticación de usuarios
- Homepage pública
- Múltiples clientes/sesiones
