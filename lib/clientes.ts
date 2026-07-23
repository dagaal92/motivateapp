import type { Prisma } from "@prisma/client";
import { normalizarTelefono } from "@/lib/normalizar";

const PLACEHOLDERS_CLIENTE = new Set(["Cliente Shopify"]);
const PLACEHOLDERS_UBICACION = new Set(["Sin ciudad"]);

function esVacio(valor: string | null | undefined, placeholders: Set<string>) {
  if (!valor) return true;
  return placeholders.has(valor);
}

type DatosPedidoParaCliente = {
  telefono: string;
  cliente?: string | null;
  ciudad?: string | null;
  departamento?: string | null;
};

/**
 * Crea o actualiza el Cliente correspondiente a un pedido, buscando por
 * teléfono. Nunca reemplaza un dato bueno ya guardado (nombre/ciudad real)
 * por un placeholder o un valor vacío que venga del pedido — mismo patrón
 * que sinDegradarDatosDeContacto en lib/shopify.ts.
 */
export async function upsertClienteDesdePedido(
  tx: Prisma.TransactionClient,
  datos: DatosPedidoParaCliente
) {
  const telefono = normalizarTelefono(datos.telefono) || datos.telefono?.trim();
  if (!telefono || telefono === "Sin teléfono") return;

  const existente = await tx.cliente.findUnique({ where: { telefono } });

  if (!existente) {
    await tx.cliente.create({
      data: {
        telefono,
        nombre: esVacio(datos.cliente, PLACEHOLDERS_CLIENTE) ? null : datos.cliente,
        ciudad: esVacio(datos.ciudad, PLACEHOLDERS_UBICACION) ? null : datos.ciudad,
        departamento: datos.departamento || null,
      },
    });
    return;
  }

  const data: Record<string, string> = {};
  if (esVacio(existente.nombre, new Set()) && !esVacio(datos.cliente, PLACEHOLDERS_CLIENTE)) {
    data.nombre = datos.cliente!;
  }
  if (esVacio(existente.ciudad, new Set()) && !esVacio(datos.ciudad, PLACEHOLDERS_UBICACION)) {
    data.ciudad = datos.ciudad!;
  }
  if (!existente.departamento && datos.departamento) {
    data.departamento = datos.departamento;
  }

  if (Object.keys(data).length > 0) {
    await tx.cliente.update({ where: { id: existente.id }, data });
  }
}
