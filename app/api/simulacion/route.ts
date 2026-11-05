import { NextResponse } from "next/server";
import { QUEBRADAS, type Quebrada } from "@/lib/quebradas";
import { listarSuscriptores, enmascarar } from "@/lib/suscriptores";
import { sendWhatsApp } from "@/lib/whatsapp";
import { obtenerSimulacion, fijarSimulacion } from "@/lib/store";
import type { AlertaSimulada } from "@/lib/simulacion-estado";

// Simulación de crecida (temporal, solo en memoria): pone las quebradas en
// rojo, Muse redacta la alerta en español simple y se "envía" por WhatsApp
// a los suscriptores de cada quebrada. Sin credenciales, queda "simulado".

async function redactarAlerta(q: Quebrada): Promise<string> {
  const respaldo =
    `⚠️ SIMULACIÓN · Chaski Guardian: está bajando mucha agua por ${q.nombre} (${q.distrito}). ` +
    `Qué hacer: no cruces el cauce ni la torrentera, aléjate del agua ahora. ` +
    `Ve a la zona alta más cercana, lejos del cauce, y avisa a tus vecinos. ` +
    `Defensa Civil 115, Bomberos 116, Policía 105 (el 119 no es rescate: buzón de voz para tu familia). Esto es una simulación de práctica.`;
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) return respaldo;
  const baseUrl = (process.env.MODEL_BASE_URL || "https://api.meta.ai/v1").replace(/\/$/, "");
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "muse-spark-1.3",
        max_tokens: 2500,
        messages: [
          {
            role: "system",
            content:
              "Eres Chaski Guardian, alerta temprana comunitaria en Arequipa, Perú. " +
              "Escribes alertas CORTAS en español muy simple, pensadas para WhatsApp y para " +
              "personas asustadas. Nada de tecnicismos. Empieza siempre con: " +
              "'⚠️ SIMULACIÓN · Chaski Guardian:'. Incluye en 3 frases breves: qué está " +
              "pasando, qué hacer ahora y a dónde ir. Cierra con: 'Defensa Civil 115, Bomberos 116, Policía 105. El 119 no es una central de rescate: deja un mensaje de voz a tu familia si las líneas están saturadas.'",
          },
          {
            role: "user",
            content:
              `Simulación de crecida en ${q.nombre} (${q.distrito}). Es una ${q.tipo.toLowerCase()}: ${q.regimen} ` +
              `Cuando se activa arrastra: ${q.arrastra} Pendiente ~${q.pendienteEstimada}°. ` +
              "Redacta la alerta para los vecinos suscritos de esta quebrada.",
          },
        ],
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return respaldo;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const texto = (data.choices?.[0]?.message?.content ?? "").trim();
    return texto.length >= 40 ? texto.slice(0, 600) : respaldo;
  } catch {
    return respaldo;
  }
}

// GET /api/simulacion -> estado actual de la simulación.
export async function GET() {
  return NextResponse.json({ simulacion: await obtenerSimulacion() });
}

// POST /api/simulacion { accion: "activar" | "detener" }
export async function POST(req: Request) {
  let body: { accion?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }

  if (body.accion === "detener") {
    await fijarSimulacion({ activa: false, quebradasRojas: [], alertas: [], iniciada: null });
    return NextResponse.json({
      simulacion: await obtenerSimulacion(),
      aviso: "Simulación detenida. Los semáforos volvieron a su estado real.",
    });
  }
  if (body.accion !== "activar") {
    return NextResponse.json(
      { error: 'Acción inválida: usa "activar" o "detener".' },
      { status: 400 }
    );
  }

  // La IA propone, una persona aprueba: las alertas nacen PENDIENTES y
  // nada se envía hasta que el coordinador apruebe cada una ( PATCH ).
  const suscriptores = await listarSuscriptores();
  const alertas: AlertaSimulada[] = [];
  for (const q of QUEBRADAS) {
    const texto = await redactarAlerta(q);
    const vecinos = suscriptores.filter((s) => s.quebradaId === q.id);
    alertas.push({
      quebradaId: q.id,
      nombre: q.nombre,
      texto,
      estado: "pendiente",
      vecinos: vecinos.length,
      numeros: vecinos.map((v) => enmascarar(v.telefono)),
      envio: "pendiente",
      fecha: new Date().toISOString(),
    });
  }

  await fijarSimulacion({
    activa: true,
    quebradasRojas: QUEBRADAS.map((q) => q.id),
    alertas,
    iniciada: new Date().toISOString(),
  });
  return NextResponse.json({
    simulacion: await obtenerSimulacion(),
    aviso:
      "SIMULACIÓN activa: las quebradas están en rojo. Muse ya redactó las alertas, " +
      "pero nadie las recibió: quedan pendientes de tu aprobación.",
  });
}

// PATCH /api/simulacion { quebradaId, accion: "aprobar" | "rechazar" }
// Recién al aprobar se envía (WhatsApp real o simulado) a los suscriptores.
export async function PATCH(req: Request) {
  let body: { quebradaId?: string; accion?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }
  if (!body.quebradaId || (body.accion !== "aprobar" && body.accion !== "rechazar")) {
    return NextResponse.json(
      { error: 'Se requiere quebradaId y accion ("aprobar" o "rechazar").' },
      { status: 400 }
    );
  }
  const sim = await obtenerSimulacion();
  const alerta = sim.alertas.find((a) => a.quebradaId === body.quebradaId);
  if (!alerta) {
    return NextResponse.json({ error: "Alerta no encontrada. Activa la simulación primero." }, { status: 404 });
  }
  if (alerta.estado !== "pendiente") {
    return NextResponse.json({ error: `Esa alerta ya fue ${alerta.estado}.` }, { status: 409 });
  }

  if (body.accion === "rechazar") {
    alerta.estado = "rechazada";
    await fijarSimulacion(sim);
    return NextResponse.json({
      simulacion: sim,
      aviso: `Alerta de ${alerta.nombre} rechazada. No se envió nada a nadie.`,
    });
  }

  // Aprobada por una persona: recién ahora se envía.
  const vecinos = (await listarSuscriptores()).filter((s) => s.quebradaId === alerta.quebradaId);
  let enviados = 0;
  let simulado = vecinos.length === 0;
  for (const v of vecinos) {
    const r = await sendWhatsApp(v.telefono, alerta.texto);
    if (r.enviado) enviados++;
    if (r.simulado) simulado = true;
  }
  alerta.estado = "aprobada";
  alerta.envio = simulado ? "simulado" : enviados === vecinos.length ? "enviado" : "con fallos";
  alerta.vecinos = vecinos.length;
  alerta.numeros = vecinos.map((v) => enmascarar(v.telefono));
  await fijarSimulacion(sim);
  return NextResponse.json({
    simulacion: sim,
    aviso:
      alerta.envio === "simulado"
        ? `Alerta de ${alerta.nombre} aprobada. Sin credenciales de WhatsApp: envío simulado a ${vecinos.length} vecinos.`
        : `Alerta de ${alerta.nombre} aprobada y enviada a ${enviados} de ${vecinos.length} vecinos.`,
  });
}
