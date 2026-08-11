import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const movimientos = await prisma.movimientoInventario.findMany({
      where: { productoId: params.id },
      orderBy: { creadoEn: "desc" },
    });

    const pedidoIds = Array.from(
      new Set(movimientos.map((m) => m.pedidoId).filter((id): id is string => !!id))
    );
    const pedidos = pedidoIds.length
      ? await prisma.pedido.findMany({
          where: { id: { in: pedidoIds } },
          select: { id: true, numeroOrden: true, cliente: true, telefono: true },
        })
      : [];
    const pedidosPorId = new Map(pedidos.map((p) => [p.id, p]));

    const resultado = movimientos.map((m) => ({
      ...m,
      pedido: m.pedidoId ? pedidosPorId.get(m.pedidoId) ?? null : null,
    }));

    return NextResponse.json(resultado);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudieron cargar los movimientos" },
      { status: 500 }
    );
  }
}
