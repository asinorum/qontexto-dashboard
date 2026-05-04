# Estado del proyecto — Qontexto Dashboard

## Contexto

Este proyecto es el frontend del sistema **Narrative Intelligence**.
Pipeline (backend): `github.com/asinorum/narrative-intelligence`
API pública: `https://api.qontexto.com`
Deploy: `https://qontexto.com`

---

## Próxima sesión — continuar aquí

**Subfase 13.4 — Card Voces dinámico**
Reemplazar el word cloud estático con palabras reales desde `latest_snapshot.per_stream[*].top_keywords`.
Peso visual por frecuencia entre streams. Colores del semáforo según urgencia de la narrativa dominante
de cada stream.

---

## Fases

### Fase 13 — Dashboard Qontexto

| Subfase | Descripción | Estado |
|---|---|---|
| 13.1 | Proyecto base — estructura, CSS, shell estático con Docker | ✅ 2026-05-04 |
| 13.2 | Conexión API — sesión activa, poll 30s, stat cards | ✅ 2026-05-04 |
| 13.3 | Card Narrativas — pie chart dinámico, veredictos | ✅ 2026-05-04 |
| 13.4 | Card Voces — word cloud dinámico | Pendiente |
| 13.5 | Card Momento — sparkline dinámico, pill de tendencia | Pendiente |
| 13.6 | Tab Señales — timeline, análisis narrativo, emisoras | Pendiente |
| 13.7 | Deploy en qontexto.com | Pendiente |

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
