import { NextResponse } from "next/server";

export type Fase = "El Niño" | "La Niña" | "Neutral";

export interface RegionAnomalias {
  n12: number;
  n3: number;
  n4: number;
  n34: number;
  mes: string;
}

const faseDe = (oni: number): Fase =>
  oni >= 0.5 ? "El Niño" : oni <= -0.5 ? "La Niña" : "Neutral";

async function texto(url: string): Promise<string> {
  const res = await fetch(url, {
    next: { revalidate: 21600 },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(url);
  return res.text();
}

export async function GET() {
  try {
    const [oniTxt, ersstTxt] = await Promise.all([
      texto("https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt"),
      texto("https://www.cpc.ncep.noaa.gov/data/indices/ersst5.nino.mth.91-20.ascii"),
    ]);

    const filasOni = oniTxt
      .split("\n")
      .map((l) => l.trim().split(/\s+/))
      .filter((p) => p.length >= 4 && /^\d{4}$/.test(p[1]) && !Number.isNaN(Number(p[3])));
    const validas = filasOni.filter((p) => Number(p[3]) > -90);
    const ultima = validas[validas.length - 1];
    if (!ultima) throw new Error("ONI sin datos");
    const oni = Number(ultima[3]);
    const historial = validas.slice(-12).map((p) => ({
      periodo: `${p[1]}·${p[0]}`,
      valor: Number(p[3]),
    }));

    // YR MON N12 ANOM N3 ANOM N4 ANOM N34 ANOM
    const filasEr = ersstTxt
      .split("\n")
      .map((l) => l.trim().split(/\s+/))
      .filter((p) => p.length >= 10 && /^\d{4}$/.test(p[0]) && !Number.isNaN(Number(p[9])));
    const validasEr = filasEr.filter((p) => Number(p[9]) > -90);
    const m = validasEr[validasEr.length - 1];
    if (!m) throw new Error("ERSST sin datos");
    const regiones: RegionAnomalias = {
      n12: Number(m[3]),
      n3: Number(m[5]),
      n4: Number(m[7]),
      n34: Number(m[9]),
      mes: `${m[0]}-${m[1].padStart(2, "0")}`,
    };

    return NextResponse.json({
      oni,
      periodo: `${ultima[1]} · ${ultima[0]}`,
      fase: faseDe(oni),
      historial,
      regiones,
      actualizado: new Date().toISOString(),
      fuentes: ["NOAA CPC · ONI (oni.ascii.txt)", "NOAA ERSSTv5 mensual por regiones"],
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo obtener el monitoreo de El Niño. Reintenta en unos minutos." },
      { status: 502 }
    );
  }
}
