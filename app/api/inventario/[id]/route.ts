import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { nombre, variante, stock, activo, notas } = body;

    const data: Record<string, unknown> = {};
    if (nombre !== undefined) data.nombre = nombre;
    if (variante !== undefined) data.variante = variante || null;
    if (stock !== undefined) {
      const stockNum = Number(stock);
      if (!Number.isFinite(stockNum) || stockNum < 0) {
        return NextResponse.json(
          { error: "El stock no puede ser negativo" },
          { status: 400 }
        );
      }
      data.stock = stockNum;
    }
    if (activo !== undefined) data.activo = Boolean(activo);

    const producto = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const anterior = await tx.producto.findUnique({ where: { id: params.id } });
      const actualizado = await tx.producto.update({
        where: { id: params.id },
        data,
      });

      if (stock !== undefined && anterior) {
        const delta = actualizado.stock - anterior.stock;
        if (delta !== 0) {
          await tx.movimientoInventario.create({
            data: {
              productoId: params.id,
              cantidad: delta,
              motivo: "AJUSTE_MANUAL",
              notas: notas || null,
            },
          });
        }
      }

      return actualizado;
    });

    return NextResponse.json(producto);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo actualizar el producto" },
      { status: 400 }
    );
  }
}
