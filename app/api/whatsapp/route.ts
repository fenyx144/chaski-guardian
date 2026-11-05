import { NextResponse } from "next/server";
import { calcularRiesgo, SEMAFORO_META } from "@/lib/risk";
import { quebradaMasCercana } from "@/lib/quebradas";
import { obtenerLluvia } from "@/lib/openmeteo";
import { guardarReporte } from "@/lib/store";

// Webhook de WhatsApp Cloud API.
// GET: verificación con WHATSAPP_VERIFY_TOKEN. POST: mensajes entrantes.

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Verificación fallida." }, { status: 403 });
}

interface WaMessage {
  from?: string;
  type?: string;
  text?: { body?: string };
  location?: { latitude?: number; longitude?: number };
  image?: { id?: string; caption?: string };
}

async function enviarWhatsApp(to: string, texto: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    console.log(`[whatsapp-demo] Para ${to}: ${texto}`);
    return;
  }
  await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: texto.slice(0, 4000) },
    }),
  });
}

async function textoRiesgo(lat: number, lon: number): Promise<string> {
  const q = quebradaMasCercana(lat, lon);
  try {
    const { lluvia24h, lluvia48h } = await obtenerLluvia(lat, lon);
    const r = calcularRiesgo({ lluvia24h, lluvia48h, pendiente: q.pendienteEstimada });
    const meta = SEMAFORO_META[r.semaforo];
    return (
      `🟢🟡🔴 Chaski Guardian · ${q.nombre}\n` +
      `Semáforo: ${meta.titulo} (${r.score}/100)\n${r.explicacion}\n` +
      `Qué hacer: ${meta.accion}\n(Estimación ilustrativa.)`
    );
  } catch {
    return (
      `Chaski Guardian · ${q.nombre}: no pude consultar la lluvia ahora mismo. ` +
      `Si ves el cauce crecido, aléjate a zona alta y avisa al 119.`
    );
  }
}

const AYUDA =
  "Soy Chaski Guardian 🌊. Envíame:\n" +
  "· tu UBICACIÓN para darte el semáforo de tu zona,\n" +
  "· una FOTO del daño para analizarla,\n" +
  "· o escribe AYUDA para ver este mensaje.";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }
  const mensajes: WaMessage[] =
    (body as { entry?: { changes?: { value?: { messages?: WaMessage[] } }[] }[] })
      ?.entry?.flatMap((e) => e.changes ?? [])
      ?.flatMap((c) => c.value?.messages ?? []) ?? [];

  for (const m of mensajes) {
    const from = m.from ?? "desconocido";
    try {
      if (m.type === "location" && m.location?.latitude != null && m.location?.longitude != null) {
        const { latitude: lat, longitude: lon } = m.location;
        const q = quebradaMasCercana(lat, lon);
        const respuesta = await textoRiesgo(lat, lon);
        await guardarReporte({
          quebradaId: q.id,
          lat,
          lon,
          tipo: "consulta",
          descripcion: "Consulta de semáforo por WhatsApp.",
          semaforo: "verde",
          score: 0,
          fuente: "whatsapp",
        }).catch(() => undefined);
        await enviarWhatsApp(from, respuesta);
      } else if (m.type === "image") {
        await enviarWhatsApp(
          from,
          "Recibí tu foto 📷. Para analizarla necesito que la subas también en la web de Chaski Guardian " +
            "(o escríbeme qué se ve: desborde, deslizamiento, vía cortada o vivienda afectada). " +
            "Si hay peligro inmediato, llama al 119."
        );
      } else if (m.type === "text") {
        const texto = (m.text?.body ?? "").toLowerCase();
        if (texto.includes("ayuda") || texto.includes("hola") || texto.includes("menu")) {
          await enviarWhatsApp(from, AYUDA);
        } else {
          await enviarWhatsApp(
            from,
            "Anotado. " + AYUDA + "\n\nTu mensaje: " + (m.text?.body ?? "").slice(0, 200)
          );
        }
      } else {
        await enviarWhatsApp(from, AYUDA);
      }
    } catch (e) {
      console.error("[whatsapp] error procesando mensaje:", e);
    }
  }
  return NextResponse.json({ ok: true });
}
