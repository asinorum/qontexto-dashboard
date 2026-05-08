# Estado del proyecto — Qontexto Dashboard

## Contexto

Este proyecto es el frontend del sistema **Narrative Intelligence**.
Pipeline (backend): `github.com/asinorum/narrative-intelligence`
API pública: `https://api.qontexto.com`
Deploy: `https://qontexto.com`

---

## Próxima sesión — continuar aquí

**1. Deploy de los cambios acumulados (Fases D1–D3 + anteriores):**
```bash
# En Vultr — actualizar ambos repos:
cd /opt/narrative-intelligence && git pull && docker compose up -d --build
cd /opt/qontexto-dashboard && git pull && docker compose up -d --build
```
> El `docker compose up` levantará el servicio Redis automáticamente (ya configurado en docker-compose.yml).
> La primera vez: Redis vacío → sin sesiones anteriores (comportamiento correcto).

**2. Activar Sentry DSN** (5 min — cuenta pendiente en sentry.io):
```bash
echo "SENTRY_DSN=<dsn>" >> /opt/narrative-intelligence/.env
docker compose up -d --build
```

**3. Probar flujo completo en producción:**
- Crear sesión con webhook_url → verificar chip en timebar
- Verificar stat card Costos tras primer poll
- Reiniciar el contenedor y confirmar badge "N en historial" en navbar
- Descargar PDF con botón "Snapshot PDF"

---

## Cambios aplicados en esta sesión (2026-05-07)

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
| 1 | **Fase D4** | Multi-tenancy: login + aislar sesiones por cliente | Backend Fase 21 (pendiente) |
| 2 | **Fase D5** | Página de creación de sesión (sector, emisoras, webhook) | — |

### Fase D4 — Multi-tenancy con Auth0 (Fase 21 del backend)

Login por cliente vía **Auth0** (free tier — hasta 7,500 usuarios activos/mes).
Auth0 maneja rotación de tokens, refresh automático y MFA futuro sin código adicional.

**Etapas (alineadas con Fases 21.1–21.6 del backend):**

| Etapa | Descripción | Depende de |
|---|---|---|
| 21.1 | `client_id` en sesiones + filtrado `GET /sessions` | Solo backend |
| 21.2 | Auth0: tenant + aplicación + usuarios por cliente | Cuenta Auth0 |
| 21.3 | Backend: middleware JWT Auth0 | 21.2 |
| 21.4 | Aislamiento estricto en backend | 21.3 |
| 21.5 | Gestión de clientes + Redis | 21.4 |
| **21.6** | **Dashboard: Auth0 SDK — login flow, token en headers, expiración** | 21.3 |

**Cambios en el dashboard (Fase 21.6):**
- Integrar Auth0 Vanilla JS SDK
- Login flow: redirect → Auth0 → callback → token almacenado
- Token JWT enviado en `Authorization: Bearer` en cada request a la API
- Manejo de expiración: refresh automático vía Auth0 SDK
- 401/403 → redirigir a login

⚠️ Al activar 21.4: excluir `read_token` de `GET /sessions` público — actualmente cualquiera puede leerlo.

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
