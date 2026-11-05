// Datos de ejemplo para 3 quebradas/torrenteras reales de Arequipa.
// Las pendientes son ESTIMACIONES gruesas para la demo, no mediciones topográficas.
//
// QUEBRADA vs TORRENTERA (Arequipa):
// - Quebrada: cauce entre cerros; puede llevar agua gran parte del año.
// - Torrentera: cauce SECO casi todo el año. Solo se llena cuando llueve fuerte
//   en la parte alta (aunque en tu barrio no llueva), baja en minutos como
//   huaico con lodo, piedras y material suelto, y vuelve a secarse.
//   Por eso es la más engañosa: se ve seca y cruzarla parece seguro.
// En la ciudad, San Lázaro y El Pato funcionan como torrenteras; Añashuayco es
// quebrada con comportamiento de torrentera en época de lluvias.

export interface Quebrada {
  id: string;
  nombre: string;
  distrito: string;
  lat: number;
  lon: number;
  /** Pendiente estimada del cauce en grados (ESTIMACIÓN, no medición). */
  pendienteEstimada: number;
  descripcion: string;
  tipo: "Quebrada" | "Torrentera" | "Quebrada y torrentera";
  /** Cómo se comporta el agua durante el año. */
  regimen: string;
  /** Qué material baja cuando se activa (lodo, piedras, sillar, basura). */
  arrastra: string;
  /** Época en que se activa. */
  temporada: string;
  tipoEn: string;
  descripcionEn: string;
  regimenEn: string;
  arrastraEn: string;
  temporadaEn: string;
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
    tipo: "Torrentera",
    regimen: "Seca casi todo el año; se llena solo con lluvia fuerte en la parte alta.",
    arrastra: "Lodo, piedras y escombros acumulados en el cauce seco.",
    temporada: "Se activa sobre todo de diciembre a abril.",
    tipoEn: "Torrentera (dry flash-flood channel)",
    descripcionEn: "Crosses the traditional San Lazaro neighborhood; narrow channel between homes.",
    regimenEn: "Dry most of the year; fills only with heavy rain uphill.",
    arrastraEn: "Mud, rocks, and debris built up in the dry channel.",
    temporadaEn: "Activates mostly from December to April.",
  },
  {
    id: "anashuayco",
    nombre: "Quebrada de Añashuayco",
    distrito: "Cerro Colorado",
    lat: -16.335,
    lon: -71.574,
    pendienteEstimada: 8,
    descripcion: "Zona de canteras de sillar; gran arrastre de material en lluvias fuertes.",
    tipo: "Quebrada y torrentera",
    regimen: "Lleva poca agua en época seca y crece de golpe con lluvias intensas.",
    arrastra: "Bloques y polvo de sillar, piedras y lodo de las canteras.",
    temporada: "Crece sobre todo de diciembre a abril.",
    tipoEn: "Ravine and torrentera",
    descripcionEn: "Sillar quarry area; heavy debris flow in strong rains.",
    regimenEn: "Carries little water in the dry season and rises suddenly with intense rain.",
    arrastraEn: "Sillar blocks and dust, rocks, and quarry mud.",
    temporadaEn: "Rises mostly from December to April.",
  },
  {
    id: "paucarpata",
    nombre: "Quebrada El Pato (Paucarpata)",
    distrito: "Paucarpata",
    lat: -16.424,
    lon: -71.516,
    pendienteEstimada: 15,
    descripcion: "Cauce empinado sobre zona urbana densa; historial de huaicos.",
    tipo: "Torrentera",
    regimen: "Seca casi todo el año; baja como huaico minutos después de llover en la parte alta.",
    arrastra: "Lodo, piedras y basura; baja con mucha fuerza por la pendiente.",
    temporada: "Se activa sobre todo de diciembre a abril.",
    tipoEn: "Torrentera (dry flash-flood channel)",
    descripcionEn: "Steep channel over a dense urban area; history of mudslides.",
    regimenEn: "Dry most of the year; comes down as a mudslide minutes after uphill rain.",
    arrastraEn: "Mud, rocks, and trash; comes down hard due to the slope.",
    temporadaEn: "Activates mostly from December to April.",
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
