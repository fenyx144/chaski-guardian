// Índice ONI (Oceanic Niño Index) de la NOAA: media trimestral de la
// anomalía de temperatura en la región Niño 3.4. Define la fase El Niño/La Niña.

interface NinoData {
  oni: number;
  periodo: string;
  fase: "El Niño" | "La Niña" | "Neutral";
  actualizado: string;
  fuente: string;
}

function faseDe(oni: number): NinoData["fase"] {
  if (oni >= 0.5) return "El Niño";
  if (oni <= -0.5) return "La Niña";
  return "Neutral";
}

export async function GET() {
  try {
    const res = await fetch("https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt", {
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`NOAA respondió ${res.status}`);
    const texto = await res.text();
    // Formato real: SEAS  YR   TOTAL   ANOM  (ej: "ASO 2026  29.23   2.46")
    const filas = texto
      .split("\n")
      .map((l) => l.trim().split(/\s+/))
      .filter((p) => p.length >= 4 && /^\d{4}$/.test(p[1]) && !Number.isNaN(Number(p[3])));

    // Las filas futuras traen -99.9 (dato aún no disponible).
    const valida = filas.filter((p) => Number(p[3]) > -90);
    const ultima = valida[valida.length - 1];
    if (!ultima) throw new Error("sin datos válidos");

    const oni = Number(ultima[3]);
    const data: NinoData = {
      oni,
      periodo: `${ultima[1]} · ${ultima[0]}`,
      fase: faseDe(oni),
      actualizado: new Date().toISOString(),
      fuente: "NOAA Climate Prediction Center (ONI)",
    };
    return Response.json(data);
  } catch (e) {
    return Response.json(
      { error: `No se pudo obtener el índice de El Niño (${e instanceof Error ? e.message : "fuente no disponible"}).` },
      { status: 502 }
    );
  }
}
