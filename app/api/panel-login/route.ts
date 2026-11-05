import { NextResponse } from "next/server";
import {
  PANEL_COOKIE,
  SESION_MAX_AGE,
  credencialesValidas,
  demasiadosIntentosLogin,
  panelToken,
} from "@/lib/auth";

// El contador de intentos (5 por minuto por IP) vive en lib/auth.ts.

// POST /api/panel-login { usuario, contrasena }
export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (demasiadosIntentosLogin(ip)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un minuto e inténtalo de nuevo." },
      { status: 429 }
    );
  }
  let body: { usuario?: string; contrasena?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }
  if (!credencialesValidas(body.usuario, body.contrasena)) {
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos." },
      { status: 401 }
    );
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PANEL_COOKIE, panelToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESION_MAX_AGE,
  });
  return res;
}
