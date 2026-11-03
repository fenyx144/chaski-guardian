// Cálculo del semáforo de riesgo. Función pura y testeable.
// IMPORTANTE: es una ESTIMACIÓN ilustrativa, no una predicción oficial.

export type Semaforo = "verde" | "amarillo" | "rojo";

export interface RiesgoInput {
  /** Lluvia acumulada últimas 24 h, en mm. */
  lluvia24h: number;
  /** Lluvia pronosticada próximas 48 h, en mm. */
  lluvia48h: number;
  /** Pendiente estimada del cauce en grados. */
  pendiente: number;
}

export interface RiesgoResult {
  score: number;
  semaforo: Semaforo;
  explicacion: string;
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/**
 * Puntaje 0-100:
 * - lluvia 24h pesa más (lo que ya cayó satura el suelo),
 * - pronóstico 48h pesa menos,
 * - la pendiente suma un factor de velocidad del huaico.
 */
export function calcularRiesgo(input: RiesgoInput): RiesgoResult {
  const lluvia24h = Math.max(0, input.lluvia24h || 0);
  const lluvia48h = Math.max(0, input.lluvia48h || 0);
  const pendiente = clamp(input.pendiente || 0, 0, 45);

  const score = Math.round(
    clamp(lluvia24h * 2.2 + lluvia48h * 1.1 + pendiente * 1.4, 0, 100)
  );

  const semaforo: Semaforo =
    score >= 65 ? "rojo" : score >= 35 ? "amarillo" : "verde";

  const explicacion =
    semaforo === "rojo"
      ? `Riesgo ALTO (estimación): ${lluvia24h.toFixed(1)} mm en 24 h y ` +
        `${lluvia48h.toFixed(1)} mm pronosticados, con pendiente ~${pendiente}°. ` +
        `Posible desborde o huaico: evita la quebrada y prepárate para evacuar.`
      : semaforo === "amarillo"
      ? `Riesgo MODERADO (estimación): ${lluvia24h.toFixed(1)} mm en 24 h y ` +
        `${lluvia48h.toFixed(1)} mm pronosticados, con pendiente ~${pendiente}°. ` +
        `Mantente atento al cauce y ten lista tu mochila de emergencia.`
      : `Riesgo BAJO (estimación): ${lluvia24h.toFixed(1)} mm en 24 h y ` +
        `${lluvia48h.toFixed(1)} mm pronosticados, con pendiente ~${pendiente}°. ` +
        `Sin señales de peligro por ahora; sigue atento si llueve.`;

  return { score, semaforo, explicacion };
}

export const SEMAFORO_META: Record<
  Semaforo,
  { titulo: string; color: string; accion: string }
> = {
  verde: {
    titulo: "Verde · Riesgo bajo",
    color: "#2f9e44",
    accion: "Actividad normal. Revisa tu mochila de emergencia.",
  },
  amarillo: {
    titulo: "Amarillo · Riesgo moderado",
    color: "#e8a94e",
    accion: "No cruces la quebrada. Vigila el nivel del agua.",
  },
  rojo: {
    titulo: "Rojo · Riesgo alto",
    color: "#e03131",
    accion: "Evacúa a zona alta ahora. Llama al 119.",
  },
};
