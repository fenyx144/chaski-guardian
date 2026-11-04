import { NextResponse } from "next/server";

// Anomalía de la temperatura del mar (qué tan caliente/frío está vs. lo normal),
// datos diarios NOAA Coral Reef Watch (OSTIA), cuadrícula de 0.5°.

const ERDDAP =
  "https://coastwatch.pfeg.noaa.gov/erddap/griddap/NOAA_DHW.json" +
  "?CRW_SSTANOMALY%5B(last)%5D%5B(-35):10:(8)%5D%5B(-100):10:(-60)%5D";

interface Fila extends Array<unknown> {
  0: string;
  1: number;
  2: number;
  3: number | null;
}

export async function GET() {
  try {
    const res = await fetch(ERDDAP, {
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) throw new Error(`ERDDAP ${res.status}`);
    const json = (await res.json()) as { table?: { rows?: Fila[] } };
    const filas = json.table?.rows ?? [];
    if (filas.length === 0) throw new Error("sin filas");

    const fecha = String(filas[0][0] ?? "").slice(0, 10);
    const latSet = new Set<number>();
    const lonSet = new Set<number>();
    for (const [, la, lo] of filas) {
      latSet.add(la);
      lonSet.add(lo);
    }
    const lats = Array.from(latSet).sort((a, b) => a - b);
    const lons = Array.from(lonSet).sort((a, b) => a - b);
    const idxLa = new Map(lats.map((v, i) => [v, i] as [number, number]));
    const idxLo = new Map(lons.map((v, i) => [v, i] as [number, number]));
    const vals: (number | null)[][] = lats.map(() => lons.map(() => null));
    for (const [, la, lo, v] of filas) {
      const r = idxLa.get(la);
      const c = idxLo.get(lo);
      if (r !== undefined && c !== undefined && typeof v === "number") {
        vals[r][c] = Math.round(v * 100) / 100;
      }
    }

    return NextResponse.json(
      { lats, lons, vals, fecha, fuente: "NOAA Coral Reef Watch (OSTIA)" },
      { headers: { "Cache-Control": "public, s-maxage=21600" } }
    );
  } catch {
    return NextResponse.json(
      { error: "No llegó el mapa de anomalía. Reintenta en unos minutos." },
      { status: 502 }
    );
  }
}
