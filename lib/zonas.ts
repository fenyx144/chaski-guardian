import zonasData from "../data/zonas-prohibidas.json";

export interface ZonaProhibida {
  id: string;
  nombre: string;
  motivo: string;
  /** Anillo [lon, lat] cerrado o abierto. */
  poligono: [number, number][];
}

export const ZONAS_PROHIBIDAS: ZonaProhibida[] = zonasData.zonas as ZonaProhibida[];

/** Ray-casting sobre el polígono (lon/lat). */
export function puntoEnPoligono(
  lon: number,
  lat: number,
  poligono: [number, number][]
): boolean {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i];
    const [xj, yj] = poligono[j];
    if (
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      dentro = !dentro;
    }
  }
  return dentro;
}

/** Devuelve la zona prohibida que contiene el punto, o null. */
export function zonaProhibidaEn(
  lat: number,
  lon: number
): ZonaProhibida | null {
  for (const z of ZONAS_PROHIBIDAS) {
    if (puntoEnPoligono(lon, lat, z.poligono)) return z;
  }
  return null;
}
