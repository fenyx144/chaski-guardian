import { NextResponse } from "next/server";

export interface CeldaMar {
  lat: number;
  lon: number;
  sst: number;
}

const PASO = 10;
const LATS: number[] = [];
for (let la = -60; la <= 60; la += PASO) LATS.push(la);
const LONS: number[] = [];
for (let lo = -180; lo < 180; lo += PASO) LONS.push(lo);

const TAMANO_LOTE = 60;

interface PuntoMar {
  latitude: number;
  longitude: number;
  current?: { sea_surface_temperature?: number };
}

async function lote(urls: { lat: number; lon: number }[]): Promise<CeldaMar[]> {
  const lats = urls.map((p) => p.lat).join(",");
  const lons = urls.map((p) => p.lon).join(",");
  const res = await fetch(
    `https://marine-api.open-meteo.com/v1/marine?latitude=${lats}&longitude=${lons}&current=sea_surface_temperature&timezone=UTC`,
    { signal: AbortSignal.timeout(25000) }
  );
  if (!res.ok) return [];
  const arr = (await res.json()) as PuntoMar | PuntoMar[];
  const lista = Array.isArray(arr) ? arr : [arr];
  return lista
    .filter((p) => typeof p.current?.sea_surface_temperature === "number")
    .map((p) => ({
      lat: p.latitude,
      lon: p.longitude,
      sst: Math.round((p.current?.sea_surface_temperature ?? 0) * 10) / 10,
    }));
}

export async function GET() {
  try {
    const puntos: { lat: number; lon: number }[] = [];
    for (const la of LATS) for (const lo of LONS) puntos.push({ lat: la, lon: lo });

    const lotes: { lat: number; lon: number }[][] = [];
    for (let i = 0; i < puntos.length; i += TAMANO_LOTE) lotes.push(puntos.slice(i, i + TAMANO_LOTE));

    const resultados = await Promise.all(lotes.map((l) => lote(l).catch(() => [] as CeldaMar[])));
    const celdas = resultados.flat();
    if (celdas.length === 0) throw new Error("mar vacío");

    return NextResponse.json(
      { celdas, paso: PASO, actualizado: new Date().toISOString(), fuente: "Open-Meteo Marine (Copernicus)" },
      { headers: { "Cache-Control": "public, s-maxage=21600" } }
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudo pintar el mar. Reintenta en unos minutos." },
      { status: 502 }
    );
  }
}
