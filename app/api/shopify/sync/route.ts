import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapPedidoData, sinDegradarDatosDeContacto, type ShopifyOrder } from "@/lib/shopify";
import { ajustarIngresoPedido } from "@/lib/balance";
import { ajustarStockPedido, resolverProductosShopify } from "@/lib/inventario";

export async function POST() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_API_TOKEN;

  if (!domain || !token) {
    return NextResponse.json(
      { error: "Faltan SHOPIFY_STORE_DOMAIN o SHOPIFY_ADMIN_API_TOKEN en el .env" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://${domain}/admin/api/2024-10/orders.json?status=any&limit=50`,
      {
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Shopify respondió ${res.status}: ${text}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { orders: ShopifyOrder[] };

    let creados = 0;
    let actualizados = 0;
    let sinCoincidencia = 0;
    const municipiosVistos = new Set<string>();

    for (const order of data.orders) {
      const { productos, ...pedidoData } = mapPedidoData(order);

      if (pedidoData.municipio && pedidoData.municipio !== "Sin ciudad" && !/^\d+$/.test(pedidoData.municipio)) {
        municipiosVistos.add(pedidoData.municipio);
      }

      const mapaProductos = await resolverProductosShopify(prisma, productos);
      const productosConId = productos.map((p) => {
        const { shopifyVariantId, ...resto } = p;
        const productoId = shopifyVariantId ? mapaProductos.get(shopifyVariantId) : undefined;
        if (shopifyVariantId && !productoId) sinCoincidencia++;
        return { ...resto, productoId: productoId || null };
      });

      const existente = await prisma.pedido.findUnique({
        where: { shopifyOrderId: pedidoData.shopifyOrderId },
        include: { productos: true },
      });

      if (existente) {
        const dataSinDegradar = sinDegradarDatosDeContacto(existente, pedidoData);
        await prisma.$transaction(async (tx) => {
          await tx.productoPedido.deleteMany({ where: { pedidoId: existente.id } });
          const pedidoActualizado = await tx.pedido.update({
            where: { id: existente.id },
            data: { ...dataSinDegradar, productos: { create: productosConId } },
            include: { productos: true },
          });
          await ajustarIngresoPedido(tx, existente, pedidoActualizado);
          await ajustarStockPedido(tx, existente, pedidoActualizado);
        });
        actualizados++;
      } else {
        await prisma.$transaction(async (tx) => {
          const nuevoPedido = await tx.pedido.create({
            data: { ...pedidoData, productos: { create: productosConId } },
            include: { productos: true },
          });
          await ajustarStockPedido(tx, null, nuevoPedido);
        });
        creados++;
      }
    }

    if (municipiosVistos.size > 0) {
      await prisma.opcionMaestra.createMany({
        data: Array.from(municipiosVistos).map((valor) => ({
          categoria: "MUNICIPIO",
          valor,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ creados, actualizados, total: data.orders.length, sinCoincidencia });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo sincronizar con Shopify" },
      { status: 500 }
    );
  }
}
