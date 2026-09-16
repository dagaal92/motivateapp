import { NextResponse } from "next/server";
import { capturarError } from "@/lib/sentry";

// Endpoint temporal solo para verificar la integracion con Sentry. Protegido
// por el mismo login de siempre (el middleware lo cubre igual que cualquier
// otra ruta). Se elimina en cuanto se confirme que el evento llega.
//
// Sin esto, Next.js la generaba como página estática en el build (se
// ejecutaba una sola vez durante `next build` y quedaba cacheada); cada
// visita real nunca volvía a correr el handler, así que nunca se enviaba
// un evento nuevo a Sentry.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    throw new Error("Prueba de integracion con Sentry - motivateapp");
  } catch (error) {
    await capturarError(error);
    return NextResponse.json({ ok: true, mensaje: "Error de prueba enviado" });
  }
}
