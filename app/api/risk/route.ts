import { NextResponse } from "next/server";
import { calcularRiesgo } from "@/lib/risk";
import { quebradaMasCercana } from "@/lib/quebradas";
import { obtenerLluvia } from "@/lib/openmeteo";

// GET /api/risk?lat=-16.40&lon=-71.53 [&demo=rojo]
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const demo = searchParams.get("demo");

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: "Parámetros lat y lon requeridos (ej: /api/risk?lat=-16.40&lon=-71.53)." },
      { status: 400 }
    );
  }

  // Modo demo para el video: fuerza semáforo rojo.
  if (demo === "rojo") {
    const q = quebradaMasCercana(lat, lon);
    const r = calcularRiesgo({ lluvia24h: 30, lluvia48h: 40, pendiente: q.pendienteEstimada });
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
      openMeteoOk: false,
      demo: true,
      nota: "ESTIMACIÓN ilustrativa, no una predicción oficial.",
    });
  }

  const q = quebradaMasCercana(lat, lon);
  try {
    const { lluvia24h, lluvia48h } = await obtenerLluvia(lat, lon);
    const r = calcularRiesgo({
      lluvia24h,
      lluvia48h,
      pendiente: q.pendienteEstimada,
    });
    return NextResponse.json({
      ...r,
      quebrada: q,
      lluvia24h,
      lluvia48h,
      openMeteoOk: true,
      nota: "ESTIMACIÓN ilustrativa con pendiente aproximada, no una predicción oficial.",
    });
  } catch (e) {
    // Sin conexión a Open-Meteo: responde igual, marcándolo con claridad.
    const r = calcularRiesgo({ lluvia24h: 0, lluvia48h: 0, pendiente: q.pendienteEstimada });
    return NextResponse.json({
      ...r,
      explicacion:
        "Sin conexión a Open-Meteo; estimación parcial solo con pendiente. " + r.explicacion,
      quebrada: q,
      lluvia24h: 0,
      lluvia48h: 0,
      openMeteoOk: false,
      errorFuente: e instanceof Error ? e.message : "fuente no disponible",
      nota: "ESTIMACIÓN ilustrativa, no una predicción oficial.",
    });
  }
}
