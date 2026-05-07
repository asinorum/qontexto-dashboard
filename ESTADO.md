# Estado del proyecto — Qontexto Dashboard

## Contexto

Este proyecto es el frontend del sistema **Narrative Intelligence**.
Pipeline (backend): `github.com/asinorum/narrative-intelligence`
API pública: `https://api.qontexto.com`
Deploy: `https://qontexto.com`

---

## Próxima sesión — continuar aquí

**1. Deploy de los cambios de esta sesión:**
```bash
# En Vultr — actualizar ambos repos:
cd /opt/narrative-intelligence && git pull && docker compose up -d --build
cd /opt/qontexto-dashboard && git pull && docker compose up -d --build
```

**2. Activar Sentry DSN** (5 min — cuenta pendiente en sentry.io):
```bash
echo "SENTRY_DSN=<dsn>" >> /opt/narrative-intelligence/.env
docker compose up -d --build
```

**3. Probar flujo completo en producción:**
- Crear sesión con webhook_url (si hay endpoint del cliente)
- Verificar que el poll funciona con read_token (fix aplicado en esta sesión)
- Descargar PDF con botón "Snapshot PDF" (nuevo)

---

## Cambios aplicados en esta sesión (2026-05-06)

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

---

## Backlog — próximas fases del dashboard

| Prioridad | Fase | Descripción | Depende de |
|---|---|---|---|
| 1 | **Fase D1** | Costos en vivo: panel con `GET /session/{id}/costs?token=` | Backend Fase 16 ✅ |
| 2 | **Fase D2** | Campo webhook_url en UI de nueva sesión | Backend Fase 12 ✅ |
| 3 | **Fase D3** | Indicador de sesiones anteriores recuperadas desde Redis | Backend Fase 17 ✅ |
| 4 | **Fase D4** | Multi-tenancy: login + aislar sesiones por cliente | Backend Fase 21 (pendiente) |
| 5 | **Fase D5** | Página de creación de sesión (sector, emisoras, webhook) | — |

### Fase D1 — Panel de costos (estimado: 2 h)

`GET /session/{id}/costs?token=` devuelve:
```json
{
  "assemblyai": { "total_usd": 0.57, "streams": {...} },
  "anthropic": {
    "haiku": { "cost_usd": 0.012, "calls": 320 },
    "sonnet": { "cost_usd": 0.045, "calls": 4 }
  },
  "totals": { "total_usd": 0.63, "suggested_price_usd": 1.57 }
}
```
Mostrar como stat cards debajo de Streams/Alertas: `$0.63 costo · $1.57 precio sugerido`.
Poll junto con el estado (30s). Sin dependencias nuevas.

### Fase D2 — Campo webhook_url (estimado: 1 h)

`POST /session/start` acepta `webhook_url: ""`.
Si hay UI de creación de sesión: añadir campo de texto para la URL del webhook.
Si no hay UI (sesiones creadas externamente): mostrar la URL configurada en la info de sesión.

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
