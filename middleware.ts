import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESION } from "@/lib/auth";

// El webhook de Shopify lo llama Shopify directamente (no un navegador con
// sesión) y ya se autentica solo, verificando la firma HMAC en
// app/api/shopify/webhook/route.ts. Por eso queda fuera de esta contraseña.
const RUTAS_PUBLICAS = ["/api/shopify/webhook", "/login", "/api/login", "/icon.svg"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (RUTAS_PUBLICAS.some((ruta) => pathname === ruta || pathname.startsWith(ruta))) {
    return NextResponse.next();
  }

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    // Sin contraseña configurada en el entorno, no bloqueamos: evita dejar
    // a todos afuera por un despliegue sin la variable puesta todavía.
    return NextResponse.next();
  }

  const sesion = request.cookies.get(COOKIE_SESION)?.value;
  if (sesion === password) {
    return NextResponse.next();
  }

  // Las rutas de API no pueden recibir un redirect (el fetch del cliente
  // espera JSON), así que devuelven 401 en vez de mandar a /login.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
