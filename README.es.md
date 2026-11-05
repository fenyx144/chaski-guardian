# Chaski Guardian 🌊

Sistema comunitario de **alerta temprana ante lluvias de El Niño** para barrios
de quebrada en **Arequipa, Perú**. ([English version](README.en.md))

> **Aviso:** todas las estimaciones de riesgo son **ilustrativas** (pendientes
> aproximadas, sin validación oficial). No reemplazan las alertas del INDECI ni
> del SENAMHI.

## Flujo único: Reportar → Evaluar → Actuar

1. **Reportar** — El vecino envía ubicación, foto o texto por WhatsApp o desde
   la web.
2. **Evaluar** — El sistema consulta la lluvia real (Open-Meteo), la combina con
   la pendiente estimada de la quebrada y devuelve un **semáforo verde / amarillo /
   rojo**; las fotos se analizan con visión IA (`muse-spark-1.3`).
3. **Actuar** — Cada zona recibe acciones claras y el coordinador propone
   **misiones de cuadrilla** que siempre requieren **aprobación humana**.

## Páginas

| Ruta | Descripción |
|---|---|
| `/` | Semáforo por quebrada, monitoreo de El Niño en vivo, escena 2D animada y formulario de reporte. |
| `/panel` | Panel del coordinador: mapa MapLibre con reportes y zonas prohibidas, lista de reportes y misiones con Aprobar/Rechazar. |
| `/simulacion` | Terreno 3D (three.js) con partículas de agua según el riesgo. Simulación ilustrativa. |
| `/chat` | Plan B: chat que simula WhatsApp (burbujas, foto, ubicación) con la misma lógica del webhook. |

## API

| Endpoint | Descripción |
|---|---|
| `GET /api/risk?lat&lon` | Semáforo 0-100 con Open-Meteo (24 h + pronóstico 48 h). `&demo=rojo` fuerza rojo. |
| `POST /api/analyze` | `{image: dataURL}` → tipo de daño, gravedad y 3 acciones (muse-spark-1.3). |
| `GET/POST /api/whatsapp` | Webhook de WhatsApp Cloud API (verificación + mensajes). |
| `GET/POST /api/reportes` | Reportes vecinales (JSON local). |
| `GET/POST/PATCH /api/misiones` | Misiones de cuadrilla con aprobación humana y bloqueo en zonas prohibidas. |

## Quebradas de ejemplo

Datos en [`lib/quebradas.ts`](lib/quebradas.ts) (pendientes **estimadas**):

- Quebrada San Lázaro (Arequipa centro) — ~12°
- Quebrada de Añashuayco (Cerro Colorado) — ~8°
- Quebrada El Pato (Paucarpata) — ~15°

Zonas prohibidas para misiones en [`data/zonas-prohibidas.json`](data/zonas-prohibidas.json).

## Instalación

```bash
npm install
cp .env.example .env   # completa MODEL_API_KEY y (opcional) WhatsApp
npm run dev            # http://localhost:3000
npm run build          # verificación de producción
npm test               # pruebas del cálculo del semáforo
```

## Variables de entorno

Ver [`.env.example`](.env.example):

| Variable | Descripción |
|---|---|
| `MODEL_API_KEY` | Clave del modelo de visión (Chat Completions). |
| `MODEL_BASE_URL` | Base URL (por defecto `https://api.meta.ai/v1`). |
| `MODEL_NAME` | Modelo (por defecto `muse-spark-1.3`). |
| `WHATSAPP_TOKEN` | Token de WhatsApp Cloud API. |
| `WHATSAPP_PHONE_ID` | Phone Number ID de Meta. |
| `WHATSAPP_VERIFY_TOKEN` | Token para verificar el webhook. |

Sin claves, el sistema sigue funcionando en modo demo (`/chat`, botón de
simulación y datos de ejemplo).

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Framer Motion · MapLibre GL ·
three.js. Sin base de datos (JSON local) ni servicios de pago.

## Licencia

MIT — ver [LICENSE](LICENSE).
