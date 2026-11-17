import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { capturarError } from "@/lib/sentry";
import { FECHA_CORTE_SALDO } from "@/lib/balanceCorte";
import {
  CANALES_POR_ENTRAR,
  ESTADOS_EXCLUIDOS,
  GENERALES_CERRADOS,
  INGRESO_DINERO_CANAL,
  clasificarPedido,
  esReferenteAddiShop,
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

// Va en una consulta aparte (y en paralelo) para que, si algún día falla,
// solo se pierda la detección de Addi Shop y no la clasificación por canal.
const CONSULTA_REFERENTES = `
  query ReferentesPedidos($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Order {
        legacyResourceId
        customerJourneySummary {
          firstVisit { referrerUrl }
          lastVisit { referrerUrl }
        }
      }
    }
  }
`;

type NodoPago = {
  legacyResourceId: string;
  paymentGatewayNames: string[];
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string | null;
  cancelledAt: string | null;
  transactions: { gateway: string | null; kind: string; status: string }[];
};

type NodoReferente = {
  legacyResourceId: string;
  customerJourneySummary: {
    firstVisit: { referrerUrl: string | null } | null;
    lastVisit: { referrerUrl: string | null } | null;
  } | null;
};

/** Consulta pedidos de Shopify por id (solo lectura), en lotes. Devuelve
 * null si no se pudo consultar. */
async function consultarPedidosShopify<N extends { legacyResourceId: string }, T>(
  consulta: string,
  ids: string[],
  convertir: (nodo: N) => T
): Promise<Map<string, T> | null> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
  if (!domain || !token) return null;

  const resultado = new Map<string, T>();
  if (ids.length === 0) return resultado;

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIMEOUT_SHOPIFY_MS);
  try {
    for (let i = 0; i < ids.length; i += TAMANO_LOTE_SHOPIFY) {
      const lote = ids.slice(i, i + TAMANO_LOTE_SHOPIFY);
      const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
        method: "POST",
        headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
        body: JSON.stringify({
          query: consulta,
          variables: { ids: lote.map((id) => `gid://shopify/Order/${id}`) },
        }),
        cache: "no-store",
        signal: control.signal,
      });
      if (!res.ok) throw new Error(`Shopify respondió ${res.status}`);
      const json = (await res.json()) as { data?: { nodes: (N | null)[] }; errors?: unknown };
      if (!json.data || json.errors) throw new Error("Shopify devolvió errores en la consulta");
      for (const nodo of json.data.nodes) {
        if (!nodo || !nodo.legacyResourceId) continue;
        resultado.set(String(nodo.legacyResourceId), convertir(nodo));
      }
    }
    return resultado;
  } catch (error) {
    await capturarError(error);
    return null;
  } finally {
    clearTimeout(temporizador);
  }
}

/** Pasarela de pago de cada pedido. */
function traerPagosShopify(ids: string[]) {
  return consultarPedidosShopify<NodoPago, PagoShopify>(CONSULTA_PAGOS, ids, (nodo) => {
    const fulfillment = nodo.displayFulfillmentStatus;
    return {
      pasarelas: nodo.paymentGatewayNames || [],
      estadoFinanciero: nodo.displayFinancialStatus,
      preparado: fulfillment === "FULFILLED" || fulfillment === "PARTIALLY_FULFILLED",
      cancelado: Boolean(nodo.cancelledAt),
      transacciones: nodo.transactions || [],
    };
  });
}

/** true si la visita que terminó en el pedido llegó desde addi.com (Addi Shop). */
function traerAddiShop(ids: string[]) {
  return consultarPedidosShopify<NodoReferente, boolean>(CONSULTA_REFERENTES, ids, (nodo) => {
    const viaje = nodo.customerJourneySummary;
    return (
      esReferenteAddiShop(viaje?.firstVisit?.referrerUrl) ||
      esReferenteAddiShop(viaje?.lastVisit?.referrerUrl)
    );
  });
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
    // Para Addi Shop hay que mirar también los que ya dicen "Addi".
    const idsReferentes = Array.from(
      new Set([
        ...idsShopify,
        ...pedidos
          .filter((p) => p.shopifyOrderId && p.ingresoDinero && INGRESO_DINERO_CANAL[p.ingresoDinero] === "ADDI")
          .map((p) => p.shopifyOrderId as string),
      ])
    );
    const [pagos, addiShop] = await Promise.all([
      traerPagosShopify(idsShopify),
      traerAddiShop(idsReferentes),
    ]);

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
      const esAddiShop =
        canal === "ADDI" && Boolean(p.shopifyOrderId && addiShop?.get(p.shopifyOrderId));
      const fletes = p.fletes.reduce((s, f) => s + f.valor, 0);
      const neto = netoEstimado(canal, p.valorTotal, fletes, esAddiShop);
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
        addiShop: esAddiShop,
      });
    }

    const canales = Array.from(resumen.values());
    const avisos: string[] = [];
    if (pagos === null && idsShopify.length > 0) {
      avisos.push(
        "No se pudo consultar el método de pago en Shopify: los pedidos sin \"Ingreso Dinero\" se tomaron como contraentrega, así que la separación por canal es aproximada."
      );
    }
    if (addiShop === null && resumen.get("ADDI")!.cantidad > 0) {
      avisos.push(
        "No se pudo verificar en Shopify cuáles pedidos de Addi vienen de Addi Shop: todos se estimaron con la comisión normal de Addi."
      );
    }
    const datos: DineroPorEntrarDatos = {
      canales,
      total: {
        cantidad: canales.reduce((s, c) => s + c.cantidad, 0),
        bruto: canales.reduce((s, c) => s + c.bruto, 0),
        neto: canales.reduce((s, c) => s + c.neto, 0),
      },
      historicoSinConciliar,
      fechaCorte: corte.toISOString(),
      avisoShopify: avisos.length > 0 ? avisos.join(" ") : null,
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
