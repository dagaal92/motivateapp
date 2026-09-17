import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESION, verificarSesion } from "@/lib/auth";

// Los webhooks de Shopify (creación de pedido, fulfillment) y de Kapso
// (mensajes de WhatsApp) los llaman esos servicios directamente (no un
// navegador con sesión) y cada uno se autentica solo, verificando su propia
// firma. Por eso quedan fuera de esta contraseña; "/api/shopify/webhook"
// hace match por prefijo, así que cubre también
// "/api/shopify/webhook/fulfillment".
const RUTAS_PUBLICAS = [
  "/api/shopify/webhook",
  "/api/kapso/webhook",
  "/login",
  "/api/login",
  "/icon.png",
  "/logo-full.png",
  "/logo-wordmark.png",
  "/logo-mark.png",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (RUTAS_PUBLICAS.some((ruta) => pathname === ruta || pathname.startsWith(ruta))) {
    return NextResponse.next();
  }

  const password = process.env.ADMIN_PASSWORD;
  const sesion = request.cookies.get(COOKIE_SESION)?.value;
  // Sin ADMIN_PASSWORD configurada no hay nada contra qué validar: se niega
  // el acceso (antes esto dejaba pasar a cualquiera sin pedir contraseña).
  const autenticado = Boolean(password) && (await verificarSesion(sesion, password as string));

  if (autenticado) {
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
