import { NextResponse } from "next/server";

// Cuadrícula fina del Pacífico oriental para mapas de calor suaves:
// temperatura del mar, aire, lluvia y nubes (todo real, Open-Meteo/Copernicus).

const PASO = 5;
const LAT_INI = -60;
const LAT_FIN = 20;
const LON_INI = -180;
const LON_FIN = -30;

const LATS: number[] = [];
for (let la = LAT_INI; la <= LAT_FIN; la += PASO) LATS.push(la);
const LONS: number[] = [];
for (let lo = LON_INI; lo <= LON_FIN; lo += PASO) LONS.push(lo);

const LOTE = 50;
const redondea = (n: number) => Math.round(n * 10) / 10;

interface PuntoMar {
  current?: { sea_surface_temperature?: number };
}
interface PuntoAire {
  current?: { temperature_2m?: number; cloud_cover?: number };
  daily?: { precipitation_sum?: (number | null)[] };
}

async function lote(pts: { lat: number; lon: number }[]) {
  const lats = pts.map((p) => p.lat).join(",");
  const lons = pts.map((p) => p.lon).join(",");
  const [mRes, fRes] = await Promise.all([
    fetch(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lats}&longitude=${lons}&current=sea_surface_temperature&timezone=UTC`,
      { signal: AbortSignal.timeout(25000) }
    ),
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,cloud_cover&daily=precipitation_sum&past_days=1&forecast_days=1&timezone=UTC`,
      { signal: AbortSignal.timeout(25000) }
    ),
  ]);
  const mar = (await mRes.json()) as PuntoMar | PuntoMar[];
  const aire = (await fRes.json()) as PuntoAire | PuntoAire[];
  const lm = Array.isArray(mar) ? mar : [mar];
  const la = Array.isArray(aire) ? aire : [aire];
  return pts.map((_, i) => {
    const sums = la[i]?.daily?.precipitation_sum ?? [];
    const lluvia = sums.reduce((acc: number, v) => acc + (v ?? 0), 0);
    return {
      sst:
        typeof lm[i]?.current?.sea_surface_temperature === "number"
          ? redondea(lm[i].current!.sea_surface_temperature!)
          : null,
      aire:
        typeof la[i]?.current?.temperature_2m === "number"
          ? redondea(la[i].current!.temperature_2m!)
          : null,
      nubes:
        typeof la[i]?.current?.cloud_cover === "number" ? Math.round(la[i].current!.cloud_cover!) : null,
      lluvia: redondea(lluvia),
    };
  });
}

export async function GET() {
  try {
    const puntos: { lat: number; lon: number }[] = [];
    for (const la of LATS) for (const lo of LONS) puntos.push({ lat: la, lon: lo });

    const lotes: { lat: number; lon: number }[][] = [];
    for (let i = 0; i < puntos.length; i += LOTE) lotes.push(puntos.slice(i, i + LOTE));

    const res = await Promise.all(lotes.map((l) => lote(l).catch(() => null)));
    if (res.some((r) => r === null)) throw new Error("lotes incompletos");
    const vals = (res as Awaited<ReturnType<typeof lote>>[]).flat();
    if (vals.length !== puntos.length) throw new Error("cuadrícula incompleta");

    const filas = LATS.length;
    const cols = LONS.length;
    const grilla = <T,>(fn: (v: (typeof vals)[number]) => T): T[][] =>
      Array.from({ length: filas }, (_, r) =>
        Array.from({ length: cols }, (_, c) => fn(vals[r * cols + c]))
      );
    const sst = grilla((v) => v.sst);
    const aire = grilla((v) => v.aire);
    const nubes = grilla((v) => v.nubes);
    const lluvia = grilla((v) => v.lluvia);

    return NextResponse.json(
      {
        lats: LATS,
        lons: LONS,
        paso: PASO,
        sst,
        aire,
        nubes,
        lluvia,
        actualizado: new Date().toISOString(),
        fuente: "Open-Meteo + Copernicus",
      },
      { headers: { "Cache-Control": "public, s-maxage=3600" } }
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudo pintar el mapa. Reintenta en unos minutos." },
      { status: 502 }
    );
  }
}
