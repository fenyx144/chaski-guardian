import { NextResponse } from "next/server";
import { calcularRiesgo } from "@/lib/risk";
import { quebradaMasCercana } from "@/lib/quebradas";
import { obtenerLluvia } from "@/lib/openmeteo";

function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLa = ((lat2 - lat1) * Math.PI) / 180;
  const dLo = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLa / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLo / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10;
}

export interface Caudal {
  hoy: number | null;
  max7: number | null;
}

async function caudalRio(lat: number, lon: number): Promise<Caudal> {
  try {
    const res = await fetch(
      `https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lon}&daily=river_discharge&forecast_days=7`,
      { signal: AbortSignal.timeout(9000) }
    );
    if (!res.ok) return { hoy: null, max7: null };
    const d = (await res.json()) as { daily?: { river_discharge?: (number | null)[] } };
    const vals = (d.daily?.river_discharge ?? []).filter(
      (v): v is number => typeof v === "number"
    );
    if (vals.length === 0) return { hoy: null, max7: null };
    return {
      hoy: Math.round(vals[0] * 100) / 100,
      max7: Math.round(Math.max(...vals.slice(0, 7)) * 100) / 100,
    };
  } catch {
    return { hoy: null, max7: null };
  }
}

// GET /api/risk?lat=-16.40&lon=-71.53 [&demo=rojo] [&lang=en]
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const demo = searchParams.get("demo");
  const idioma = searchParams.get("lang") === "en" ? "en" : "es";

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: "Parámetros lat y lon requeridos (ej: /api/risk?lat=-16.40&lon=-71.53)." },
      { status: 400 }
    );
  }

  const q = quebradaMasCercana(lat, lon);
  const distKm = distanciaKm(lat, lon, q.lat, q.lon);

  if (demo === "rojo") {
    const r = calcularRiesgo(
      { lluvia24h: 30, lluvia48h: 40, pendiente: q.pendienteEstimada, distanciaKm: distKm },
      idioma
    );
    return NextResponse.json({
      ...r,
      semaforo: "rojo" as const,
      score: Math.max(r.score, 85),
      explicacion:
        "MODO DEMO · Simulación de lluvia fuerte: semáforo forzado a rojo para la demostración. " +
        r.explicacion,
      quebrada: q,
      lluvia24h: 30,
      lluvia48h: 40,
      distanciaKm: distKm,
      caudal: { hoy: null, max7: null } as Caudal,
      openMeteoOk: false,
      demo: true,
      nota: "ESTIMACIÓN ilustrativa, no una predicción oficial.",
    });
  }

  try {
    const [{ lluvia24h, lluvia48h }, caudal] = await Promise.all([
      obtenerLluvia(lat, lon),
      caudalRio(lat, lon),
    ]);
    const r = calcularRiesgo(
      {
        lluvia24h,
        lluvia48h,
        pendiente: q.pendienteEstimada,
        distanciaKm: distKm,
      },
      idioma
    );
    return NextResponse.json({
      ...r,
      quebrada: q,
      lluvia24h,
      lluvia48h,
      distanciaKm: distKm,
      caudal,
      openMeteoOk: true,
      nota:
        idioma === "en"
          ? "Illustrative ESTIMATE with approximate slope, not an official forecast."
          : "ESTIMACIÓN ilustrativa con pendiente aproximada, no una predicción oficial.",
    });
  } catch (e) {
    const caudal = await caudalRio(lat, lon);
    const r = calcularRiesgo(
      { lluvia24h: 0, lluvia48h: 0, pendiente: q.pendienteEstimada, distanciaKm: distKm },
      idioma
    );
    return NextResponse.json({
      ...r,
      explicacion:
        "Sin conexión a Open-Meteo; estimación parcial solo con pendiente. " + r.explicacion,
      quebrada: q,
      lluvia24h: 0,
      lluvia48h: 0,
      distanciaKm: distKm,
      caudal,
      openMeteoOk: false,
      errorFuente: e instanceof Error ? e.message : "fuente no disponible",
      nota:
        idioma === "en"
          ? "Illustrative ESTIMATE, not an official forecast."
          : "ESTIMACIÓN ilustrativa, no una predicción oficial.",
    });
  }
}
