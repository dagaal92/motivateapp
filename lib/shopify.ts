export type ShopifyOrder = {
  id: number;
  name: string;
  created_at: string;
  note: string | null;
  total_price: string;
  cancelled_at: string | null;
  financial_status: string | null;
  fulfillment_status: string | null;
  phone: string | null;
  line_items: {
    title: string;
    variant_title: string | null;
    quantity: number;
  }[];
  customer: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  } | null;
  shipping_address: {
    name: string | null;
    address1: string | null;
    address2: string | null;
    city: string | null;
    province: string | null;
    phone: string | null;
  } | null;
};

export type EstadoPedido =
  | "PENDIENTE"
  | "CONFIRMADO"
  | "EN_CAMINO"
  | "ENTREGADO"
  | "CANCELADO";

export function mapEstado(order: ShopifyOrder): EstadoPedido {
  if (order.cancelled_at) return "CANCELADO";
  if (order.fulfillment_status === "fulfilled") return "ENTREGADO";
  if (order.fulfillment_status === "partial") return "EN_CAMINO";
  if (order.financial_status === "paid") return "CONFIRMADO";
  return "PENDIENTE";
}

export function mapPedidoData(order: ShopifyOrder) {
  const cliente =
    `${order.customer?.first_name ?? ""} ${order.customer?.last_name ?? ""}`.trim() ||
    order.shipping_address?.name ||
    "Cliente Shopify";

  const telefono =
    order.shipping_address?.phone ||
    order.customer?.phone ||
    order.phone ||
    "Sin teléfono";

  const direccion = order.shipping_address
    ? `${order.shipping_address.address1 ?? ""} ${order.shipping_address.address2 ?? ""}`.trim() ||
      "Sin dirección"
    : "Sin dirección";

  const ciudad = order.shipping_address?.city || "Sin ciudad";
  const departamento = order.shipping_address?.province || null;

  const cantidad =
    order.line_items.reduce((sum, li) => sum + li.quantity, 0) || 1;

  const producto =
    order.line_items.map((li) => `${li.title} x${li.quantity}`).join(", ") ||
    "Producto Shopify";

  const valorTotal = Math.round(parseFloat(order.total_price));

  return {
    numeroOrden: order.name.replace(/^#/, ""),
    cliente,
    telefono,
    direccion,
    ciudad,
    municipio: ciudad,
    departamento,
    producto,
    cantidad,
    valorTotal,
    estado: mapEstado(order),
    origen: "SHOPIFY" as const,
    notas: order.note,
    shopifyOrderId: String(order.id),
    creadoEn: new Date(order.created_at),
    productos: order.line_items.map((li) => ({
      referencia: li.title || null,
      color: li.variant_title || null,
      cantidad: li.quantity || 1,
    })),
  };
}
