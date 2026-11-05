// Segmentación con SAM 3.1 (Meta Model API, POST /v1/responses, streaming).
// Un concepto por pedido: cauce, agua y escombros. De las CAJAS devueltas se
// mide qué porcentaje del cauce está tapado (muestreo en grilla, sin librerías).

export interface Caja {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  w: number;
  h: number;
}

/** Caja normalizada 0-1 para dibujarla sobre la foto. */
export interface CajaN {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MedicionCauce {
  tapadoPct: number;
  aguaPct: number;
  escombrosPct: number;
  cajas: { cauce: CajaN[]; agua: CajaN[]; escombros: CajaN[] };
}

const RE_CAJA = /x1=(\d+);y1=(\d+);x2=(\d+);y2=(\d+);w=(\d+);h=(\d+)/g;

function extraerCajas(texto: string): Caja[] {
  const cajas: Caja[] = [];
  RE_CAJA.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RE_CAJA.exec(texto)) !== null) {
    cajas.push({
      x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4], w: +m[5], h: +m[6],
    });
  }
  return cajas;
}

async function segmentar(
  image: string,
  concepto: string,
  apiKey: string,
  baseUrl: string
): Promise<Caja[]> {
  const res = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "sam-3.1",
      stream: true,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: concepto },
            { type: "input_image", image_url: image },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok || !res.body) return [];
  const crudo = await res.text();
  let texto = "";
  for (const linea of crudo.split("\n")) {
    if (!linea.startsWith("data: ")) continue;
    try {
      const ev = JSON.parse(linea.slice(6)) as {
        type?: string;
        text?: string;
        response?: { output?: { content?: { text?: string }[] }[] };
      };
      if (ev.type === "response.output_text.done" && ev.text) texto = ev.text;
      if (ev.type === "response.completed" && !texto) {
        texto = (ev.response?.output ?? [])
          .flatMap((o) => o.content ?? [])
          .map((c) => c.text ?? "")
          .join("");
      }
    } catch { /* evento parcial */ }
  }
  return extraerCajas(texto);
}

const dentro = (c: Caja, x: number, y: number) =>
  x >= c.x1 && x <= c.x2 && y >= c.y1 && y <= c.y2;

/**
 * Mide el cauce en la foto: % tapado por agua y por escombros.
 * Devuelve null si SAM no encuentra el cauce (foto sin cauce visible).
 */
export async function medirCauce(image: string): Promise<MedicionCauce | null> {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) return null;
  const baseUrl = (process.env.MODEL_BASE_URL || "https://api.meta.ai/v1").replace(/\/$/, "");
  try {
    // Un concepto por pedido; si no hay coincidencias, se prueban sinónimos.
    const primero = async (conceptos: string[]): Promise<Caja[]> => {
      for (const c of conceptos) {
        const cajas = await segmentar(image, c, apiKey, baseUrl);
        if (cajas.length > 0) return cajas;
      }
      return [];
    };
    const [cauce, agua, escombros] = await Promise.all([
      primero(["riverbed channel", "stream", "river", "gully", "dry creek"]),
      primero(["muddy water stream", "water", "river water", "flood water"]),
      primero(["rocks and debris", "rocks", "debris pile", "rubble"]),
    ]);
    if (cauce.length === 0) return null;

    const W = Math.max(...cauce.map((c) => c.w));
    const H = Math.max(...cauce.map((c) => c.h));
    const norm = (c: Caja): CajaN => ({
      x: c.x1 / c.w, y: c.y1 / c.h, w: (c.x2 - c.x1) / c.w, h: (c.y2 - c.y1) / c.h,
    });

    // Grilla sobre la unión del cauce: % cubierto por agua / escombros.
    const xMin = Math.min(...cauce.map((c) => c.x1));
    const xMax = Math.max(...cauce.map((c) => c.x2));
    const yMin = Math.min(...cauce.map((c) => c.y1));
    const yMax = Math.max(...cauce.map((c) => c.y2));
    const N = 120;
    let total = 0, conAgua = 0, conEscombros = 0;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x = xMin + ((i + 0.5) / N) * (xMax - xMin);
        const y = yMin + ((j + 0.5) / N) * (yMax - yMin);
        if (!cauce.some((c) => dentro(c, x, y))) continue;
        total++;
        if (agua.some((c) => dentro(c, x, y))) conAgua++;
        if (escombros.some((c) => dentro(c, x, y))) conEscombros++;
      }
    }
    if (total === 0) return null;
    const aguaPct = Math.round((conAgua / total) * 100);
    const escombrosPct = Math.round((conEscombros / total) * 100);
    // Tapado total sin doble conteo: el agua y los escombros pueden solaparse.
    let tapado = 0;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x = xMin + ((i + 0.5) / N) * (xMax - xMin);
        const y = yMin + ((j + 0.5) / N) * (yMax - yMin);
        if (!cauce.some((c) => dentro(c, x, y))) continue;
        if (agua.some((c) => dentro(c, x, y)) || escombros.some((c) => dentro(c, x, y))) tapado++;
      }
    }
    void W; void H;
    return {
      tapadoPct: Math.round((tapado / total) * 100),
      aguaPct,
      escombrosPct,
      cajas: { cauce: cauce.map(norm), agua: agua.map(norm), escombros: escombros.map(norm) },
    };
  } catch {
    return null;
  }
}
