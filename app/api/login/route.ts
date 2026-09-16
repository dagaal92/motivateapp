import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESION, COOKIE_MAX_AGE, crearSesion } from "@/lib/auth";
import { intentosExcedidos, registrarIntentoFallido, limpiarIntentos } from "@/lib/rateLimitLogin";
import { capturarError } from "@/lib/sentry";

function obtenerIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconocida";
}

export async function POST(req: NextRequest) {
  try {
    const ip = obtenerIp(req);
    if (intentosExcedidos(ip)) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
        { status: 429 }
      );
    }

    const { password } = await req.json();
    const esperada = process.env.ADMIN_PASSWORD;

    if (!esperada) {
      // Sin la variable configurada no hay como validar nada: se niega el
      // acceso en vez de dejar pasar a cualquiera.
      console.error("Falta ADMIN_PASSWORD en el entorno");
      return NextResponse.json(
        { error: "La aplicación no tiene configurada la contraseña de acceso." },
        { status: 500 }
      );
    }

    if (password !== esperada) {
      registrarIntentoFallido(ip);
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
    }

    limpiarIntentos(ip);
    const token = await crearSesion(esperada);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_SESION, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
    return res;
  } catch (error) {
    await capturarError(error);
    return NextResponse.json({ error: "No se pudo iniciar sesión" }, { status: 400 });
  }
}
