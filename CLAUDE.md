# Qontexto Dashboard

## Qué es este proyecto

`qontexto.com` es el frontend del sistema **Narrative Intelligence** — un servicio de monitoreo
de radio en tiempo real que transcribe, analiza y correlaciona narrativas mediáticas en Perú.

Este repo contiene exclusivamente el dashboard web. El pipeline de inteligencia (STT, LLM,
correlación de narrativas) vive en el repo `narrative-intelligence` y se expone como API en
`https://api.qontexto.com`.

## Rol en el sistema completo

```
[Radios AM/FM]
      ↓ audio stream
[narrative-intelligence]  ← repo del pipeline (backend)
      ↓ REST API
[qontexto-dashboard]      ← este repo (frontend)
      ↓ browser
[Analista / Director]
```

El analista opera el dashboard. El director toma decisiones a partir de los cards.
El pipeline lo opera el equipo técnico — el dashboard es de solo lectura.

## API

- Base URL producción: `https://api.qontexto.com`
- Base URL desarrollo: `http://localhost:8000`
- Autenticación: header `X-API-Key`
- Swagger: `https://api.qontexto.com/docs`

Endpoints que consume el dashboard:

| Endpoint | Uso |
|---|---|
| `GET /sessions` | Listar sesiones activas |
| `GET /session/{id}/state` | Estado en tiempo real (poll cada 30s) |
| `POST /report/generate` | Generar reporte bajo demanda |
| `GET /report/{id}/pdf` | Descargar PDF (Fase 7b — pendiente en backend) |

## Stack

- Vanilla HTML + CSS + JavaScript (sin frameworks)
- Chart.js (CDN) — pie chart y sparkline
- Google Sans Flex (Google Fonts)
- Docker: `nginx:alpine` sirviendo archivos estáticos
- Deploy: Vultr VPS `64.176.16.172`, detrás de nginx host con SSL

## Diseño

Sistema de diseño: **Material You Enterprise** en modo claro y oscuro.
Documento de referencia completo: `narrative-intelligence/docs/Diseño.md`
Prototipo HTML: `narrative-intelligence/docs/qontexto_dashboard_v1.html`

Reglas críticas:
- Los tres cards principales se llaman **Narrativas / Voces / Momento** — nunca ¿Qué?/¿Cómo?/¿Cuándo?
- El color nunca es decorativo — semáforo de urgencia: rojo oscuro / rojo / ámbar / verde
- Nunca mostrar scores numéricos (`0.22`) — traducir a veredicto (Alerta máxima / Señal temprana / Emergiendo / Estable)
- Máximo 4 narrativas con color — el resto en "Otros" con color neutro
- Cada card debe funcionar como pantallazo autónomo

## Público objetivo

- **Analista de Inteligencia Mediática** — opera el dashboard, toma pantallazos, presenta al director
- **Director de Comunicaciones** — no opera la herramienta, decide en base a los cards

## Comandos de desarrollo

```bash
# Desarrollo local (requiere API corriendo en localhost:8000)
open index.html

# Docker local
docker compose up

# Deploy en Vultr (desde el servidor)
git pull
docker compose up -d --build
```

## Convenciones

- Sin frameworks — HTML/CSS/JS puro para minimizar dependencias
- Chart.js solo para pie chart y sparkline (word cloud es CSS puro)
- Toda llamada a la API va en `js/api.js`
- Los tokens de color CSS viven en `css/tokens.css`
- Timestamps siempre en hora de Lima (UTC-5, PE)
