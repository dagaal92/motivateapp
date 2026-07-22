import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { mapPedidoData, type ShopifyOrder } from "@/lib/shopify";
import { ajustarStockPedido, resolverProductosShopify } from "@/lib/inventario";

function verificarFirma(rawBody: string, hmacHeader: string | null, secret: string) {
  if (!hmacHeader) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const digestBuf = Buffer.from(digest);
  const headerBuf = Buffer.from(hmacHeader);
  if (digestBuf.length !== headerBuf.length) return false;
  return crypto.timingSafeEqual(digestBuf, headerBuf);
}

export async function POST(req: NextRequest) {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    console.error("Falta SHOPIFY_API_SECRET en el .env");
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 500 });
  }

  const rawBody = await req.text();
  const hmacHeader = req.headers.get("x-shopify-hmac-sha256");

  if (!verificarFirma(rawBody, hmacHeader, secret)) {
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
      await ajustarStockPedido(tx, null, nuevoPedido);
      return nuevoPedido;
    });

    return NextResponse.json({ ok: true, id: pedido.id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo crear el pedido" }, { status: 500 });
  }
}
