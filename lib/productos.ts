type ProductoPedidoResumen = {
  referencia: string | null;
  color: string | null;
  cantidad: number;
};

/**
 * Arma el listado de productos de un pedido en una sola línea de texto,
 * para plantillas de WhatsApp (que no aceptan saltos de línea en los
 * parámetros). Agrupa por producto + variante y suma cantidades, así que
 * dos unidades del mismo color/talla quedan en una sola entrada ("x2") en
 * vez de repetirse, pero variantes distintas del mismo producto se listan
 * por separado para que el cliente pueda confirmar exactamente cuáles le
 * llegan.
 */
export function formatearProductosPedido(productos: ProductoPedidoResumen[]): string {
  const variantesPorReferencia = new Map<string, Map<string, number>>();

  for (const p of productos) {
    const referencia = p.referencia?.trim() || "Producto";
    const color = p.color?.trim() || "";
    const variantes = variantesPorReferencia.get(referencia) || new Map<string, number>();
    variantes.set(color, (variantes.get(color) || 0) + p.cantidad);
    variantesPorReferencia.set(referencia, variantes);
  }

  const partes: string[] = [];
  for (const [referencia, variantes] of variantesPorReferencia) {
    if (variantes.size === 1) {
      const [[color, cantidad]] = variantes;
      partes.push(color ? `${referencia} (${color}) x${cantidad}` : `${referencia} x${cantidad}`);
    } else {
      const listaVariantes = Array.from(variantes.entries())
        .map(([color, cantidad]) => (color ? `(${color}) x${cantidad}` : `x${cantidad}`))
        .join(", ");
      partes.push(`${referencia} ${listaVariantes}`);
    }
  }

  return partes.join(", ");
}
