import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ShopifyVariant = { id: number; title: string };
type ShopifyProduct = { id: number; title: string; status: string; variants: ShopifyVariant[] };

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
      `https://${domain}/admin/api/2024-10/products.json?status=active&limit=250`,
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

    const data = (await res.json()) as { products: ShopifyProduct[] };

    let creados = 0;
    let actualizados = 0;
    const vistos: string[] = [];

    for (const product of data.products) {
      for (const variant of product.variants) {
        const shopifyVariantId = String(variant.id);
        vistos.push(shopifyVariantId);
        const variante = variant.title === "Default Title" ? null : variant.title;

        const existente = await prisma.producto.findUnique({ where: { shopifyVariantId } });
        if (existente) {
          await prisma.producto.update({
            where: { id: existente.id },
            data: { nombre: product.title, variante, activo: true },
          });
          actualizados++;
        } else {
          await prisma.producto.create({
            data: {
              shopifyProductId: String(product.id),
              shopifyVariantId,
              nombre: product.title,
              variante,
              stock: 0,
            },
          });
          creados++;
        }
      }
    }

    let desactivados = 0;
    if (vistos.length > 0) {
      const resultado = await prisma.producto.updateMany({
        where: { shopifyVariantId: { notIn: vistos }, activo: true },
        data: { activo: false },
      });
      desactivados = resultado.count;
    }

    return NextResponse.json({ creados, actualizados, desactivados, total: vistos.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo importar el catálogo de Shopify" },
      { status: 500 }
    );
  }
}
