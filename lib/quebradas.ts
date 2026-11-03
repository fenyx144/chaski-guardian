// Datos de ejemplo para 3 quebradas reales de Arequipa.
// Las pendientes son ESTIMACIONES gruesas para la demo, no mediciones topográficas.

export interface Quebrada {
  id: string;
  nombre: string;
  distrito: string;
  lat: number;
  lon: number;
  /** Pendiente estimada del cauce en grados (ESTIMACIÓN, no medición). */
  pendienteEstimada: number;
  descripcion: string;
}

export const QUEBRADAS: Quebrada[] = [
  {
    id: "san-lazaro",
    nombre: "Quebrada San Lázaro",
    distrito: "Arequipa (Centro)",
    lat: -16.4021,
    lon: -71.5334,
    pendienteEstimada: 12,
    descripcion: "Cruza el barrio tradicional de San Lázaro; cauce estrecho entre viviendas.",
  },
  {
    id: "anashuayco",
    nombre: "Quebrada de Añashuayco",
    distrito: "Cerro Colorado",
    lat: -16.335,
    lon: -71.574,
    pendienteEstimada: 8,
    descripcion: "Zona de canteras de sillar; gran arrastre de material en lluvias fuertes.",
  },
  {
    id: "paucarpata",
    nombre: "Quebrada El Pato (Paucarpata)",
    distrito: "Paucarpata",
    lat: -16.424,
    lon: -71.516,
    pendienteEstimada: 15,
    descripcion: "Cauce empinado sobre zona urbana densa; historial de huaicos.",
  },
];

export function quebradaMasCercana(lat: number, lon: number): Quebrada {
  let mejor = QUEBRADAS[0];
  let mejorD = Infinity;
  for (const q of QUEBRADAS) {
    const d = (q.lat - lat) ** 2 + (q.lon - lon) ** 2;
    if (d < mejorD) {
      mejorD = d;
      mejor = q;
    }
  }
  return mejor;
}
