import { NextResponse } from "next/server";
import { capturarError } from "@/lib/sentry";

// Endpoint temporal solo para verificar la integracion con Sentry. Protegido
// por el mismo login de siempre (el middleware lo cubre igual que cualquier
// otra ruta). Se elimina en cuanto se confirme que el evento llega.
export async function GET() {
  try {
    throw new Error("Prueba de integracion con Sentry - motivateapp");
  } catch (error) {
    capturarError(error);
    return NextResponse.json({ ok: true, mensaje: "Error de prueba enviado" });
  }
}
