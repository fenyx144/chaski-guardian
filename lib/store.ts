import { promises as fs } from "fs";
import path from "path";
import type { Semaforo } from "./risk";

export interface Reporte {
  id: string;
  fecha: string;
  quebradaId: string;
  lat: number;
  lon: number;
  tipo: string;
  descripcion: string;
  semaforo: Semaforo;
  score: number;
  fuente: "vecino" | "whatsapp" | "demo";
  foto?: string;
}

export type EstadoMision = "pendiente" | "aprobada" | "rechazada" | "bloqueada";

export interface Mision {
  id: string;
  reporteId: string;
  titulo: string;
  lat: number;
  lon: number;
  estado: EstadoMision;
  motivo?: string;
  creada: string;
}

interface StoreData {
  reportes: Reporte[];
  misiones: Mision[];
}

const STORE_PATH = path.join(process.cwd(), "data", "store.json");

const SEMILLA: StoreData = {
  reportes: [
    {
      id: "rep-demo-1",
      fecha: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
      quebradaId: "san-lazaro",
      lat: -16.4021,
      lon: -71.5334,
      tipo: "desborde",
      descripcion: "El agua llegó a la vereda en el puente de San Lázaro.",
      semaforo: "amarillo",
      score: 48,
      fuente: "demo",
    },
    {
      id: "rep-demo-2",
      fecha: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      quebradaId: "paucarpata",
      lat: -16.424,
      lon: -71.516,
      tipo: "deslizamiento",
      descripcion: "Piedras y lodo bajan por el cauce de El Pato.",
      semaforo: "rojo",
      score: 78,
      fuente: "demo",
    },
  ],
  misiones: [],
};

async function leer(): Promise<StoreData> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    return JSON.parse(raw) as StoreData;
  } catch {
    return structuredClone(SEMILLA);
  }
}

async function escribir(data: StoreData): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

const uid = (pref: string) =>
  `${pref}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export async function listarReportes(): Promise<Reporte[]> {
  return (await leer()).reportes;
}

export async function guardarReporte(
  r: Omit<Reporte, "id" | "fecha">
): Promise<Reporte> {
  const data = await leer();
  const nuevo: Reporte = {
    ...r,
    id: uid("rep"),
    fecha: new Date().toISOString(),
  };
  data.reportes.unshift(nuevo);
  await escribir(data);
  return nuevo;
}

export async function listarMisiones(): Promise<Mision[]> {
  return (await leer()).misiones;
}

export async function guardarMision(
  m: Omit<Mision, "id" | "creada">
): Promise<Mision> {
  const data = await leer();
  const nueva: Mision = { ...m, id: uid("mis"), creada: new Date().toISOString() };
  data.misiones.unshift(nueva);
  await escribir(data);
  return nueva;
}

export async function cambiarEstadoMision(
  id: string,
  estado: EstadoMision,
  motivo?: string
): Promise<Mision | null> {
  const data = await leer();
  const m = data.misiones.find((x) => x.id === id);
  if (!m) return null;
  m.estado = estado;
  if (motivo !== undefined) m.motivo = motivo;
  await escribir(data);
  return m;
}
