// Cliente mínimo de Open-Meteo (sin API key): lluvia pasada 24 h y pronóstico 48 h.

export interface LluviaOm {
  lluvia24h: number;
  lluvia48h: number;
}

interface OmResponse {
  hourly?: { time?: string[]; precipitation?: (number | null)[] };
  utc_offset_seconds?: number;
}

export async function obtenerLluvia(
  lat: number,
  lon: number
): Promise<LluviaOm> {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${lat}&longitude=${lon}` +
    "&hourly=precipitation&past_days=1&forecast_days=3&timezone=auto";
  const res = await fetch(url, { signal: AbortSignal.timeout(9000) });
  if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`);
  const data = (await res.json()) as OmResponse;
  const times = data.hourly?.time ?? [];
  const prec = data.hourly?.precipitation ?? [];
  if (times.length === 0) throw new Error("Open-Meteo sin datos horarios");

  const ahora = Date.now();
  let idx = 0;
  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]).getTime();
    if (Number.isNaN(t)) continue;
    if (t <= ahora) idx = i;
    else break;
  }
  const val = (i: number) =>
    i >= 0 && i < prec.length ? prec[i] ?? 0 : 0;

  let lluvia24h = 0;
  for (let i = idx - 23; i <= idx; i++) lluvia24h += val(i);
  let lluvia48h = 0;
  for (let i = idx + 1; i <= idx + 48; i++) lluvia48h += val(i);

  return { lluvia24h, lluvia48h };
}
