import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapPedidoData, type ShopifyOrder } from "@/lib/shopify";

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

    for (const order of data.orders) {
      const { productos, ...pedidoData } = mapPedidoData(order);

      const existente = await prisma.pedido.findUnique({
        where: { shopifyOrderId: pedidoData.shopifyOrderId },
      });

      if (existente) {
        await prisma.productoPedido.deleteMany({ where: { pedidoId: existente.id } });
        await prisma.pedido.update({
          where: { id: existente.id },
          data: { ...pedidoData, productos: { create: productos } },
        });
        actualizados++;
      } else {
        await prisma.pedido.create({
          data: { ...pedidoData, productos: { create: productos } },
        });
        creados++;
      }
    }

    return NextResponse.json({ creados, actualizados, total: data.orders.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo sincronizar con Shopify" },
      { status: 500 }
    );
  }
}
