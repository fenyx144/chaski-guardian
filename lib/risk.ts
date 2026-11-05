// Cálculo del semáforo de riesgo. Función pura y testeable.
// IMPORTANTE: es una ESTIMACIÓN experimental ilustrativa, no una predicción
// oficial y nunca confirma que un lugar sea seguro.
//
// Regla de datos: si falta lluvia, caudal, distancia o pendiente, el
// resultado es "insuficiente" (información insuficiente), jamás verde.

export type Semaforo = "verde" | "amarillo" | "rojo" | "insuficiente" | "desconocido";

export type DatoFaltante = "lluvia" | "caudal" | "distancia" | "pendiente";

export interface RiesgoInput {
  /** Lluvia acumulada últimas 24 h, en mm. */
  lluvia24h: number;
  /** Lluvia pronosticada próximas 48 h, en mm. */
  lluvia48h: number;
  /** Pendiente estimada del cauce en grados. */
  pendiente: number;
  /** Distancia a la quebrada en km: estar cerca sube el riesgo. Sin dato = insuficiente. */
  distanciaKm?: number;
  /** false cuando el servicio de lluvia no respondió. */
  lluviaDisponible?: boolean;
  /** false cuando el servicio de caudal no respondió. */
  caudalDisponible?: boolean;
}

