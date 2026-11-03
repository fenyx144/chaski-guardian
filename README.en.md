# Yaku Guardian 🌊

Community-based **early warning system for El Niño rains** in the ravine
(*quebrada*) neighborhoods of **Arequipa, Peru**. ([Versión en español](README.md))

> **Disclaimer:** all risk estimates are **illustrative** (approximate slopes,
> no official validation). They do not replace INDECI or SENAMHI alerts.

## Single flow: Report → Assess → Act

1. **Report** — Neighbors send location, photo, or text via WhatsApp or the web.
2. **Assess** — The system fetches real rainfall (Open-Meteo), combines it with
   the ravine's estimated slope, and returns a **green / yellow / red light**;
   photos are analyzed with vision AI (`muse-spark-1.3`).
3. **Act** — Each zone gets clear actions, and the coordinator proposes
   **crew missions** that always require **human approval**.

## Pages

| Route | Description |
|---|---|
| `/` | Traffic light per ravine, animated 2D scene, report form, and a **"Simulate heavy rain"** button (forces red for the demo video). |
| `/panel` | Coordinator panel: MapLibre map with reports and forbidden zones, report list, missions with Approve/Reject. |
| `/simulacion` | 3D terrain (three.js) with water particles by risk level. Illustrative simulation. |
| `/chat` | Plan B: WhatsApp-like chat (bubbles, photo, location) using the same webhook logic. |

## API

| Endpoint | Description |
|---|---|
| `GET /api/risk?lat&lon` | 0-100 traffic light using Open-Meteo (24 h + 48 h forecast). `&demo=rojo` forces red. |
| `POST /api/analyze` | `{image: dataURL}` → damage type, severity, 3 actions (muse-spark-1.3). |
| `GET/POST /api/whatsapp` | WhatsApp Cloud API webhook (verification + messages). |
| `GET/POST /api/reportes` | Neighbor reports (local JSON). |
| `GET/POST/PATCH /api/misiones` | Crew missions with human approval and forbidden-zone blocking. |

## Sample ravines

Data in [`lib/quebradas.ts`](lib/quebradas.ts) (**estimated** slopes):

- San Lázaro ravine (downtown Arequipa) — ~12°
- Añashuayco ravine (Cerro Colorado) — ~8°
- El Pato ravine (Paucarpata) — ~15°

Forbidden mission zones in [`data/zonas-prohibidas.json`](data/zonas-prohibidas.json).

## Setup

```bash
npm install
cp .env.example .env   # fill in MODEL_API_KEY and (optionally) WhatsApp
npm run dev            # http://localhost:3000
npm run build          # production check
npm test               # traffic-light calculation tests
```

## Environment variables

See [`.env.example`](.env.example):

| Variable | Description |
|---|---|
| `MODEL_API_KEY` | Vision model key (Chat Completions). |
| `MODEL_BASE_URL` | Base URL (default `https://api.meta.ai/v1`). |
| `MODEL_NAME` | Model (default `muse-spark-1.3`). |
| `WHATSAPP_TOKEN` | WhatsApp Cloud API token. |
| `WHATSAPP_PHONE_ID` | Meta Phone Number ID. |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification token. |

Without keys, the system still runs in demo mode (`/chat`, simulation button,
sample data).

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Framer Motion · MapLibre GL ·
three.js. No database (local JSON), no paid services.

## License

MIT — see [LICENSE](LICENSE).
