import type { Prisma } from "@prisma/client";
import { CUENTAS_BASE } from "@/lib/cuentas";

type EstadoIngreso = {
  estado: string;
  ingresoDinero: string | null;
  valorTotal: number;
  numeroOrden: string | null;
  telefono: string;
};

type Efecto = { cuentaNombre: string; monto: number };

function calcularEfecto(pedido: EstadoIngreso | null): Efecto | null {
  if (!pedido) return null;
  if (pedido.estado !== "ENTREGADO") return null;
  if (!pedido.ingresoDinero || !CUENTAS_BASE.includes(pedido.ingresoDinero as any)) return null;
  if (pedido.valorTotal <= 0) return null;
  return { cuentaNombre: pedido.ingresoDinero, monto: pedido.valorTotal };
}

function mismoEfecto(a: Efecto | null, b: Efecto | null) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.cuentaNombre === b.cuentaNombre && a.monto === b.monto;
}

/**
 * Suma el valor de venta a la billetera de "Ingreso Dinero" solo mientras el
 * pedido esté en estado Entregado; revierte el efecto anterior si el pedido
 * deja de cumplir esa condición o cambia de billetera/valor.
 */
export async function ajustarIngresoPedido(
  tx: Prisma.TransactionClient,
  anterior: EstadoIngreso | null,
  nuevo: EstadoIngreso | null
) {
  const efectoAnterior = calcularEfecto(anterior);
  const efectoNuevo = calcularEfecto(nuevo);

  if (mismoEfecto(efectoAnterior, efectoNuevo)) return;

  if (efectoAnterior) {
    const cuenta = await tx.cuenta.findUnique({ where: { nombre: efectoAnterior.cuentaNombre } });
    if (cuenta) {
      await tx.cuenta.update({
        where: { id: cuenta.id },
        data: { saldo: cuenta.saldo - efectoAnterior.monto },
      });
      await tx.movimiento.create({
        data: {
          cuentaId: cuenta.id,
          tipo: "EGRESO",
          monto: efectoAnterior.monto,
          categoria: "Venta",
          descripcion: `Reversión venta pedido ${anterior!.numeroOrden || anterior!.telefono}`,
        },
      });
    }
  }

  if (efectoNuevo) {
    const cuenta = await tx.cuenta.findUnique({ where: { nombre: efectoNuevo.cuentaNombre } });
    if (cuenta) {
      await tx.cuenta.update({
        where: { id: cuenta.id },
        data: { saldo: cuenta.saldo + efectoNuevo.monto },
      });
      await tx.movimiento.create({
        data: {
          cuentaId: cuenta.id,
          tipo: "INGRESO",
          monto: efectoNuevo.monto,
          categoria: "Venta",
          descripcion: `Venta pedido ${nuevo!.numeroOrden || nuevo!.telefono}`,
        },
      });
    }
  }
}
