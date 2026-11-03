import { NextResponse } from "next/server";

// POST /api/analyze { image: "data:image/jpeg;base64,..." }
// Analiza la foto con muse-spark-1.3 y devuelve tipo de daño, gravedad y acciones.

const TIPOS = ["desborde", "deslizamiento", "vía cortada", "vivienda afectada"] as const;

interface Analisis {
  tipo: (typeof TIPOS)[number] | "otro";
  gravedad: "leve" | "moderada" | "grave";
  acciones: [string, string, string];
  resumen: string;
}

function extraerJson(texto: string): Partial<Analisis> | null {
  const m = texto.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as Partial<Analisis>;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let body: { image?: string };
  try {
    body = (await req.json()) as { image?: string };
  } catch {
    return NextResponse.json(
      { error: "Cuerpo inválido: se esperaba JSON con el campo image." },
      { status: 400 }
    );
  }
  if (!body.image || typeof body.image !== "string" || !body.image.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "Falta la foto: envía image como data URL (data:image/...;base64,...)." },
      { status: 400 }
    );
  }

  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "No hay MODEL_API_KEY configurada en el servidor: no se puede analizar la foto. " +
          "Pide al coordinador que configure la clave o describe el daño por texto.",
      },
      { status: 502 }
    );
  }

  const baseUrl = (process.env.MODEL_BASE_URL || "https://api.meta.ai/v1").replace(/\/$/, "");
  const model = process.env.MODEL_NAME || "muse-spark-1.3";

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 600,
        messages: [
          {
            role: "system",
            content:
              "Eres Yaku Guardian, asistente de emergencias por lluvias en Arequipa, Perú. " +
              "Responde SIEMPRE en español con un JSON: " +
              '{"tipo": "desborde|deslizamiento|vía cortada|vivienda afectada|otro", ' +
              '"gravedad": "leve|moderada|grave", ' +
              '"acciones": ["acción 1", "acción 2", "acción 3"], ' +
              '"resumen": "una frase"}',
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "¿Qué daño por lluvia se ve en esta foto? Devuelve solo el JSON pedido.",
              },
              { type: "image_url", image_url: { url: body.image } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!res.ok) {
      const detalle = await res.text().catch(() => "");
      throw new Error(`el modelo respondió ${res.status} ${detalle.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const texto = data.choices?.[0]?.message?.content ?? "";
    const j = extraerJson(texto);

    const analisis: Analisis = {
      tipo: TIPOS.includes(j?.tipo as (typeof TIPOS)[number])
        ? (j!.tipo as (typeof TIPOS)[number])
        : "otro",
      gravedad:
        j?.gravedad === "grave" || j?.gravedad === "moderada" ? j.gravedad : "leve",
      acciones: [
        j?.acciones?.[0] ?? "Aléjate del cauce y busca zona alta.",
        j?.acciones?.[1] ?? "Avisa a tus vecinos y al coordinador de zona.",
        j?.acciones?.[2] ?? "No cruces agua torrentosa ni a pie ni en vehículo.",
      ],
      resumen: j?.resumen ?? texto.slice(0, 300) ?? "Análisis recibido.",
    };
    return NextResponse.json(analisis);
  } catch (e) {
    return NextResponse.json(
      {
        error:
          "No se pudo analizar la foto con el modelo de visión " +
          `(${e instanceof Error ? e.message : "error desconocido"}). ` +
          "Reintenta en unos minutos o describe el daño por texto.",
      },
      { status: 502 }
    );
  }
}
