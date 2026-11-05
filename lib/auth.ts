// Acceso de DEMOSTRACION al panel del coordinador.
// Credenciales publicas a proposito (jurado): PANEL_USER/PANEL_PASS con
// defaults coordinador/demo. NO es autenticacion de produccion.
// La cookie guarda PANEL_TOKEN (una cadena larga), nunca la contrasena.

export const PANEL_COOKIE = "chaski_panel";
export const SESION_MAX_AGE = 12 * 60 * 60; // 12 horas

let tokenRespaldo: string | null = null;

/** Token de sesion: el de entorno; si falta, uno aleatorio por proceso. */
export function panelToken(): string {
  const deEnv = process.env.PANEL_TOKEN?.trim();
  if (deEnv) return deEnv;
  if (!tokenRespaldo) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    tokenRespaldo = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return tokenRespaldo;
}

/** Comparacion en tiempo constante (sin importar el largo de la entrada). */
function compararConstante(a: string, b: string): boolean {
  const max = Math.max(a.length, b.length, 1);
  let diff = a.length ^ b.length;
  for (let i = 0; i < max; i++) {
    diff |= (a.charCodeAt(i % Math.max(a.length, 1)) || 0) ^ (b.charCodeAt(i % Math.max(b.length, 1)) || 0);
    if (a.length === 0 || b.length === 0) diff |= 1;
  }
  return diff === 0 && a.length === b.length;
}

export function credencialesValidas(
  usuario: string | undefined | null,
  contrasena: string | undefined | null
): boolean {
  const u = process.env.PANEL_USER || "coordinador";
  const p = process.env.PANEL_PASS || "demo";
  // Se evaluan siempre las dos comparaciones (sin salida temprana).
  const okU = compararConstante(usuario ?? "", u);
  const okP = compararConstante(contrasena ?? "", p);
  return okU && okP;
}

// Limite de intentos de login: maximo 5 por minuto por IP (en memoria).
const intentosLogin = new Map<string, { cuenta: number; desde: number }>();

export function demasiadosIntentosLogin(ip: string, ahora: number = Date.now()): boolean {
  const reg = intentosLogin.get(ip);
  if (!reg || ahora - reg.desde > 60_000) {
    intentosLogin.set(ip, { cuenta: 1, desde: ahora });
    return false;
  }
  reg.cuenta += 1;
  return reg.cuenta > 5;
}

export function sesionValida(valor: string | undefined | null): boolean {
  if (!valor) return false;
  return compararConstante(valor, panelToken());
}

/**
 * Rutas que exigen sesion de panel. Todo lo demas es publico:
 * la portada, el semaforo, los reportes de vecinos, el alta de
 * voluntarios/suscriptores y el propio login.
 */
export function rutaProtegida(pathname: string, method: string): boolean {
  const m = method.toUpperCase();
  if (pathname === "/panel" || pathname.startsWith("/panel/")) return true;
  if (pathname.startsWith("/api/cuadrillas")) return true;
  if (pathname.startsWith("/api/misiones")) return true;
  if (pathname.startsWith("/api/simulacion")) {
    // Mutar la practica global (activar, aprobar, borrar) exige sesion;
    // mirar su estado (GET) es publico.
    return m === "POST" || m === "PATCH" || m === "DELETE";
  }
  if (pathname.startsWith("/api/voluntarios")) return m === "GET";
  if (pathname.startsWith("/api/suscriptores")) return m === "GET";
  return false;
}
