import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapPedidoData, type ShopifyOrder } from "@/lib/shopify";
import { ajustarStockPedido, resolverProductosShopify } from "@/lib/inventario";
import { upsertClienteDesdePedido } from "@/lib/clientes";
import { capturarError } from "@/lib/sentry";
import { verificarFirmaShopify } from "@/lib/shopifyWebhook";
import {
  enviarPlantillaConfirmacionContraentrega,
  enviarPlantillaConfirmacionPagado,
  formatearTelefonoWhatsapp,
} from "@/lib/kapso";
import { formatearProductosPedido } from "@/lib/productos";
import { registrarPlantillaSaliente } from "@/lib/mensajesWhatsapp";

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

  const order = JSON.parse(rawBody) as ShopifyOrder;

  try {
    const { productos, ...data } = mapPedidoData(order);

    const existente = await prisma.pedido.findUnique({
      where: { shopifyOrderId: data.shopifyOrderId },
    });

    if (existente) {
      // El mismo webhook puede reintentarse; no duplicamos el pedido.
      return NextResponse.json({ ok: true, id: existente.id, duplicado: true });
    }

    const mapaProductos = await resolverProductosShopify(prisma, productos);
    const productosConId = productos.map((p) => {
      const { shopifyVariantId, ...resto } = p;
      const productoId = shopifyVariantId ? mapaProductos.get(shopifyVariantId) : undefined;
      return { ...resto, productoId: productoId || null };
    });

    const pedido = await prisma.$transaction(async (tx) => {
      const nuevoPedido = await tx.pedido.create({
        data: {
          ...data,
          productos: { create: productosConId },
        },
        include: { productos: true },
      });
      await ajustarStockPedido(tx, null, nuevoPedido, "WEBHOOK_SHOPIFY");
      await upsertClienteDesdePedido(tx, nuevoPedido);
      return nuevoPedido;
    });

    // El mensaje de confirmación es un efecto secundario: si Kapso falla,
    // no queremos revertir ni reintentar la creación del pedido (Shopify
    // reintentaría el webhook completo y duplicaría el trabajo ya hecho).
    try {
      const telefono = formatearTelefonoWhatsapp(pedido.telefono);
      if (telefono && pedido.numeroOrden) {
        const nombreCliente = pedido.cliente?.trim().split(/\s+/)[0] || "cliente";
        const productosTexto = formatearProductosPedido(pedido.productos);

        // Solo tiene sentido avisar en los dos estados posibles de un
        // pedido recién creado (ya pagado o pendiente de pago
        // contraentrega). Un pedido que ya nace cancelado no se notifica.
        if (pedido.estado === "CONFIRMADO") {
          const { wamid, contenido } = await enviarPlantillaConfirmacionPagado({
            telefono,
            nombreCliente,
            numeroOrden: `#${pedido.numeroOrden}`,
            productos: productosTexto,
          });
          await registrarPlantillaSaliente({
            telefono: pedido.telefono,
            tipo: "confirmacion_pedido_pagado",
            contenido,
            wamid,
          });
          await prisma.pedido.update({
            where: { id: pedido.id },
            data: { confirmacionNotificadaEn: new Date() },
          });
        } else if (pedido.estado === "PENDIENTE") {
          const { wamid, contenido } = await enviarPlantillaConfirmacionContraentrega({
            telefono,
            nombreCliente,
            productos: productosTexto,
            direccion: pedido.direccion || "Sin dirección",
            valorAPagar: new Intl.NumberFormat("es-CO").format(pedido.valorTotal),
          });
          await registrarPlantillaSaliente({
            telefono: pedido.telefono,
            tipo: "v1_1_confirmar_pedido_contraentrega",
            contenido,
            wamid,
          });
          await prisma.pedido.update({
            where: { id: pedido.id },
            data: { confirmacionNotificadaEn: new Date() },
          });
        }
      }
    } catch (error) {
      await capturarError(error);
    }

    return NextResponse.json({ ok: true, id: pedido.id }, { status: 201 });
  } catch (error) {
    await capturarError(error);
    return NextResponse.json({ error: "No se pudo crear el pedido" }, { status: 500 });
  }
}
