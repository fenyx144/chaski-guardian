// Tipos de la simulación de crecida. El estado vive en data/store.json
// (ver lib/store.ts): es temporal — se apaga con "Detener simulación" —
// pero compartido por todas las rutas. Todo se marca "SIMULACIÓN".

export interface AlertaSimulada {
  quebradaId: string;
  nombre: string;
  texto: string;
  /** La IA propone, una persona aprueba: nace "pendiente" y no se envía sola. */
  estado: "pendiente" | "aprobada" | "rechazada";
  /** Cantidad de suscriptores de esa quebrada. */
  vecinos: number;
  /** Números enmascarados: +51 9•• ••• 123 */
  numeros: string[];
  /** Resultado del envío tras aprobar ("pendiente" = aún no se envía nada). */
  envio: "pendiente" | "simulado" | "enviado" | "con fallos";
  fecha: string;
}

export interface EstadoSimulacion {
  activa: boolean;
  quebradasRojas: string[];
  alertas: AlertaSimulada[];
  iniciada: string | null;
}

export const SIMULACION_VACIA: EstadoSimulacion = {
  activa: false,
  quebradasRojas: [],
  alertas: [],
  iniciada: null,
};
