import { NextRequest, NextResponse } from "next/server";

// El webhook de Shopify lo llama Shopify directamente (no un navegador con
// contraseña) y ya se autentica solo, verificando la firma HMAC en
// app/api/shopify/webhook/route.ts. Por eso queda fuera de esta contraseña.
const RUTAS_PUBLICAS = ["/api/shopify/webhook"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (RUTAS_PUBLICAS.some((ruta) => pathname.startsWith(ruta))) {
    return NextResponse.next();
  }

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    // Sin contraseña configurada en el entorno, no bloqueamos: evita dejar
    // a todos afuera por un despliegue sin la variable puesta todavía.
    return NextResponse.next();
  }

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice("Basic ".length));
      const suppliedPassword = decoded.slice(decoded.indexOf(":") + 1);
      if (suppliedPassword === password) {
        return NextResponse.next();
      }
    } catch {
      // credenciales mal formadas, cae al 401 de abajo
    }
  }

  return new NextResponse("Autenticación requerida", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Motívate"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
