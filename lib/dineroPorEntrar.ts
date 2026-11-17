import {
  DIAS_ESPERADOS_FINANCIACION,
  INGRESO_DINERO_ADDI,
  INGRESO_DINERO_SISTECREDITO,
} from "@/lib/financiacion";
import { limpiarGuia } from "@/lib/guia";

// "Dinero por entrar" (Dashboard): plata de pedidos abiertos que todavía no
// ha llegado a ninguna billetera, separada por el canal por donde va a
// entrar. Este archivo no toca la base de datos ni Shopify: solo tiene las
// reglas, para poder usarlas tanto en el API como en la pantalla.

export const INGRESO_DINERO_SUMAS = "Sumas";

export type CanalPorEntrar = "CONTRAENTREGA" | "SISTECREDITO" | "ADDI" | "SUMAS";

export const CANALES_POR_ENTRAR: CanalPorEntrar[] = [
  "CONTRAENTREGA",
  "SISTECREDITO",
  "ADDI",
  "SUMAS",
];

// Fracción del valor de la venta que se queda la pasarela. Son estimados con
// lo observado hasta ahora, no la liquidación real:
// - Addi crédito: 6,5% + IVA (19% sobre la comisión) → llega ≈ 92,265%.
//   (Addi débito/PSE cobra 2,5% + IVA y paga al día siguiente, pero Shopify
//   no distingue una de otra, así que se asume crédito.)
// - Addi Shop (venta que llega desde el marketplace de Addi): además cobra
//   9% de CPA + IVA → 15,5% + IVA en total (ej. #6732: 160.900 → 131.222).
// - Sistecrédito: 2% ("Valor neto a pagar" de Credinet = 98% de la factura).
// - Sumas (Intercrédito): pagó el valor completo en el único caso visto.
// - Contraentrega: no hay comisión de pasarela; Dropi/Montes descuentan el
//   flete al recaudar, así que se restan los fletes que ya estén registrados.
export const COMISION_CANAL: Record<CanalPorEntrar, number> = {
  CONTRAENTREGA: 0,
  SISTECREDITO: 0.02,
  ADDI: 0.065 * 1.19,
  SUMAS: 0,
};

export const COMISION_ADDI_SHOP = (0.065 + 0.09) * 1.19;

// Las visitas que llegan desde el marketplace de Addi (Addi Shop) traen
// como referente una página de addi.com (ej. https://campaigns.addi.com/).
const RE_REFERENTE_ADDI_SHOP = /^https?:\/\/([a-z0-9-]+\.)*addi\.com(\/|$)/i;

export function esReferenteAddiShop(url: string | null | undefined): boolean {
  return Boolean(url && RE_REFERENTE_ADDI_SHOP.test(url.trim()));
}

export const CANAL_INFO: Record<CanalPorEntrar, { label: string; detalle: string }> = {
  CONTRAENTREGA: {
    label: "Contraentrega",
    detalle:
      "Pedidos con pago contraentrega (Dropi con recaudo o Montes) ya despachados. La plata entra cuando la transportadora entrega y recauda. Neto estimado: valor menos los fletes que ya estén registrados en el pedido.",
  },
  SISTECREDITO: {
    label: "Sistecrédito",
    detalle:
      "Pedidos financiados con Sistecrédito. Neto estimado: 98% del valor (comisión 2%, como el \"Valor neto a pagar\" de Credinet). Paga muy tarde: ~75–90 días después de la venta, sin fecha fija.",
  },
  ADDI: {
    label: "Addi",
    detalle:
      "Pedidos pagados con Addi. Se asume crédito: paga 30 días después de la venta, con 6,5% + IVA de comisión (llega ≈ 92,3%); si fue débito/PSE paga al día siguiente con 2,5% + IVA. Los marcados \"Addi Shop\" (la visita llegó desde addi.com) pagan además 9% de CPA + IVA (llega ≈ 81,6%).",
  },
  SUMAS: {
    label: "Sumas",
    detalle:
      "Pedidos financiados con Sumas (Intercrédito). Neto estimado: valor completo (así pagó en el único caso visto).",
  },
};

// Valores exactos de "Ingreso Dinero" que identifican el canal por sí solos.
export const INGRESO_DINERO_CANAL: Record<string, CanalPorEntrar> = {
  [INGRESO_DINERO_ADDI]: "ADDI",
  [INGRESO_DINERO_SISTECREDITO]: "SISTECREDITO",
  [INGRESO_DINERO_SUMAS]: "SUMAS",
};

// Un pedido con alguno de estos "General" ya terminó su ciclo (o no va a
// traer plata): no se cuenta.
export const GENERALES_CERRADOS = ["Archivado", "Cancelado", "Devuelto"];

