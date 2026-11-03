import { NextResponse } from "next/server";
import { listarReportes, guardarReporte } from "@/lib/store";
import { calcularRiesgo, type Semaforo } from "@/lib/risk";
import { quebradaMasCercana, QUEBRADAS } from "@/lib/quebradas";
import { obtenerLluvia } from "@/lib/openmeteo";

export async function GET() {
  return NextResponse.json({ reportes: await listarReportes() });
}

// POST /api/reportes { lat, lon, quebradaId?, tipo, descripcion, foto? }
export async function POST(req: Request) {
  let body: {
    lat?: number;
    lon?: number;
    quebradaId?: string;
    tipo?: string;
    descripcion?: string;
    foto?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }
  const { lat, lon } = body;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat y lon numéricos requeridos." }, { status: 400 });
  }

  const q =
    QUEBRADAS.find((x) => x.id === body.quebradaId) ??
    quebradaMasCercana(lat as number, lon as number);

  let semaforo: Semaforo = "verde";
  let score = 0;
  try {
    const { lluvia24h, lluvia48h } = await obtenerLluvia(lat as number, lon as number);
    const r = calcularRiesgo({ lluvia24h, lluvia48h, pendiente: q.pendienteEstimada });
    semaforo = r.semaforo;
    score = r.score;
  } catch {
    // Sin Open-Meteo, el reporte se guarda igual en verde con score 0.
  }

  const rep = await guardarReporte({
    quebradaId: q.id,
    lat: lat as number,
    lon: lon as number,
    tipo: (body.tipo ?? "otro").slice(0, 60),
    descripcion: (body.descripcion ?? "").slice(0, 500),
    semaforo,
    score,
    fuente: "vecino",
    foto: body.foto?.slice(0, 2_000_000),
  });
  return NextResponse.json({ reporte: rep }, { status: 201 });
}