export interface RiesgoResult {
  score: number;
  semaforo: Semaforo;
  explicacion: string;
  /** Datos que faltaron; si no está vacío, el semáforo es "insuficiente". */
  datosFaltantes: DatoFaltante[];
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

const ETIQUETA_FALTANTE: Record<DatoFaltante, Record<"es" | "en" | "qu", string>> = {
  lluvia: { es: "lluvia medida y pronóstico", en: "measured rain and forecast", qu: "para tupusqa hinaspa suyasqa" },
  caudal: { es: "caudal del río", en: "river flow", qu: "mayu caudal" },
  distancia: { es: "distancia a la quebrada", en: "distance to the ravine", qu: "wayqumanta karu" },
  pendiente: { es: "pendiente de la quebrada", en: "ravine slope", qu: "wayqupa sayaynin" },
};

/**
 * Puntaje 0-100:
 * - lluvia 24h pesa más (lo que ya cayó satura el suelo),
 * - pronóstico 48h pesa menos,
 * - la pendiente suma un factor de velocidad del huaico.
 * El puntaje se calcula igual con datos parciales, pero si falta algún
 * dato el semáforo mostrado es "insuficiente", nunca verde.
 */
export function calcularRiesgo(input: RiesgoInput, idioma: "es" | "en" | "qu" = "es"): RiesgoResult {
  const lluviaOk =
    input.lluviaDisponible !== false &&
    Number.isFinite(input.lluvia24h) &&
    Number.isFinite(input.lluvia48h);
  const pendienteOk = Number.isFinite(input.pendiente);
  const distanciaOk = input.distanciaKm !== undefined && Number.isFinite(input.distanciaKm);
  const caudalOk = input.caudalDisponible !== false;

  const datosFaltantes: DatoFaltante[] = [];
  if (!lluviaOk) datosFaltantes.push("lluvia");
  if (!caudalOk) datosFaltantes.push("caudal");
  if (!distanciaOk) datosFaltantes.push("distancia");
  if (!pendienteOk) datosFaltantes.push("pendiente");

  const lluvia24h = lluviaOk ? Math.max(0, input.lluvia24h) : 0;
  const lluvia48h = lluviaOk ? Math.max(0, input.lluvia48h) : 0;
  const pendiente = pendienteOk ? clamp(input.pendiente, 0, 45) : 0;

  const score = Math.round(
    clamp(
      lluvia24h * 2.2 +
        lluvia48h * 1.1 +
        pendiente * 1.4 +
        (!distanciaOk
          ? 0
          : (input.distanciaKm as number) <= 1
          ? 12
          : (input.distanciaKm as number) <= 3
          ? 6
          : (input.distanciaKm as number) <= 6
          ? 3
          : 0),
      0,
      100
    )
  );

  const semaforo: Semaforo =
    datosFaltantes.length > 0
      ? "insuficiente"
      : score >= 65
      ? "rojo"
      : score >= 35
      ? "amarillo"
      : "verde";

  const faltanTxt = datosFaltantes
    .map((d) => ETIQUETA_FALTANTE[d][idioma])
    .join(", ");

  if (idioma === "qu") {
    const explicacionQu =
      semaforo === "insuficiente"
        ? `Willakuy mana huntachu (tantiyay experimental): ${faltanTxt} mana kanchu. ` +
          `Mana segurochu nispa niyta atinchikchu: ama qomer jina hapipakuychu.`
        : semaforo === "rojo"
        ? `Hatun peligro (tantiyay experimental): 24 pachapi ${lluvia24h.toFixed(1)} mm para, ` +
          `${lluvia48h.toFixed(1)} mm suyasqa, ~${pendiente}° sayaywan. ` +
          `Wayqu huntay icha huayco atinman: ama wayquta chimpaychu, ripunaykipaq wakichikuy.`
        : semaforo === "amarillo"
        ? `Chawpi peligro (tantiyay experimental): 24 pachapi ${lluvia24h.toFixed(1)} mm para, ` +
          `${lluvia48h.toFixed(1)} mm suyasqa, ~${pendiente}° sayaywan. ` +
          `Wayquta qhaway, emergencia qipiykita wakichiy.`
        : `Tantiyay experimental: mana segurochu nispa niwanchikchu. Paraptinqa qhaway. (Willakuy: 24 pachapi ${lluvia24h.toFixed(1)} mm para, ` +
          `${lluvia48h.toFixed(1)} mm suyasqa, ~${pendiente}° sayaywan. ` +
          `Kay tantiyay mana segurochu nispa niwanchikchu; paraptinqa qhaway.`;
    return { score, semaforo, explicacion: explicacionQu, datosFaltantes };
  }

  if (idioma === "en") {
    const explicacionEn =
      semaforo === "insuficiente"
        ? `Insufficient information (experimental estimate): missing ${faltanTxt}. ` +
          `We cannot confirm it is safe; do not read this as a green light.`
        : semaforo === "rojo"
        ? `HIGH risk (experimental estimate): ${lluvia24h.toFixed(1)} mm in 24 h and ` +
          `${lluvia48h.toFixed(1)} mm forecast, slope ~${pendiente}°. ` +
          `Possible flooding or mudslide: avoid the ravine and get ready to evacuate.`
        : semaforo === "amarillo"
        ? `MODERATE risk (experimental estimate): ${lluvia24h.toFixed(1)} mm in 24 h and ` +
          `${lluvia48h.toFixed(1)} mm forecast, slope ~${pendiente}°. ` +
          `Watch the channel and keep your emergency backpack ready.`
        : `Experimental estimate: does not confirm it is safe. Stay alert if it rains. Data: ${lluvia24h.toFixed(1)} mm in 24 h and ` +
          `${lluvia48h.toFixed(1)} mm forecast, slope ~${pendiente}°. ` +
          `This estimate does not confirm it is safe; stay alert if it rains.`;
    return { score, semaforo, explicacion: explicacionEn, datosFaltantes };
  }

  const explicacion =
    semaforo === "insuficiente"
      ? `Información insuficiente (estimación experimental): faltan ${faltanTxt}. ` +
        `Esto no confirma que sea seguro; no lo interpretes como un verde.`
      : semaforo === "rojo"
      ? `Riesgo ALTO (estimación experimental): ${lluvia24h.toFixed(1)} mm en 24 h y ` +
        `${lluvia48h.toFixed(1)} mm pronosticados, con pendiente ~${pendiente}°. ` +
        `Posible desborde o huaico: evita la quebrada y prepárate para evacuar.`
      : semaforo === "amarillo"
      ? `Riesgo MODERADO (estimación experimental): ${lluvia24h.toFixed(1)} mm en 24 h y ` +
        `${lluvia48h.toFixed(1)} mm pronosticados, con pendiente ~${pendiente}°. ` +
        `Mantente atento al cauce y ten lista tu mochila de emergencia.`
      : `Estimación experimental: no confirma que sea seguro. Sigue atento si llueve. Datos: ${lluvia24h.toFixed(1)} mm en 24 h y ` +
        `${lluvia48h.toFixed(1)} mm pronosticados, con pendiente ~${pendiente}°. ` +
        `Es una estimación experimental y no confirma que sea seguro; sigue atento si llueve.`;

  return { score, semaforo, explicacion, datosFaltantes };
}

export const SEMAFORO_META: Record<
  Semaforo,
  { titulo: string; color: string; accion: string }
> = {
  verde: {
    titulo: "Verde · Estimación experimental: no confirma que sea seguro",
    color: "#2f9e44",
    accion: "Estimación experimental: no confirma que sea seguro. Sigue atento si llueve.",
  },
  amarillo: {
    titulo: "Amarillo · Riesgo moderado",
    color: "#e8a94e",
    accion: "No cruces la quebrada. Vigila el nivel del agua.",
  },
  rojo: {
    titulo: "Rojo · Riesgo alto",
    color: "#e03131",
    accion: "Evacúa a zona alta ahora. Defensa Civil 115, Bomberos 116, Policía 105. El 119 no es una central de rescate: es solo para dejar un mensaje de voz a tu familia si las líneas están saturadas.",
  },
  insuficiente: {
    titulo: "Información insuficiente",
    color: "#7c8a96",
    accion: "No podemos confirmar que sea seguro. Busca avisos oficiales y mantente atento.",
  },
  desconocido: {
    titulo: "Sin información suficiente",
    color: "#868e96",
    accion: "No hay datos de lluvia ahora. Esto NO significa que sea seguro: revisa los avisos de SENAMHI y el estado del cauce.",
  },
};
