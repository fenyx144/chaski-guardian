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
  // Una hora sin dato NO vale 0: si faltan pocos, se escala la suma con
  // las horas presentes; si falta mas del 25% de la ventana, se lanza
  // error para que la ruta responda "desconocido", nunca un verde falso.
  const ventana = (desde: number, hasta: number): number => {
    const total = hasta - desde + 1;
    let suma = 0;
    let presentes = 0;
    for (let i = desde; i <= hasta; i++) {
      const v = i >= 0 && i < prec.length ? prec[i] : null;
      if (typeof v === "number" && Number.isFinite(v)) {
        suma += v;
        presentes++;
      }
    }
    const faltantes = total - presentes;
    if (presentes === 0 || faltantes / total > 0.25) {
      throw new Error(
        `Open-Meteo con demasiados huecos de precipitacion (${faltantes}/${total} horas)`
      );
    }
    return suma * (total / presentes);
  };

  return {
    lluvia24h: ventana(idx - 23, idx),
    lluvia48h: ventana(idx + 1, idx + 48),
  };
}
