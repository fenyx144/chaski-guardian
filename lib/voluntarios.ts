import { promises as fs } from "fs";
import path from "path";

// Voluntarios inscritos desde el botón "Quiero ser voluntario".
// Se guardan en data/voluntarios.json (sin base de datos, sin login).

import { HABILIDADES, type Habilidad } from "./cuadrillas";
export { HABILIDADES, type Habilidad };

export interface Voluntario {
  id: string;
  fecha: string;
  nombre: string;
  distrito: string;
  habilidad: Habilidad;
  disponibilidad: string;
}

const RUTA = path.join(process.cwd(), "data", "voluntarios.json");

export async function listarVoluntarios(): Promise<Voluntario[]> {
  try {
    const raw = await fs.readFile(RUTA, "utf-8");
    const data = JSON.parse(raw) as Voluntario[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function guardarVoluntario(
  v: Omit<Voluntario, "id" | "fecha">
): Promise<Voluntario> {
  const lista = await listarVoluntarios();
  const nuevo: Voluntario = {
    ...v,
    id: `vol-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    fecha: new Date().toISOString(),
  };
  lista.unshift(nuevo);
  await fs.mkdir(path.dirname(RUTA), { recursive: true });
  await fs.writeFile(RUTA, JSON.stringify(lista, null, 2), "utf-8");
  return nuevo;
}

export function esHabilidad(x: string): x is Habilidad {
  return (HABILIDADES as readonly string[]).includes(x);
}
