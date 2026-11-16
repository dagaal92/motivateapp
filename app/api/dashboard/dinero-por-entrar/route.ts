import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { capturarError } from "@/lib/sentry";
import { FECHA_CORTE_SALDO } from "@/lib/balanceCorte";
import {
  CANALES_POR_ENTRAR,
  ESTADOS_EXCLUIDOS,
  GENERALES_CERRADOS,
  clasificarPedido,
  fechaPagoEsperado,
  ingresoSinRegistrar,
  marcadoDespachado,
  netoEstimado,
  type DineroPorEntrarDatos,
  type PagoShopify,
  type PedidoPorEntrar,
} from "@/lib/dineroPorEntrar";

export const dynamic = "force-dynamic";

const TAMANO_LOTE_SHOPIFY = 50;
// Vercel Hobby corta las funciones a los 10s: si Shopify no responde a
// tiempo, se sigue con la regla aproximada en vez de tumbar el Dashboard.
const TIMEOUT_SHOPIFY_MS = 5000;

const CONSULTA_PAGOS = `
  query PagosPedidos($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Order {
        legacyResourceId
        paymentGatewayNames
        displayFinancialStatus
        displayFulfillmentStatus
        cancelledAt
        transactions(first: 20) { gateway kind status }
      }
    }
  }
`;

type NodoOrden = {
  legacyResourceId: string;
  paymentGatewayNames: string[];
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string | null;
  cancelledAt: string | null;
  transactions: { gateway: string | null; kind: string; status: string }[];
} | null;

/** Trae de Shopify la pasarela de pago de cada pedido (solo lectura).
 * Devuelve null si no se pudo consultar. */
async function traerPagosShopify(ids: string[]): Promise<Map<string, PagoShopify> | null> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
  if (!domain || !token) return null;

  const pagos = new Map<string, PagoShopify>();
  if (ids.length === 0) return pagos;

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIMEOUT_SHOPIFY_MS);
  try {
    const lotes: string[][] = [];
    for (let i = 0; i < ids.length; i += TAMANO_LOTE_SHOPIFY) {
      lotes.push(ids.slice(i, i + TAMANO_LOTE_SHOPIFY));
    }
    for (const lote of lotes) {
      const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
        method: "POST",
        headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
        body: JSON.stringify({
          query: CONSULTA_PAGOS,
          variables: { ids: lote.map((id) => `gid://shopify/Order/${id}`) },
        }),
        cache: "no-store",
        signal: control.signal,
      });
      if (!res.ok) throw new Error(`Shopify respondió ${res.status}`);
      const json = (await res.json()) as { data?: { nodes: NodoOrden[] }; errors?: unknown };
      if (!json.data || json.errors) throw new Error("Shopify devolvió errores en la consulta");
      for (const nodo of json.data.nodes) {
        if (!nodo || !nodo.legacyResourceId) continue;
        const fulfillment = nodo.displayFulfillmentStatus;
        pagos.set(String(nodo.legacyResourceId), {
          pasarelas: nodo.paymentGatewayNames || [],
          estadoFinanciero: nodo.displayFinancialStatus,
          preparado: fulfillment === "FULFILLED" || fulfillment === "PARTIALLY_FULFILLED",
          cancelado: Boolean(nodo.cancelledAt),
          transacciones: nodo.transactions || [],
        });
      }
    }
    return pagos;
  } catch (error) {
    await capturarError(error);
    return null;
  } finally {
    clearTimeout(temporizador);
  }
}

export async function GET() {
  try {
    const corte = FECHA_CORTE_SALDO;

    // No se filtra por el mes del Dashboard a propósito: es una lista de
    // seguimiento en vivo, sin importar de cuándo sea el pedido.
    const pedidos = await prisma.pedido.findMany({
      where: {
        estado: { notIn: [...ESTADOS_EXCLUIDOS] },
        OR: [{ general: null }, { general: { notIn: GENERALES_CERRADOS } }],
        valorTotal: { gt: 0 },
      },
      select: {
        id: true,
        numeroOrden: true,
        cliente: true,
        telefono: true,
        valorTotal: true,
        estado: true,
        general: true,
        envio: true,
        ingresoDinero: true,
        numeroGuia: true,
        shopifyOrderId: true,
        creadoEn: true,
        fletes: { select: { valor: true } },
      },
      // Los pedidos más antiguos primero: son los que más urgencia tienen.
      orderBy: { creadoEn: "asc" },
    });

    // Solo se le pregunta a Shopify por los pedidos cuyo canal no está
    // claro en la app ("Ingreso Dinero" vacío) y que sí podrían contar.
    const idsShopify = pedidos
      .filter(
        (p) =>
          p.shopifyOrderId &&
          ingresoSinRegistrar(p.ingresoDinero) &&
          (p.creadoEn.getTime() >= corte.getTime() || marcadoDespachado(p))
      )
      .map((p) => p.shopifyOrderId as string);
    const pagos = await traerPagosShopify(idsShopify);

    const resumen = new Map(
      CANALES_POR_ENTRAR.map((canal) => [
        canal,
        { canal, cantidad: 0, bruto: 0, neto: 0, pedidos: [] as PedidoPorEntrar[] },
      ])
    );
    let historicoSinConciliar = 0;

    for (const p of pedidos) {
      const pago = p.shopifyOrderId && pagos ? pagos.get(p.shopifyOrderId) : undefined;
      const clasificacion = clasificarPedido(p, pago, corte);
      if (clasificacion.tipo === "HISTORICO") {
        historicoSinConciliar++;
        continue;
      }
      if (clasificacion.tipo !== "CANAL") continue;

      const { canal } = clasificacion;
      const fletes = p.fletes.reduce((s, f) => s + f.valor, 0);
      const neto = netoEstimado(canal, p.valorTotal, fletes);
      const pagoEsperado = fechaPagoEsperado(canal, p.creadoEn);
      const grupo = resumen.get(canal)!;
      grupo.cantidad++;
      grupo.bruto += p.valorTotal;
      grupo.neto += neto;
      grupo.pedidos.push({
        id: p.id,
        numeroOrden: p.numeroOrden,
        cliente: p.cliente,
        telefono: p.telefono,
        estado: p.estado,
        valorTotal: p.valorTotal,
        neto,
        creadoEn: p.creadoEn.toISOString(),
        pagoEsperado: pagoEsperado ? pagoEsperado.toISOString() : null,
        canal,
        sinIngresoDinero: clasificacion.sinIngresoDinero,
        pasarela: clasificacion.pasarela,
      });
    }

    const canales = Array.from(resumen.values());
    const datos: DineroPorEntrarDatos = {
      canales,
      total: {
        cantidad: canales.reduce((s, c) => s + c.cantidad, 0),
        bruto: canales.reduce((s, c) => s + c.bruto, 0),
        neto: canales.reduce((s, c) => s + c.neto, 0),
      },
      historicoSinConciliar,
      fechaCorte: corte.toISOString(),
      avisoShopify:
        pagos === null && idsShopify.length > 0
          ? "No se pudo consultar el método de pago en Shopify: los pedidos sin \"Ingreso Dinero\" se tomaron como contraentrega, así que la separación por canal es aproximada."
          : null,
    };

    return NextResponse.json(datos);
  } catch (error) {
    await capturarError(error);
    return NextResponse.json(
      { error: "No se pudo calcular el dinero por entrar" },
      { status: 500 }
    );
  }
}
