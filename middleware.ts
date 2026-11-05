import { NextResponse, type NextRequest } from "next/server";
import { PANEL_COOKIE, rutaProtegida, sesionValida } from "@/lib/auth";

// Puerta del panel (acceso de demostracion): sin cookie valida, la pagina
// del panel redirige al login y las APIs protegidas responden 401.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!rutaProtegida(pathname, req.method)) return NextResponse.next();
  if (sesionValida(req.cookies.get(PANEL_COOKIE)?.value)) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "No autorizado: inicia sesión en el panel." },
      { status: 401 }
    );
  }
  const url = req.nextUrl.clone();
  url.pathname = "/panel-login";
  url.search = "?next=/panel";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/panel", "/panel/:path*", "/api/:path*"],
};
