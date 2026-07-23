import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESION, COOKIE_MAX_AGE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const esperada = process.env.ADMIN_PASSWORD;

    // Sin contraseña configurada en el entorno, el middleware tampoco
    // bloquea nada: dejamos pasar para no dejar un /login sin salida.
    if (esperada && password !== esperada) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_SESION, esperada || "sin-contraseña", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo iniciar sesión" }, { status: 400 });
  }
}
