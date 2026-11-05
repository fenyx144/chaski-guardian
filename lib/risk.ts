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
  /** Distancia a la quebrada en km (opcional): estar cerca sube el riesgo. */
  distanciaKm?: number;
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
export function calcularRiesgo(input: RiesgoInput, idioma: "es" | "en" | "qu" = "es"): RiesgoResult {
  const lluvia24h = Math.max(0, input.lluvia24h || 0);
  const lluvia48h = Math.max(0, input.lluvia48h || 0);
  const pendiente = clamp(input.pendiente || 0, 0, 45);

  const score = Math.round(
    clamp(
      lluvia24h * 2.2 +
        lluvia48h * 1.1 +
        pendiente * 1.4 +
        (input.distanciaKm === undefined
          ? 0
          : input.distanciaKm <= 1
          ? 12
          : input.distanciaKm <= 3
          ? 6
          : input.distanciaKm <= 6
          ? 3
          : 0),
      0,
      100
    )
  );

  const semaforo: Semaforo =
    score >= 65 ? "rojo" : score >= 35 ? "amarillo" : "verde";

  if (idioma === "qu") {
    const explicacionQu =
      semaforo === "rojo"
        ? `Hatun peligro (tantiyay): 24 pachapi ${lluvia24h.toFixed(1)} mm para, ` +
          `${lluvia48h.toFixed(1)} mm suyasqa, ~${pendiente}° sayaywan. ` +
          `Wayqu huntay icha huayco atinman: ama wayquta chimpaychu, ripunaykipaq wakichikuy.`
        : semaforo === "amarillo"
        ? `Chawpi peligro (tantiyay): 24 pachapi ${lluvia24h.toFixed(1)} mm para, ` +
          `${lluvia48h.toFixed(1)} mm suyasqa, ~${pendiente}° sayaywan. ` +
          `Wayquta qhaway, emergencia qipiykita wakichiy.`
        : `Pisi peligro (tantiyay): 24 pachapi ${lluvia24h.toFixed(1)} mm para, ` +
          `${lluvia48h.toFixed(1)} mm suyasqa, ~${pendiente}° sayaywan. ` +
          `Kunanqa mana peligro rikchakunchu; paraptinqa qhaway.`;
    return { score, semaforo, explicacion: explicacionQu };
  }

  if (idioma === "en") {
    const explicacionEn =
      semaforo === "rojo"
        ? `HIGH risk (estimate): ${lluvia24h.toFixed(1)} mm in 24 h and ` +
          `${lluvia48h.toFixed(1)} mm forecast, slope ~${pendiente}°. ` +
          `Possible flooding or mudslide: avoid the ravine and get ready to evacuate.`
        : semaforo === "amarillo"
        ? `MODERATE risk (estimate): ${lluvia24h.toFixed(1)} mm in 24 h and ` +
          `${lluvia48h.toFixed(1)} mm forecast, slope ~${pendiente}°. ` +
          `Watch the channel and keep your emergency backpack ready.`
        : `LOW risk (estimate): ${lluvia24h.toFixed(1)} mm in 24 h and ` +
          `${lluvia48h.toFixed(1)} mm forecast, slope ~${pendiente}°. ` +
          `No danger signs for now; stay alert if it rains.`;
    return { score, semaforo, explicacion: explicacionEn };
  }

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
