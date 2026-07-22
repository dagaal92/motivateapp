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
    variant_id: number | null;
    product_id: number | null;
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

// Shopify a veces manda el mismo lugar con distinta capitalización/tilde
// según el checkout ("Bogota", "BogotÁ", "Bogotá, D.C."). Se normaliza a la
// forma que ya usa el listado maestro para que los desplegables la reconozcan.
const CORRECCIONES_CIUDAD: Record<string, string> = {
  bogota: "Bogotá",
  "bogotá": "Bogotá",
  medellin: "Medellín",
  "medellín": "Medellín",
  "puerto colombia": "Puerto Colombia",
};

const CORRECCIONES_DEPARTAMENTO: Record<string, string> = {
  "bogotá, d.c.": "Bogotá D.C.",
  "bogota, d.c.": "Bogotá D.C.",
};

function normalizarTexto(
  valor: string | null | undefined,
  correcciones: Record<string, string>
): string | null {
  if (!valor) return null;
  const limpio = valor.trim();
  if (!limpio) return null;
  return correcciones[limpio.toLowerCase()] || limpio;
}

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

  const ciudad =
    normalizarTexto(order.shipping_address?.city, CORRECCIONES_CIUDAD) || "Sin ciudad";
  const departamento = normalizarTexto(
    order.shipping_address?.province,
    CORRECCIONES_DEPARTAMENTO
  );

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
      shopifyVariantId: li.variant_id ? String(li.variant_id) : null,
    })),
  };
}

const PLACEHOLDERS: Record<string, string> = {
  cliente: "Cliente Shopify",
  telefono: "Sin teléfono",
  direccion: "Sin dirección",
  ciudad: "Sin ciudad",
  municipio: "Sin ciudad",
};

const CAMPOS_PROTEGIDOS = [
  "cliente",
  "telefono",
  "direccion",
  "ciudad",
  "municipio",
  "departamento",
] as const;

function esVacio(campo: string, valor: unknown) {
  if (!valor) return true;
  return valor === PLACEHOLDERS[campo];
}

/**
 * La API de Shopify a veces no trae datos de cliente/dirección por la
 * restricción de "datos protegidos" del plan de la tienda. Si el pedido ya
 * tiene un dato bueno guardado (por ejemplo, completado manualmente), no lo
 * reemplazamos por el placeholder vacío que trae Shopify en una resincronización.
 */
export function sinDegradarDatosDeContacto<T extends Record<string, any>>(
  existente: Record<string, any>,
  pedidoData: T
): T {
  const resultado = { ...pedidoData };
  for (const campo of CAMPOS_PROTEGIDOS) {
    if (esVacio(campo, resultado[campo]) && !esVacio(campo, existente[campo])) {
      delete resultado[campo];
    }
  }
  return resultado;
}
