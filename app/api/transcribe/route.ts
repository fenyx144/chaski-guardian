import { NextResponse } from "next/server";

// POST /api/transcribe { audio: "data:audio/wav;base64,..." }
// Transcribe con Muse Voice Transcribe 1.0 (Meta Model API):
// POST /v1/asr/transcribe, multipart con partes "request" (JSON) y "audio".
// El audio debe ser WAV PCM mono (el chat lo convierte a 16 kHz antes de enviar).

export async function POST(req: Request) {
  let body: { audio?: string };
  try {
    body = (await req.json()) as { audio?: string };
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido: se esperaba JSON con audio." }, { status: 400 });
  }
  if (!body.audio || !body.audio.startsWith("data:audio/")) {
    return NextResponse.json(
      { error: "Falta el audio: envíalo como data URL (data:audio/...;base64,...)." },
      { status: 400 }
    );
  }

  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "No hay MODEL_API_KEY configurada: no se puede transcribir el audio." },
      { status: 502 }
    );
  }

  try {
    const [cabecera, base64] = body.audio.split(",");
    const mime = cabecera.match(/data:(audio\/[\w.+-]+)/)?.[1] ?? "audio/wav";
    if (!mime.includes("wav")) {
      return NextResponse.json(
        { error: `Formato ${mime} no compatible: Muse Voice necesita WAV PCM.` },
        { status: 400 }
      );
    }
    const bytes = Buffer.from(base64, "base64");

    const form = new FormData();
    form.append(
      "request",
      new Blob(
        [
          JSON.stringify({
            model: process.env.MODEL_VOICE_NAME || "muse-voice-transcribe-1.0",
            audioEncoding: "WAV",
            mode: "PUSH_TO_TALK",
            languageBias: ["Spanish", "English"],
          }),
        ],
        { type: "application/json" }
      )
    );
    form.append("audio", new Blob([bytes], { type: "audio/wav" }), "audio.wav");

    const baseUrl = (process.env.MODEL_BASE_URL || "https://api.meta.ai/v1").replace(/\/$/, "");
    const res = await fetch(`${baseUrl}/asr/transcribe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(60000),
    });
    const data = (await res.json().catch(() => ({}))) as {
      transcript?: string;
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new Error(data.error?.message ?? `el servicio respondió ${res.status}`);
    }
    const texto = (data.transcript ?? "").trim();
    if (!texto) throw new Error("transcripción vacía");
    return NextResponse.json({ texto });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          "No se pudo transcribir el audio " +
          `(${e instanceof Error ? e.message : "error desconocido"}). ` +
          "Intenta de nuevo o escribe tu mensaje.",
      },
      { status: 502 }
    );
  }
}
