import { NextResponse } from "next/server";
import { listarVoluntarios, guardarVoluntario, esHabilidad } from "@/lib/voluntarios";

// GET /api/voluntarios -> voluntarios inscritos (data/voluntarios.json)
export async function GET() {
  return NextResponse.json({ voluntarios: await listarVoluntarios() });
}

// POST /api/voluntarios { nombre, distrito, habilidad, disponibilidad }
export async function POST(req: Request) {
  let body: { nombre?: string; distrito?: string; habilidad?: string; disponibilidad?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }
  const nombre = (body.nombre ?? "").trim().slice(0, 80);
  const distrito = (body.distrito ?? "").trim().slice(0, 80);
  const habilidad = (body.habilidad ?? "").trim();
  const disponibilidad = (body.disponibilidad ?? "").trim().slice(0, 80);
  if (!nombre || !distrito || !disponibilidad || !esHabilidad(habilidad)) {
    return NextResponse.json(
      {
        error:
          "Faltan datos: nombre, distrito, disponibilidad y una habilidad válida " +
          "(rescate, salud, logística o transporte).",
      },
      { status: 400 }
    );
  }
  const voluntario = await guardarVoluntario({ nombre, distrito, habilidad, disponibilidad });
  return NextResponse.json({ voluntario }, { status: 201 });
}
