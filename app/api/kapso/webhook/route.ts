import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizarTelefono } from "@/lib/normalizar";
import { verificarFirmaKapso, extraerTelefonoContraparte } from "@/lib/kapsoWebhook";
import { capturarError } from "@/lib/sentry";

// Kapso manda aquí cada mensaje de WhatsApp de la conversación (los que
// escribe el cliente y los que le escribe el equipo, manual o automático),
// para poder saber cuándo fue el último contacto con cada cliente.
const EVENTOS_RELEVANTES = new Set(["whatsapp.message.received", "whatsapp.message.sent"]);

export async function POST(req: NextRequest) {
  const secret = process.env.KAPSO_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Falta KAPSO_WEBHOOK_SECRET en el .env");
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 500 });
  }

  const rawBody = await req.text();
  const firmaHeader = req.headers.get("x-webhook-signature");

  if (!verificarFirmaKapso(rawBody, firmaHeader, secret)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const evento = req.headers.get("x-webhook-event");
  if (!evento || !EVENTOS_RELEVANTES.has(evento)) {
    return NextResponse.json({ ok: true, ignorado: "evento no relevante" });
  }

  try {
    const payload = JSON.parse(rawBody);
    const telefonoCrudo = extraerTelefonoContraparte(payload);
    const telefono = normalizarTelefono(telefonoCrudo);

    if (!telefono) {
      // Diagnóstico temporal: se ve el valor exacto de kapso.phone_number
      // y el cuerpo completo, para confirmar por qué no se reconoció el
      // teléfono con datos reales (se puede acortar una vez confirmado).
      await capturarError(
        new Error(
          `Webhook de Kapso (${evento}) sin teléfono reconocible. ` +
            `kapso.phone_number=${JSON.stringify(payload?.kapso?.phone_number)}, ` +
            `from=${JSON.stringify(payload?.from)}, to=${JSON.stringify(payload?.to)}. ` +
            `Cuerpo completo: ${rawBody}`
        )
      );
      return NextResponse.json({ ok: true, ignorado: "sin teléfono" });
    }

    const resultado = await prisma.cliente.updateMany({
      where: { telefono },
      data: { ultimoContactoWhatsapp: new Date() },
    });

    if (resultado.count === 0) {
      // No es necesariamente un error (puede ser un número que aún no
      // tiene ficha de Cliente), pero vale la pena verlo en Sentry para
      // confirmar que estamos leyendo el teléfono correcto del payload.
      await capturarError(
        new Error(`Webhook de Kapso (${evento}): ningún cliente con teléfono ${telefono}`)
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    await capturarError(error);
    return NextResponse.json({ error: "No se pudo procesar el mensaje" }, { status: 500 });
  }
}
