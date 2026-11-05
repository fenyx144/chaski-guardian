// Cuadrillas de EJEMPLO para la demo (datos de ejemplo, no son cuadrillas reales).
// Los voluntarios reales se inscriben con el botón "Quiero ser voluntario"
// y se guardan en data/voluntarios.json.

/** Habilidades que puede ofrecer un voluntario. */
export const HABILIDADES = ["rescate", "salud", "logística", "transporte"] as const;
export type Habilidad = (typeof HABILIDADES)[number];

export interface Cuadrilla {
  id: string;
  nombre: string;
  tipo: "rescate" | "salud" | "logística" | "transporte";
  estado: "disponible" | "en misión" | "en descanso";
  /** Siempre true en estas 3: son datos de ejemplo. */
  ejemplo: true;
}

export const CUADRILLAS_EJEMPLO: Cuadrilla[] = [
  { id: "cua-andes", nombre: "Cuadrilla Los Andes", tipo: "rescate", estado: "disponible", ejemplo: true },
  { id: "cua-salud", nombre: "Brigada Salud Centro", tipo: "salud", estado: "disponible", ejemplo: true },
  { id: "cua-apoyo", nombre: "Cuadrilla Apoyo Sur", tipo: "logística", estado: "en misión", ejemplo: true },
];

export interface VoluntarioAsignado {
  id: string;
  nombre: string;
  habilidad: string;
}

export interface PropuestaBase {
  cuadrillaSugerida: string | null;
  voluntariosAsignados: VoluntarioAsignado[];
  motivo: string;
  equipoNecesario: string[];
}

const EQUIPO_POR_TIPO: Record<string, string[]> = {
  desborde: ["cuerdas", "botas de jebe", "linternas", "chalecos salvavidas", "radios"],
  deslizamiento: ["palas", "cascos", "botas de seguridad", "linternas", "radios"],
  "vía cortada": ["palas", "conos de señalización", "linternas", "radios", "balizas"],
  "vivienda afectada": ["botiquín", "mantas", "agua embotellada", "linternas", "radios"],
};

const HABILIDAD_POR_TIPO: Record<string, string> = {
  desborde: "rescate",
  deslizamiento: "rescate",
  "vía cortada": "logística",
  "vivienda afectada": "salud",
};

/**
 * Propuesta de respaldo SIN modelo (cuando Muse no responde):
 * elige la primera cuadrilla disponible acorde al daño y voluntarios
 * con la habilidad más útil. Nunca asigna sola: queda "pendiente".
 */
export function propuestaLocal(
  reporte: { tipo: string },
  voluntarios: { id: string; nombre: string; habilidad: string }[],
  cuadrillas: Cuadrilla[]
): PropuestaBase {
  const habilidadUtil = HABILIDAD_POR_TIPO[reporte.tipo] ?? "rescate";
  const cuadrilla =
    cuadrillas.find((c) => c.estado === "disponible" && c.tipo === habilidadUtil) ??
    cuadrillas.find((c) => c.estado === "disponible") ??
    null;
  const asignados = voluntarios
    .filter((v) => v.habilidad === habilidadUtil)
    .slice(0, 3)
    .map((v) => ({ id: v.id, nombre: v.nombre, habilidad: v.habilidad }));
  return {
    cuadrillaSugerida: cuadrilla?.nombre ?? null,
    voluntariosAsignados: asignados,
    motivo:
      `Propuesta de respaldo sin modelo: para "${reporte.tipo}" sirve una cuadrilla de ${habilidadUtil} ` +
      `y voluntarios con esa habilidad. El coordinador debe revisar disponibilidad real antes de aprobar.`,
    equipoNecesario: EQUIPO_POR_TIPO[reporte.tipo] ?? ["linternas", "radios", "botiquín"],
  };
}