export const ESTADOS_EXCLUIDOS = ["DEVUELTO", "CANCELADO"] as const;

/** "Ingreso Dinero" vacío (o "Pendiente") = todavía no se sabe/registró a
 * qué billetera entró la plata. Cualquier otra billetera (Dropi, Mercado
 * Pago, Bancolombia...) significa que la plata ya entró. */
export function ingresoSinRegistrar(ingresoDinero: string | null): boolean {
  if (ingresoDinero === null) return true;
  const limpio = ingresoDinero.trim();
  return limpio === "" || limpio.toLowerCase() === "pendiente";
}

/** El pedido figura despachado en la app (marcado a mano). */
export function marcadoDespachado(p: { envio: string | null; estado: string }): boolean {
  return p.envio === "Despachado" || p.estado === "EN_CAMINO" || p.estado === "ENTREGADO";
}

export function netoEstimado(
  canal: CanalPorEntrar,
  valor: number,
  fletes: number,
  addiShop = false
): number {
  const comision = canal === "ADDI" && addiShop ? COMISION_ADDI_SHOP : COMISION_CANAL[canal];
  const neto = Math.round(valor * (1 - comision));
  return canal === "CONTRAENTREGA" ? Math.max(0, neto - fletes) : neto;
}

export function fechaPagoEsperado(canal: CanalPorEntrar, creadoEn: Date): Date | null {
  if (canal !== "ADDI") return null;
  const dias = DIAS_ESPERADOS_FINANCIACION[INGRESO_DINERO_ADDI];
  return new Date(creadoEn.getTime() + dias * 86400000);
}

// ---------------------------------------------------------------------------
// Pasarela de pago según Shopify. La app no guarda el método de pago del
// pedido, así que se consulta en vivo: la pasarela que cuenta es la de la
// transacción de venta que salió bien (o quedó pendiente). La lista
// "paymentGatewayNames" sola no basta porque incluye intentos fallidos (ej.
// un cliente que intentó con Mercado Pago y terminó pidiendo contraentrega).

export type PagoShopify = {
  pasarelas: string[];
  estadoFinanciero: string | null;
  preparado: boolean;
  cancelado: boolean;
  transacciones: { gateway: string | null; kind: string; status: string }[];
};

const RE_CONTRAENTREGA = /cash on delivery|\(cod\)|^cod$|contra ?entrega/i;

function canalDesdeNombrePasarela(nombre: string | null): CanalPorEntrar | null {
  if (!nombre) return null;
  if (RE_CONTRAENTREGA.test(nombre)) return "CONTRAENTREGA";
  if (/addi/i.test(nombre)) return "ADDI";
  if (/sistecr[eé]dito/i.test(nombre)) return "SISTECREDITO";
  if (/sumas|intercr[eé]dito/i.test(nombre)) return "SUMAS";
  return null;
}

export function pasarelaEfectiva(pago: PagoShopify): string | null {
  const validas = pago.transacciones.filter(
    (t) =>
      t.gateway &&
      ["SALE", "CAPTURE", "AUTHORIZATION"].includes(t.kind) &&
      ["SUCCESS", "PENDING"].includes(t.status)
  );
  const exitosa = [...validas].reverse().find((t) => t.status === "SUCCESS");
  const elegida = exitosa ?? validas[validas.length - 1];
  if (elegida?.gateway) return elegida.gateway;
  return pago.pasarelas.length > 0 ? pago.pasarelas[pago.pasarelas.length - 1] : null;
}

const ESTADOS_FINANCIEROS_PAGADOS = ["PAID", "PARTIALLY_PAID", "AUTHORIZED", "PARTIALLY_REFUNDED"];

// ---------------------------------------------------------------------------

export type PedidoParaClasificar = {
  valorTotal: number;
  estado: string;
  general: string | null;
  envio: string | null;
  ingresoDinero: string | null;
  numeroGuia: string | null;
  shopifyOrderId: string | null;
  creadoEn: Date;
};

export type Clasificacion =
  | { tipo: "CANAL"; canal: CanalPorEntrar; sinIngresoDinero: boolean; pasarela: string | null }
  | { tipo: "HISTORICO" }
  | { tipo: "NINGUNO" };

