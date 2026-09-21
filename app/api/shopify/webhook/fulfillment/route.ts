import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarFirmaShopify } from "@/lib/shopifyWebhook";
import { esGuiaValida, limpiarGuia } from "@/lib/guia";
import { enviarPlantillaGuia, formatearTelefonoWhatsapp } from "@/lib/kapso";
import { registrarPlantillaSaliente } from "@/lib/mensajesWhatsapp";
import { capturarError } from "@/lib/sentry";

// Shopify manda este webhook (fulfillments/create y fulfillments/update)
// cuando tú ingresas o cambias el número de guía allá. De ahí sacamos la
// guía y la transportadora para avisarle al cliente por WhatsApp (plantilla
// "compartir_guia" en Kapso), además de la notificación nativa de Shopify.
type FulfillmentShopify = {
  order_id: number;
  tracking_number: string | null;
  tracking_company: string | null;
  tracking_url: string | null;
};

export async function POST(req: NextRequest) {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    console.error("Falta SHOPIFY_API_SECRET en el .env");
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 500 });
  }

  const rawBody = await req.text();
  const hmacHeader = req.headers.get("x-shopify-hmac-sha256");

  if (!verificarFirmaShopify(rawBody, hmacHeader, secret)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const fulfillment = JSON.parse(rawBody) as FulfillmentShopify;

  try {
    const pedido = await prisma.pedido.findUnique({
      where: { shopifyOrderId: String(fulfillment.order_id) },
    });

    if (!pedido) {
      // Pedido que no manejamos en la app (o llegó antes que el webhook de
      // creación de la orden); no hay nada que notificar.
      return NextResponse.json({ ok: true, ignorado: "pedido no encontrado" });
    }

    if (pedido.guiaNotificadaEn) {
      return NextResponse.json({ ok: true, yaNotificado: true });
    }

    const guia = limpiarGuia(fulfillment.tracking_number);
    if (!guia || !esGuiaValida(guia)) {
      // Esta fulfillment todavía no trae una guía real; llegará otro
      // webhook cuando la agregues.
      return NextResponse.json({ ok: true, ignorado: "sin guía válida todavía" });
    }

    const transportadora = limpiarGuia(fulfillment.tracking_company) || pedido.transportadora;
    const urlSeguimiento = fulfillment.tracking_url?.trim() || pedido.urlSeguimiento || null;
    const telefono = formatearTelefonoWhatsapp(pedido.telefono);
    const nombreCliente = pedido.cliente?.trim().split(/\s+/)[0] || "cliente";

    if (!telefono || !transportadora || !pedido.numeroOrden) {
      await capturarError(
        new Error(
          `No se pudo mandar la plantilla de guía para el pedido ${pedido.id}: falta teléfono, transportadora o número de orden válido`
        )
      );
      return NextResponse.json({ ok: true, ignorado: "faltan datos para notificar" });
    }

    const { wamid, contenido } = await enviarPlantillaGuia({
      telefono,
      nombreCliente,
      // La plantilla ya trae el "#" fijo antes de {{2}}; si se lo mandamos
      // aquí también queda "##".
      numeroOrden: pedido.numeroOrden,
      numeroGuia: guia,
      transportadora,
      urlSeguimiento,
    });

    await registrarPlantillaSaliente({
      telefono: pedido.telefono,
      tipo: "compartir_guia",
      contenido,
      wamid,
    });

    await prisma.pedido.update({
      where: { id: pedido.id },
      data: {
        numeroGuia: pedido.numeroGuia || guia,
        transportadora: pedido.transportadora || transportadora,
        urlSeguimiento: pedido.urlSeguimiento || urlSeguimiento,
        guiaNotificadaEn: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    await capturarError(error);
    // 500 para que Shopify reintente el webhook más tarde (por ejemplo si
    // Kapso estuvo caído un momento).
    return NextResponse.json({ error: "No se pudo procesar el fulfillment" }, { status: 500 });
  }
}
