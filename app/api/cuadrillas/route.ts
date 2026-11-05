import { NextResponse } from "next/server";
import {
  listarReportes,
  listarPropuestas,
  guardarPropuesta,
  cambiarEstadoPropuesta,
  type Reporte,
} from "@/lib/store";
import { CUADRILLAS_EJEMPLO, propuestaLocal, type Cuadrilla, type PropuestaBase } from "@/lib/cuadrillas";
import { listarVoluntarios, type Voluntario } from "@/lib/voluntarios";
import { zonaProhibidaEn } from "@/lib/zonas";

// GET /api/cuadrillas -> cuadrillas de ejemplo + voluntarios + propuestas.
// Las cuadrillas son "datos de ejemplo"; los voluntarios son los inscritos reales.
export async function GET() {
  return NextResponse.json({
    cuadrillas: CUADRILLAS_EJEMPLO,
    voluntarios: await listarVoluntarios(),
    propuestas: await listarPropuestas(),
    aviso: "Las cuadrillas listadas son datos de ejemplo para la demo.",
  });
}

interface PropuestaModelo {
  cuadrillaSugerida?: string;
  voluntariosAsignados?: { id?: string; nombre?: string }[];
  motivo?: string;
  equipoNecesario?: string[];
}

function extraerJson(texto: string): PropuestaModelo | null {
  const m = texto.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as PropuestaModelo;
  } catch {
    return null;
  }
}

/** Valida la salida del modelo contra las listas reales (nada inventado). */
function validar(
  j: PropuestaModelo,
  voluntarios: Voluntario[],
  cuadrillas: Cuadrilla[]
): PropuestaBase | null {
  const cuadrilla = cuadrillas.find(
    (c) => c.nombre === j.cuadrillaSugerida || c.id === j.cuadrillaSugerida
  );
  if (!cuadrilla) return null;
  const asignados = (j.voluntariosAsignados ?? [])
    .map((a) => voluntarios.find((v) => v.id === a.id || v.nombre === a.nombre))
    .filter((v): v is Voluntario => !!v)
    .slice(0, 5)
    .map((v) => ({ id: v.id, nombre: v.nombre, habilidad: v.habilidad }));
  if (!j.motivo || !Array.isArray(j.equipoNecesario)) return null;
  return {
    cuadrillaSugerida: cuadrilla.nombre,
    voluntariosAsignados: asignados,
    motivo: String(j.motivo).slice(0, 600),
    equipoNecesario: j.equipoNecesario.map((e) => String(e).slice(0, 60)).slice(0, 8),
  };
}

async function preguntarAMuse(
  reporte: Reporte,
  voluntarios: Voluntario[],
  cuadrillas: Cuadrilla[]
): Promise<PropuestaBase | null> {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) return null;
  const baseUrl = (process.env.MODEL_BASE_URL || "https://api.meta.ai/v1").replace(/\/$/, "");
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "muse-spark-1.3",
        max_tokens: 4000,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Eres Chaski Guardian, coordinador de emergencias por lluvias en Arequipa, Perú. " +
              "Responde SOLO con un JSON válido, sin texto extra, con esta forma exacta: " +
              '{"cuadrillaSugerida": "nombre exacto de una cuadrilla de la lista", ' +
              '"voluntariosAsignados": [{"id": "id exacto", "nombre": "nombre exacto"}], ' +
              '"motivo": "una o dos frases en español", "equipoNecesario": ["equipo 1", "equipo 2"]}. ' +
              "Elige SOLO cuadrillas y voluntarios de las listas dadas, nadie más. " +
              "Prefiere cuadrillas en estado disponible y voluntarios cuya habilidad sirva para el daño. " +
              "Esto es solo una PROPUESTA: un coordinador humano la aprueba o rechaza; nunca afirmes que ya fue asignada.",
          },
          {
            role: "user",
            content:
              `Reporte en ROJO: tipo=${reporte.tipo}, descripción=${reporte.descripcion}, ` +
              `puntaje=${reporte.score}/100, quebrada=${reporte.quebradaId}.\n` +
              `Cuadrillas (datos de ejemplo): ${JSON.stringify(cuadrillas)}\n` +
              `Voluntarios inscritos: ${JSON.stringify(voluntarios)}\n` +
              "Propón cuadrilla, voluntarios, motivo y equipo necesario.",
          },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const j = extraerJson(data.choices?.[0]?.message?.content ?? "");
    return j ? validar(j, voluntarios, cuadrillas) : null;
  } catch {
    return null;
  }
}

// POST /api/cuadrillas { reporteId } o { reporte: {...en rojo...} }
// Crea una PROPUESTA pendiente. El modelo nunca asigna sin aprobación humana
// y una zona prohibida bloquea la propuesta antes de consultar al modelo.
export async function POST(req: Request) {
  let body: {
    reporteId?: string;
    reporte?: Reporte;
    voluntarios?: Voluntario[];
    cuadrillas?: Cuadrilla[];
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }

  const reporte =
    body.reporte ??
    (body.reporteId
      ? (await listarReportes()).find((r) => r.id === body.reporteId)
      : undefined);
  if (!reporte) {
    return NextResponse.json(
      { error: "Se requiere reporteId de un reporte existente o el reporte completo." },
      { status: 404 }
    );
  }
  if (reporte.semaforo !== "rojo") {
    return NextResponse.json(
      { error: "Solo se proponen cuadrillas para reportes en rojo." },
      { status: 400 }
    );
  }

  const voluntarios = body.voluntarios ?? (await listarVoluntarios());
  const cuadrillas = body.cuadrillas ?? CUADRILLAS_EJEMPLO;

  // Zonas prohibidas primero: ni el modelo ni nadie entra ahí.
  const zona = zonaProhibidaEn(reporte.lat, reporte.lon);
  if (zona) {
    const propuesta = await guardarPropuesta({
      reporteId: reporte.id,
      reporteTipo: reporte.tipo,
      cuadrillaSugerida: null,
      voluntariosAsignados: [],
      motivo: `⛔ BLOQUEADA: el punto cae dentro de la zona prohibida "${zona.nombre}". ${zona.motivo} No se asigna a nadie.`,
      equipoNecesario: [],
      estado: "bloqueada",
      origen: "bloqueada",
    });
    return NextResponse.json({ propuesta, aviso: propuesta.motivo }, { status: 201 });
  }

  const delModelo = await preguntarAMuse(reporte, voluntarios, cuadrillas);
  const base = delModelo ?? propuestaLocal(reporte, voluntarios, cuadrillas);
  const propuesta = await guardarPropuesta({
    reporteId: reporte.id,
    reporteTipo: reporte.tipo,
    ...base,
    estado: "pendiente",
    origen: delModelo ? "muse-spark-1.3" : "respaldo local",
  });
  return NextResponse.json(
    {
      propuesta,
      aviso:
        "Propuesta pendiente: nadie queda asignado hasta que el coordinador la apruebe. " +
        "Las cuadrillas son datos de ejemplo.",
    },
    { status: 201 }
  );
}

// PATCH /api/cuadrillas { id, accion: "aprobar" | "rechazar" } — decisión humana.
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
  const propuesta = await cambiarEstadoPropuesta(
    body.id,
    body.accion === "aprobar" ? "aprobada" : "rechazada"
  );
  if (!propuesta) {
    return NextResponse.json({ error: "Propuesta no encontrada." }, { status: 404 });
  }
  return NextResponse.json({ propuesta });
}
