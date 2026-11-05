// Envío real por WhatsApp Cloud API (Meta). Sin librerías nuevas.
// Si faltan WHATSAPP_TOKEN o WHATSAPP_PHONE_ID, NO se envía nada y el
// resultado se marca "simulado". Nunca se registra el token.

export interface ResultadoEnvio {
  enviado: boolean;
  /** true cuando faltó configuración y el envío fue solo simulado. */
  simulado: boolean;
  detalle?: string;
}

export async function sendWhatsApp(to: string, text: string): Promise<ResultadoEnvio> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    return { enviado: false, simulado: true, detalle: "Falta configurar WhatsApp Cloud API." };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/^\+/, ""),
        type: "text",
        text: { body: text },
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      return { enviado: false, simulado: false, detalle: `WhatsApp respondió ${res.status}.` };
    }
    return { enviado: true, simulado: false };
  } catch (e) {
    return {
      enviado: false,
      simulado: false,
      detalle: e instanceof Error ? e.message : "Error de red con WhatsApp.",
    };
  }
}