/**
 * Decide si un pedido abierto tiene plata por entrar y por qué canal.
 *
 * - Si "Ingreso Dinero" es Addi/Sistecredito/Sumas, ese es el canal sin
 *   importar la fecha (ni el corte de noviembre) ni si figura despachado:
 *   basta con que el pedido siga abierto.
 * - Si "Ingreso Dinero" es otra billetera, la plata ya entró: no cuenta.
 * - Si está vacío, el canal sale de la pasarela de Shopify (o, en pedidos
 *   manuales, se asume contraentrega). Contraentrega solo cuenta si ya se
 *   despachó (guía, marcado en la app o preparado en Shopify).
 * - Los pedidos vacíos anteriores a `corte` solo se tienen en cuenta si en la
 *   app están marcados como despachados/entregados: el resto es histórico
 *   que las billeteras ya absorbieron en el ajuste de noviembre y que falta
 *   conciliar/archivar, no plata nueva por entrar.
 *
 * `pago` es undefined cuando no se pudo consultar Shopify para ese pedido:
 * en ese caso se usa la regla de los pedidos manuales (aproximada).
 */
export function clasificarPedido(
  p: PedidoParaClasificar,
  pago: PagoShopify | undefined,
  corte: Date
): Clasificacion {
  if (p.valorTotal <= 0) return { tipo: "NINGUNO" };
  if ((ESTADOS_EXCLUIDOS as readonly string[]).includes(p.estado)) return { tipo: "NINGUNO" };
  if (p.general && GENERALES_CERRADOS.includes(p.general)) return { tipo: "NINGUNO" };

  const canalExplicito = p.ingresoDinero ? INGRESO_DINERO_CANAL[p.ingresoDinero] : undefined;
  if (canalExplicito) {
    return { tipo: "CANAL", canal: canalExplicito, sinIngresoDinero: false, pasarela: null };
  }
  if (!ingresoSinRegistrar(p.ingresoDinero)) return { tipo: "NINGUNO" };

  const tieneGuia = limpiarGuia(p.numeroGuia) !== null;
  const despachadoEnApp = marcadoDespachado(p);
  if (p.creadoEn.getTime() < corte.getTime() && !despachadoEnApp) {
    return tieneGuia ? { tipo: "HISTORICO" } : { tipo: "NINGUNO" };
  }

  if (p.shopifyOrderId && pago) {
    if (pago.cancelado) return { tipo: "NINGUNO" };
    if (pago.estadoFinanciero === "REFUNDED" || pago.estadoFinanciero === "VOIDED") {
      return { tipo: "NINGUNO" };
    }
    const pasarela = pasarelaEfectiva(pago);
    let canal = canalDesdeNombrePasarela(pasarela);
    // Pago marcado a mano ("manual") en un pedido que era contraentrega.
    if (!canal && pago.pasarelas.some((g) => RE_CONTRAENTREGA.test(g))) canal = "CONTRAENTREGA";
    if (!canal) return { tipo: "NINGUNO" }; // Mercado Pago, transferencia...: ya entró.

    if (canal === "CONTRAENTREGA") {
      const enviado = despachadoEnApp || tieneGuia || pago.preparado;
      return enviado
        ? { tipo: "CANAL", canal, sinIngresoDinero: true, pasarela }
        : { tipo: "NINGUNO" };
    }
    if (!pago.estadoFinanciero || !ESTADOS_FINANCIEROS_PAGADOS.includes(pago.estadoFinanciero)) {
      return { tipo: "NINGUNO" }; // La financiación todavía no se aprobó.
    }
    return { tipo: "CANAL", canal, sinIngresoDinero: true, pasarela };
  }

  // Pedido manual (o de Shopify sin datos de pago): si ya salió y no tiene
  // "Ingreso Dinero", lo normal es que sea contraentrega.
  return despachadoEnApp || tieneGuia
    ? { tipo: "CANAL", canal: "CONTRAENTREGA", sinIngresoDinero: true, pasarela: null }
    : { tipo: "NINGUNO" };
}

// ---------------------------------------------------------------------------
// Forma de la respuesta del API (la usa también la pantalla).

export type PedidoPorEntrar = {
  id: string;
  numeroOrden: string | null;
  cliente: string | null;
  telefono: string;
  estado: string;
  valorTotal: number;
  neto: number;
  creadoEn: string;
  pagoEsperado: string | null;
  canal: CanalPorEntrar;
  sinIngresoDinero: boolean;
  pasarela: string | null;
  addiShop: boolean;
};

export type ResumenCanal = {
  canal: CanalPorEntrar;
  cantidad: number;
  bruto: number;
  neto: number;
  pedidos: PedidoPorEntrar[];
};

export type DineroPorEntrarDatos = {
  canales: ResumenCanal[];
  total: { cantidad: number; bruto: number; neto: number };
  historicoSinConciliar: number;
  fechaCorte: string;
  avisoShopify: string | null;
};
