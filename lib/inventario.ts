import type { Prisma } from "@prisma/client";

type LineaProducto = { productoId: string | null; cantidad: number };
type EstadoStock = { estado: string; productos: LineaProducto[] };

function cantidadEfectiva(linea: LineaProducto, estado: string): number {
  return estado === "CANCELADO" || estado === "DEVUELTO" ? 0 : linea.cantidad;
}

function netoPorProducto(pedido: EstadoStock | null): Map<string, number> {
  const mapa = new Map<string, number>();
  if (!pedido) return mapa;
  for (const linea of pedido.productos) {
    if (!linea.productoId) continue;
    mapa.set(
      linea.productoId,
      (mapa.get(linea.productoId) || 0) + cantidadEfectiva(linea, pedido.estado)
    );
  }
  return mapa;
}

/**
 * Descuenta/repone Producto.stock comparando el estado anterior y nuevo de
 * un pedido. Un pedido Cancelado o Devuelto cuenta como cantidad 0 (repone
 * el stock) — la diferencia entre ambos es solo de reporte, no de stock.
 * Líneas sin productoId resuelto (texto libre o catálogo no importado) se
 * ignoran, no afectan el stock.
 *
 * Si una variante se borra y se recrea en Shopify (nuevo variant_id), la
 * siguiente importación del catálogo crea una fila Producto nueva en vez de
 * reusar la vieja; la vieja queda huérfana pero conserva su stock/historial.
 * Aceptable para este negocio de una sola tienda, no se resuelve con más lógica.
 */
export async function ajustarStockPedido(
  tx: Prisma.TransactionClient,
  anterior: EstadoStock | null,
  nuevo: EstadoStock | null
) {
  const mapaAnterior = netoPorProducto(anterior);
  const mapaNuevo = netoPorProducto(nuevo);
  const ids = new Set([...mapaAnterior.keys(), ...mapaNuevo.keys()]);

  for (const productoId of ids) {
    const delta = (mapaNuevo.get(productoId) || 0) - (mapaAnterior.get(productoId) || 0);
    if (delta === 0) continue;
    await tx.producto.updateMany({
      where: { id: productoId },
      data: { stock: { decrement: delta } },
    });
  }
}

/** Resuelve productoId por shopifyVariantId para un lote de líneas de una orden. */
export async function resolverProductosShopify(
  tx: Prisma.TransactionClient,
  lineas: { shopifyVariantId: string | null }[]
): Promise<Map<string, string>> {
  const ids = lineas.map((l) => l.shopifyVariantId).filter((v): v is string => !!v);
  if (ids.length === 0) return new Map();
  const productos = await tx.producto.findMany({ where: { shopifyVariantId: { in: ids } } });
  return new Map(productos.map((p) => [p.shopifyVariantId as string, p.id]));
}
