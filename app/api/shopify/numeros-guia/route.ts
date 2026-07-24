import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type FulfillmentShopify = { tracking_number: string | null };
type OrdenConGuia = { id: number; name: string; fulfillments: FulfillmentShopify[] };

const PLACEHOLDERS_GUIA = ["n/a", "na", "-", "sin guia", "singuia", "pendiente", "0", "0000", "000000"];
const FORMATO_VALIDO = /^[A-Za-z0-9-]{5,30}$/;
const TAMANO_LOTE = 25;
// Cada invocación se corta sola bastante antes de cualquier límite de
// plataforma (Vercel Hobby ya mata funciones a los 10s). El navegador es
// quien vuelve a llamar automáticamente hasta que no quede nada pendiente.
const TIEMPO_MAX_MS = 8000;

function limpiarGuia(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const limpio = valor.trim();
  if (!limpio || PLACEHOLDERS_GUIA.includes(limpio.toLowerCase())) return null;
  return limpio;
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_API_TOKEN;

  if (!domain || !token) {
    return NextResponse.json(
      { error: "Faltan SHOPIFY_STORE_DOMAIN o SHOPIFY_ADMIN_API_TOKEN en el .env" },
      { status: 400 }
    );
  }

  const inicio = Date.now();

  try {
    let actualizados = 0;
    let procesados = 0;
    const vacios: { numeroOrden: string | null; cliente: string | null }[] = [];
    const raros: { numeroOrden: string | null; cliente: string | null; valor: string }[] = [];

    while (Date.now() - inicio < TIEMPO_MAX_MS) {
      const lote = await prisma.pedido.findMany({
        where: { origen: "SHOPIFY", numeroGuia: null, shopifyOrderId: { not: null } },
        orderBy: { creadoEn: "desc" },
        take: TAMANO_LOTE,
        select: { id: true, numeroOrden: true, cliente: true, shopifyOrderId: true },
      });

      if (lote.length === 0) break;

      for (const pedido of lote) {
        if (Date.now() - inicio >= TIEMPO_MAX_MS) break;

        try {
          const res = await fetch(
            `https://${domain}/admin/api/2024-10/orders/${pedido.shopifyOrderId}.json?fields=id,name,fulfillments`,
            {
              headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
              cache: "no-store",
            }
          );

          if (res.status === 429) {
            // Se deja pendiente: lo recoge la siguiente llamada del navegador.
            break;
          }

          if (!res.ok) {
            vacios.push({ numeroOrden: pedido.numeroOrden, cliente: pedido.cliente });
          } else {
            const { order } = (await res.json()) as { order: OrdenConGuia };
            const candidata = (order.fulfillments || [])
              .map((f) => limpiarGuia(f.tracking_number))
              .find((v) => v !== null);

            if (!candidata) {
              vacios.push({ numeroOrden: pedido.numeroOrden, cliente: pedido.cliente });
            } else if (!FORMATO_VALIDO.test(candidata)) {
              raros.push({ numeroOrden: pedido.numeroOrden, cliente: pedido.cliente, valor: candidata });
            } else {
              await prisma.pedido.update({ where: { id: pedido.id }, data: { numeroGuia: candidata } });
              actualizados++;
            }
          }
        } catch {
          vacios.push({ numeroOrden: pedido.numeroOrden, cliente: pedido.cliente });
        }
        procesados++;
        await esperar(300);
      }
    }

    const [pendientesShopify, manualesVacios] = await Promise.all([
      prisma.pedido.count({
        where: { origen: "SHOPIFY", numeroGuia: null, shopifyOrderId: { not: null } },
      }),
      prisma.pedido.count({
        where: { numeroGuia: null, OR: [{ origen: { not: "SHOPIFY" } }, { shopifyOrderId: null }] },
      }),
    ]);

    return NextResponse.json({
      procesados,
      actualizados,
      vacios,
      raros,
      pendientesShopify,
      manualesVacios,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudieron traer los números de guía" },
      { status: 500 }
    );
  }
}
