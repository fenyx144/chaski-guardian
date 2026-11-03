import { NextResponse } from "next/server";
import {
  listarMisiones,
  guardarMision,
  cambiarEstadoMision,
  listarReportes,
} from "@/lib/store";
import { zonaProhibidaEn } from "@/lib/zonas";

export async function GET() {
  return NextResponse.json({ misiones: await listarMisiones() });
}

// POST /api/misiones { reporteId, titulo? } -> crea misión "pendiente"
// (o "bloqueada" con aviso si cae en zona prohibida).
export async function POST(req: Request) {
  let body: { reporteId?: string; titulo?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }
  if (!body.reporteId) {
    return NextResponse.json({ error: "reporteId requerido." }, { status: 400 });
  }
  const rep = (await listarReportes()).find((r) => r.id === body.reporteId);
  if (!rep) {
    return NextResponse.json({ error: "Reporte no encontrado." }, { status: 404 });
  }

  const zona = zonaProhibidaEn(rep.lat, rep.lon);
  if (zona) {
    const m = await guardarMision({
      reporteId: rep.id,
      titulo: (body.titulo ?? `Cuadrilla → ${rep.tipo} (${rep.quebradaId})`).slice(0, 120),
      lat: rep.lat,
      lon: rep.lon,
      estado: "bloqueada",
      motivo: `⛔ BLOQUEADA: el punto cae dentro de la zona prohibida "${zona.nombre}". ${zona.motivo}`,
    });
    return NextResponse.json(
      { mision: m, aviso: m.motivo },
      { status: 201 }
    );
  }

  const m = await guardarMision({
    reporteId: rep.id,
    titulo: (body.titulo ?? `Cuadrilla → ${rep.tipo} (${rep.quebradaId})`).slice(0, 120),
    lat: rep.lat,
    lon: rep.lon,
    estado: "pendiente",
  });
  return NextResponse.json({ mision: m }, { status: 201 });
}

// PATCH /api/misiones { id, accion: "aprobar" | "rechazar" } — aprobación humana.
export async function PATCH(req: Request) {
  let body: { id?: string; accion?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }
  if (!body.id || (body.accion !== "aprobar" && body.accion !== "rechazar")) {
    return NextResponse.json(
      { error: 'Se requiere id y accion ("aprobar" o "rechazar").' },
      { status: 400 }
    );
  }
  const m = await cambiarEstadoMision(
    body.id,
    body.accion === "aprobar" ? "aprobada" : "rechazada"
  );
  if (!m) return NextResponse.json({ error: "Misión no encontrada." }, { status: 404 });
  return NextResponse.json({ mision: m });
}
