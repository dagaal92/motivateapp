import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { BILLETERAS_FLETE } from "@/lib/billeterasFlete";
import { ajustarIngresoPedido } from "@/lib/balance";
import { ajustarStockPedido } from "@/lib/inventario";
import { upsertClienteDesdePedido } from "@/lib/clientes";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pedido = await prisma.pedido.findUnique({
      where: { id: params.id },
      include: { productos: true, fletes: true },
    });
    if (!pedido) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }
    return NextResponse.json(pedido);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo cargar el pedido" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { productos, fletes, cuentaFleteId, fechaPedido, ...resto } = body;

    // Limpia campos que no existen directamente en el modelo Pedido
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(resto)) {
      if (value === undefined) continue;
      if (key === "valorTotal") {
        data[key] = value === "" || value === null ? 0 : Number(value);
      } else if (key === "cantidad") {
        data[key] = value === "" || value === null ? null : Number(value);
      } else {
        data[key] = value === "" ? null : value;
      }
    }

    const pedido = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existente = await tx.pedido.findUnique({
        where: { id: params.id },
        include: { fletes: true, productos: true },
      });
      if (!existente) throw new Error("Pedido no encontrado");

      if (Array.isArray(productos)) {
        await tx.productoPedido.deleteMany({ where: { pedidoId: params.id } });
        data.productos = {
          create: productos
            .filter((p: any) => p.color || p.referencia || p.productoId)
            .map((p: any) => ({
              color: p.color || null,
              referencia: p.referencia || null,
              cantidad: p.cantidad ? Number(p.cantidad) : 1,
              productoId: p.productoId || null,
            })),
        };
      }

      const totalFleteAnterior = existente.fletes.reduce((s, f) => s + f.valor, 0);
      let totalFleteNuevo = totalFleteAnterior;

      if (Array.isArray(fletes)) {
        await tx.fletePedido.deleteMany({ where: { pedidoId: params.id } });
        const fletesValidos = fletes.filter((f: any) => f.valor);
        totalFleteNuevo = fletesValidos.reduce(
          (s: number, f: any) => s + Number(f.valor),
          0
        );
        data.fletes = {
          create: fletesValidos.map((f: any) => ({
            valor: Number(f.valor),
            observacion: f.observacion || null,
          })),
        };
      }

      const cuentaFleteIdNueva: string | null =
        cuentaFleteId !== undefined ? cuentaFleteId || null : existente.cuentaFleteId;

      const huboCambioFlete =
        totalFleteNuevo !== totalFleteAnterior ||
        cuentaFleteIdNueva !== existente.cuentaFleteId;

      if (huboCambioFlete) {
        if (totalFleteNuevo > 0 && !cuentaFleteIdNueva) {
          throw new Error("Selecciona de qué billetera sale el flete");
        }

        // Revierte el efecto anterior sobre la billetera
        if (existente.cuentaFleteId && totalFleteAnterior > 0) {
          const cuentaAnterior = await tx.cuenta.findUnique({
            where: { id: existente.cuentaFleteId },
          });
          if (cuentaAnterior) {
            await tx.cuenta.update({
              where: { id: cuentaAnterior.id },
              data: { saldo: cuentaAnterior.saldo + totalFleteAnterior },
            });
            await tx.movimiento.create({
              data: {
                cuentaId: cuentaAnterior.id,
                tipo: "INGRESO",
                monto: totalFleteAnterior,
                categoria: "Flete",
                descripcion: `Reversión flete pedido ${existente.numeroOrden || existente.telefono} (actualizado)`,
              },
            });
          }
        }

        // Aplica el nuevo efecto
        if (cuentaFleteIdNueva && totalFleteNuevo > 0) {
          const cuentaNueva = await tx.cuenta.findUnique({
            where: { id: cuentaFleteIdNueva },
          });
          if (!cuentaNueva || !BILLETERAS_FLETE.includes(cuentaNueva.nombre as any)) {
            throw new Error(
              "Billetera inválida para el flete. Debe ser Dropi, Envia o Bancolombia."
            );
          }
          await tx.cuenta.update({
            where: { id: cuentaNueva.id },
            data: { saldo: cuentaNueva.saldo - totalFleteNuevo },
          });
          await tx.movimiento.create({
            data: {
              cuentaId: cuentaNueva.id,
              tipo: "EGRESO",
              monto: totalFleteNuevo,
              categoria: "Flete",
              descripcion: `Flete pedido ${existente.numeroOrden || existente.telefono} (actualizado)`,
            },
          });
        }

        data.cuentaFleteId = cuentaFleteIdNueva;
      }

      const pedidoActualizado = await tx.pedido.update({
        where: { id: params.id },
        data,
        include: { productos: true, fletes: true },
      });

      await ajustarIngresoPedido(tx, existente, pedidoActualizado);
      await ajustarStockPedido(tx, existente, pedidoActualizado);
      await upsertClienteDesdePedido(tx, pedidoActualizado);

      return pedidoActualizado;
    });

    return NextResponse.json(pedido);
  } catch (error) {
    console.error(error);
    const mensaje = error instanceof Error ? error.message : "No se pudo actualizar el pedido";
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const pedido = await tx.pedido.findUnique({
        where: { id: params.id },
        include: { fletes: true, productos: true },
      });
      if (!pedido) throw new Error("Pedido no encontrado");

      const totalFlete = pedido.fletes.reduce((s, f) => s + f.valor, 0);
      if (pedido.cuentaFleteId && totalFlete > 0) {
        const cuenta = await tx.cuenta.findUnique({ where: { id: pedido.cuentaFleteId } });
        if (cuenta) {
          await tx.cuenta.update({
            where: { id: cuenta.id },
            data: { saldo: cuenta.saldo + totalFlete },
          });
          await tx.movimiento.create({
            data: {
              cuentaId: cuenta.id,
              tipo: "INGRESO",
              monto: totalFlete,
              categoria: "Flete",
              descripcion: `Reversión flete - pedido eliminado (${pedido.numeroOrden || pedido.telefono})`,
            },
          });
        }
      }

      await ajustarIngresoPedido(tx, pedido, null);
      await ajustarStockPedido(tx, pedido, null);

      await tx.pedido.delete({ where: { id: params.id } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    const mensaje = error instanceof Error ? error.message : "No se pudo eliminar el pedido";
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}
