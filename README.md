# Chaski Guardian

**Community early warning for El Niño floods and landslides in Peru, starting with the ravine neighborhoods of Arequipa.**

Before the rain, a family should know whether their ravine (*quebrada*) is at risk and what to do. Chaski Guardian turns live weather and ocean data, neighbor photos and reports into a simple traffic light (green, yellow, red) with clear actions, and helps a coordinator send help with **human judgment**: an AI proposes, a person approves.

> Built for the **Meta Global AI Developer Hackathon** (Indie Developer track), Oct 26 - Nov 4, 2026, with Meta Muse Spark and Muse Code.
> Spanish version: [README.es.md](README.es.md)

> **Important:** every risk value is an **illustrative estimate** for prioritizing attention. It is not a prediction and does not replace official alerts from INDECI or SENAMHI.

---

## Submission

| | |
|---|---|
| Hackathon | Meta Global AI Developer Hackathon, Oct 26 - Nov 4, 2026 |
| Track | Indie Developer |
| Team | Diego Rivas Revilla ([@fenyx144](https://github.com/fenyx144)), Arequipa, Peru |
| Demo video (3 min) | VIDEO_URL_AQUI |
| Live demo | DEMO_URL_AQUI (or run locally, see below) |
| Code | this repository, MIT license |
| Meta models | `muse-spark-1.3` (image analysis, mission proposals), `muse-voice-transcribe-1.0` (transcription endpoint), Muse Code (development) |
| New work | All code was written during the event window; the commit history starts on Nov 3, 2026. |

---
## Why this matters

During El Niño, heavy rain turns dry ravines into torrents (*huaicos*) within minutes. The families living in those ravines often get little or no warning, and coordinators lack a quick, shared picture of who needs help first. Chaski Guardian focuses on one flow:

**Report -> Evaluate -> Act**

1. **Report.** A neighbor sends a photo, a location or a message, from the web app or from WhatsApp.
2. **Evaluate.** The system combines real rainfall forecasts with the ravine's estimated slope and returns a 0-100 traffic light. Photos are analyzed by **Muse Spark** (image understanding) to describe the damage, its severity and three actions to take.
3. **Act.** Each zone gets clear actions in plain Spanish. A coordinator can ask Muse Spark to propose a crew mission, then **approve or reject it**. Proposals inside no-go zones are blocked by code before the model is even called.

## What you can try

| Route | What it does |
|---|---|
| `/` | Live El Niño monitoring (sea temperature and anomaly, rain and clouds), a "How is my ravine?" traffic light with 3D terrain and satellite view, neighbor reports on a map, and the "Habla con Chaski" assistant. |
| `/panel` | Coordinator panel: map with reports and no-go zones, crews, registered volunteers, Muse Spark mission proposals with Approve / Reject. |
| `/chat` | A chat that simulates WhatsApp (bubbles, photo, location) using the same logic as the real webhook. |

Use the **"Quiero ser voluntario"** button to sign up as a volunteer; volunteers appear in the coordinator panel and can be assigned to proposed missions.

## How Meta models are used

| Model | Where | What it does |
|---|---|---|
| **Muse Spark** (`muse-spark-1.3`) | `app/api/analyze`, mission proposals in `app/api/cuadrillas` | Reads a neighbor's photo and returns damage type, severity and actions; proposes which crew and volunteers to send, as structured JSON. It only proposes, a human decides. |
| **Muse Voice Transcribe** (`muse-voice-transcribe-1.0`) | `app/api/transcribe` | Endpoint to turn voice notes into text. Built and ready; wiring it into the chat is a next step. |
| **Muse Code** | Development | Meta's coding agent helped build parts of this project during the hackathon. |

Models are called through Meta Model API (`https://api.meta.ai/v1`) with `MODEL_API_KEY`. Without a key the app stays in demo mode and the image analysis returns a clear error instead of inventing an answer.

## Data sources

| Data | Source | Status |
|---|---|---|
| Rainfall, 24 h observed + 48 h forecast | [Open-Meteo](https://open-meteo.com) | Real |
| Sea, air, rain and cloud grid of the Pacific | Open-Meteo / Copernicus | Real |
| Sea-surface temperature anomaly | NOAA Coral Reef Watch (OSTIA), daily, 0.5 degrees | Real |
| Terrain, satellite imagery | Open map tiles (MapLibre GL) | Real |
| Ravine slope | Approximate value per ravine in `lib/quebradas.ts` | **Estimated** |
| River flow | Model estimate shown in the ravine card | **Estimated** |
| Crews | Sample data (marked "datos de ejemplo") | **Sample** |
| Volunteers | Entered by users, stored in `data/voluntarios.json` | Real input |

## Evidence

- **13 automated tests pass** (`npm test`): the traffic light goes green with no rain and low slope, yellow with moderate rain, red with heavy rain, never leaves 0-100, rises with slope at equal rain, and always explains itself in Spanish and states that it is an estimate. Crew-mission rules and the EN/ES translations are tested too.
- **Real model calls:** `/api/analyze` sends the neighbor's photo to `muse-spark-1.3` as an `image_url` through Meta Model API. With no key it returns an explicit error, never a made-up analysis.
- **Human in the loop is enforced in code:** a mission stays pending until a person approves it, and proposals in no-go zones are rejected before the model is called.
## Honest limits

- The traffic light is a **risk-prioritization estimate**, not a forecast of a specific huaico, and it has not been validated against past events.
- Slopes are approximate; the three example ravines are **Quebrada San Lázaro, Quebrada de Añashuayco and Quebrada El Pato**.
- The WhatsApp Cloud API webhook is implemented (`app/api/whatsapp`), but the demo uses the simulated `/chat` unless a real number is configured.
- The coordinator panel has **no login** in this demo; production use would require authentication for authorized coordinators.
- Voice transcription is not yet connected in the chat UI.
- Crews are sample data; there is no integration yet with the official INDECI or COER shelter and brigade registries (planned).

## Safety by design

- The model **never assigns anyone on its own**: every mission needs explicit human approval.
- **No-go zones** (`data/zonas-prohibidas.json`) are hard rules enforced in code, before the model is consulted.
- Unknown or missing data (rain, river flow, or distance) produces a visible "insufficient information" warning — never an invented answer or a reassuring green light.

## Run it locally

Requirements: Node.js 18+.

```bash
npm install
cp .env.example .env.local   # on Windows: copy .env.example .env.local
# edit .env.local and set MODEL_API_KEY
npm run dev                  # http://localhost:3000
npm test                     # tests for the risk score, crews and i18n
npm run build                # production check
```

### Environment variables

See [`.env.example`](.env.example).

| Variable | Description |
|---|---|
| `MODEL_API_KEY` | Meta Model API key (never commit it). |
| `MODEL_BASE_URL` | Defaults to `https://api.meta.ai/v1`. |
| `MODEL_NAME` | Defaults to `muse-spark-1.3`. |
| `MODEL_VOICE_NAME` | Defaults to `muse-voice-transcribe-1.0`. |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN` | Optional, for the WhatsApp Cloud API. |

## API

| Endpoint | Description |
|---|---|
| `GET /api/risk?lat&lon` | 0-100 traffic light from Open-Meteo rain (24 h + 48 h). `&demo=rojo` forces red for demos. |
| `POST /api/analyze` | `{image: dataURL}` returns damage type, severity and 3 actions (Muse Spark). |
| `POST /api/transcribe` | Voice note to text (Muse Voice Transcribe). |
| `GET/POST /api/reportes` | Neighbor reports (local JSON). |
| `GET/POST /api/voluntarios` | Volunteer sign-up and list. |
| `GET /api/cuadrillas` | Sample crews, volunteers and Muse proposals. |
| `GET/POST/PATCH /api/misiones` | Missions with human approval and no-go zone blocking. |
| `GET /api/mar`, `/api/anomalia`, `/api/nino` | Ocean and El Niño data for the live monitor. |
| `GET/POST /api/whatsapp` | WhatsApp Cloud API webhook (verification and messages). |

## Tech stack

Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, MapLibre GL, three.js. No database (local JSON) and no paid services beyond the model API.

## Roadmap

1. Connect voice notes to the chat and the WhatsApp webhook.
2. Official data: INDECI shelters and brigades, SENAMHI and ANA hydrological stations.
3. Coordinator login and roles.
4. Validate the risk score against past El Niño events.
5. Extend from Arequipa to other regions of Peru.

## Hackathon note

All code in this repository was written during the Meta Global AI Developer Hackathon window (Oct 26 - Nov 4, 2026); the first commit is dated Nov 3, 2026. Meta's Muse Code agent helped write parts of it. Open data and libraries are credited in the Data sources table and in package.json.

## License

MIT, see [LICENSE](LICENSE). Author: Diego Rivas Revilla.