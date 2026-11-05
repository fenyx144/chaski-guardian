import { NextResponse } from "next/server";
import { PANEL_COOKIE } from "@/lib/auth";

// POST /api/panel-logout -> borra la cookie de sesion del panel.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PANEL_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
