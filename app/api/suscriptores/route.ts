import { NextResponse } from "next/server";
import {
  listarSuscriptores,
  guardarSuscriptor,
  normalizarTelefono,
  esQuebradaValida,
  enmascarar,
} from "@/lib/suscriptores";

// GET /api/suscriptores -> lista con números ENMASCARADOS (nunca el número completo).
export async function GET() {
  const lista = await listarSuscriptores();
  return NextResponse.json({
    suscriptores: lista.map((s) => ({
      id: s.id,
      fecha: s.fecha,
      telefono: enmascarar(s.telefono),
      quebradaId: s.quebradaId,
    })),
    total: lista.length,
  });
}

// POST /api/suscriptores { telefono, quebradaId, consentimiento }
export async function POST(req: Request) {
  let body: { telefono?: string; quebradaId?: string; consentimiento?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }
  const telefono = normalizarTelefono(body.telefono ?? "");
  if (!telefono) {
    return NextResponse.json(
      { error: "Teléfono inválido: debe ser +51 seguido de 9 dígitos (ej: +51 987 654 321)." },
      { status: 400 }
    );
  }
  if (!body.quebradaId || !esQuebradaValida(body.quebradaId)) {
    return NextResponse.json({ error: "Elige una quebrada válida." }, { status: 400 });
  }
  if (body.consentimiento !== true) {
    return NextResponse.json(
      { error: "Necesitamos tu consentimiento para enviarte alertas por WhatsApp." },
      { status: 400 }
    );
  }
  const { suscriptor, nuevo } = await guardarSuscriptor({
    telefono,
    quebradaId: body.quebradaId,
    consentimiento: true,
  });
  return NextResponse.json(
    {
      ok: true,
      nuevo,
      suscriptor: { telefono: enmascarar(suscriptor.telefono), quebradaId: suscriptor.quebradaId },
      mensaje: nuevo
        ? "¡Listo! Te avisaremos por WhatsApp cuando tu quebrada esté en riesgo."
        : "Ya estabas suscrito/a a las alertas de esta quebrada.",
    },
    { status: nuevo ? 201 : 200 }
  );
}
