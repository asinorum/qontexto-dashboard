# Estado del proyecto — Qontexto Dashboard

## Contexto

Este proyecto es el frontend del sistema **Narrative Intelligence**.
Pipeline (backend): `github.com/asinorum/narrative-intelligence`
API pública: `https://api.qontexto.com`
Deploy: `https://qontexto.com`

---

## Próxima sesión — continuar aquí

**Prerequisitos antes de implementar Fase 21.6 (hacer primero en Vultr):**

1. **`ADMIN_API_KEY`** — agregar al `.env` del backend:
   ```bash
   echo "ADMIN_API_KEY=<valor-secreto>" >> /opt/narrative-intelligence/.env
   docker compose up -d --build
   ```
   Sin esta variable, `/admin/clients` devuelve 503.

2. **Auth0 Action** — inyectar `client_id` en el JWT:
   Panel Auth0 → Actions → Flows → Login → añadir action:
   ```javascript
   exports.onExecutePostLogin = async (event, api) => {
     const clientId = event.user.user_metadata?.client_id || event.user.email;
     api.idToken.setCustomClaim("https://api.qontexto.com/client_id", clientId);
     api.accessToken.setCustomClaim("https://api.qontexto.com/client_id", clientId);
   };
   ```
   Sin esta Action, `client_id` no llega al backend y el aislamiento por cliente no funciona.

---

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
| 1 | **Fase D4** | Multi-tenancy: login + aislar sesiones por cliente | Backend Fase 21 ✅ |
| 2 | **Fase D5** | Página de creación de sesión (sector, emisoras, webhook) | — |

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
| **21.6** | **Dashboard: Auth0 SPA SDK — login flow, token en headers** | **Pendiente** |

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
