import type { RiesgoInput, Semaforo } from "./risk";

// Mini evaluación con 5 casos FICTICIOS (datos de ejemplo, no son mediciones).
// Sirve para mostrarle a cualquiera — vecino, coordinador o jurado — cómo
// responde el semáforo sin esperar una emergencia real.

export interface CasoFicticio {
  nombre: string;
  descripcion: string;
  entrada: RiesgoInput;
  esperado: Semaforo;
  /** Siempre true: son casos inventados para evaluar. */
  ficticio: true;
}

export const CASOS_FICTICIOS: CasoFicticio[] = [
  {
    nombre: "Sin lluvia",
    descripcion: "0 mm en 24 h, sin pronóstico, pendiente suave y caudal disponible.",
    entrada: { lluvia24h: 0, lluvia48h: 0, pendiente: 5, distanciaKm: 2, caudalDisponible: true },
    esperado: "verde",
    ficticio: true,
  },
  {
    nombre: "Lluvia moderada",
    descripcion: "8 mm en 24 h y 10 mm pronosticados en quebrada de pendiente media.",
    entrada: { lluvia24h: 8, lluvia48h: 10, pendiente: 8, distanciaKm: 1, caudalDisponible: true },
    esperado: "amarillo",
    ficticio: true,
  },
  {
    nombre: "Lluvia fuerte",
    descripcion: "25 mm en 24 h y 30 mm pronosticados, pendiente alta y vivienda cerca.",
    entrada: { lluvia24h: 25, lluvia48h: 30, pendiente: 15, distanciaKm: 0.5, caudalDisponible: true },
    esperado: "rojo",
    ficticio: true,
  },
  {
    nombre: "Falta el caudal",
    descripcion: "No llueve, pero el servicio de caudal no respondió: no se puede confirmar seguridad.",
    entrada: { lluvia24h: 0, lluvia48h: 0, pendiente: 5, distanciaKm: 1, caudalDisponible: false },
    esperado: "insuficiente",
    ficticio: true,
  },
  {
    nombre: "Falta la lluvia",
    descripcion: "Open-Meteo no respondió: sin lluvia medida el semáforo no inventa un verde.",
    entrada: {
      lluvia24h: Number.NaN,
      lluvia48h: 0,
      pendiente: 10,
      distanciaKm: 1,
      caudalDisponible: true,
      lluviaDisponible: false,
    },
    esperado: "insuficiente",
    ficticio: true,
  },
];
