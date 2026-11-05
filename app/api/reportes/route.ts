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

  // Sin Open-Meteo el reporte se guarda como "desconocido", nunca en verde.
  let semaforo: Semaforo = "desconocido";
  let score: number | null = null;
  try {
    const { lluvia24h, lluvia48h } = await obtenerLluvia(lat as number, lon as number);
    const dLat = ((q.lat - (lat as number)) * Math.PI) / 180;
    const dLon = ((q.lon - (lon as number)) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(((lat as number) * Math.PI) / 180) *
        Math.cos((q.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const distanciaKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const r = calcularRiesgo({
      lluvia24h,
      lluvia48h,
      pendiente: q.pendienteEstimada,
      distanciaKm,
      // El semáforo del reporte usa lluvia+pendiente+distancia; el caudal
      // se exige en el semáforo principal de la página, no aquí.
      caudalDisponible: true,
    });
    semaforo = r.semaforo;
    score = r.score;
  } catch {
    semaforo = "desconocido";
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
