import { promises as fs } from "fs";
import path from "path";
import { QUEBRADAS } from "./quebradas";

// Suscriptores de alertas por WhatsApp. Se guardan en data/suscriptores.json
// (ignorado por Git: son números personales). Sin login.

export interface Suscriptor {
  id: string;
  fecha: string;
  /** Formato internacional: +51 seguido de 9 dígitos. */
  telefono: string;
  quebradaId: string;
  consentimiento: true;
}

const RUTA = path.join(process.cwd(), "data", "suscriptores.json");

/** "+51 987 654 321", "987654321" o "+51987654321" -> "+51987654321" o null. */
export function normalizarTelefono(x: string): string | null {
  const limpio = x.replace(/[\s-]/g, "");
  if (/^\+51\d{9}$/.test(limpio)) return limpio;
  if (/^51\d{9}$/.test(limpio)) return `+${limpio}`;
  if (/^9\d{8}$/.test(limpio)) return `+51${limpio}`;
  return null;
}

export function esQuebradaValida(id: string): boolean {
  return QUEBRADAS.some((q) => q.id === id);
}

/** +51987654321 -> "+51 9•• ••• 321" (solo se ven los últimos 3 dígitos). */
export function enmascarar(telefono: string): string {
  return `+51 9•• ••• ${telefono.slice(-3)}`;
}

let memoria: Suscriptor[] | null = null;

export async function listarSuscriptores(): Promise<Suscriptor[]> {
  if (memoria) return memoria;
  try {
    const data = JSON.parse(await fs.readFile(RUTA, "utf-8")) as Suscriptor[];
    memoria = Array.isArray(data) ? data : [];
  } catch {
    memoria = [];
  }
  return memoria;
}

async function persistir(lista: Suscriptor[]): Promise<void> {
  memoria = lista;
  try {
    await fs.mkdir(path.dirname(RUTA), { recursive: true });
    await fs.writeFile(RUTA, JSON.stringify(lista, null, 2), "utf-8");
  } catch {
    // Disco de solo lectura (p. ej. Vercel): queda en memoria.
  }
}

export async function guardarSuscriptor(
  s: Omit<Suscriptor, "id" | "fecha">
): Promise<{ suscriptor: Suscriptor; nuevo: boolean }> {
  const lista = await listarSuscriptores();
  const previo = lista.find((x) => x.telefono === s.telefono && x.quebradaId === s.quebradaId);
  if (previo) return { suscriptor: previo, nuevo: false };
  const suscriptor: Suscriptor = {
    ...s,
    id: `sus-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    fecha: new Date().toISOString(),
  };
  await persistir([suscriptor, ...lista]);
  return { suscriptor, nuevo: true };
}
