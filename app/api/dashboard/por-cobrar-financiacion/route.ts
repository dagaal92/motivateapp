import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { capturarError } from "@/lib/sentry";
import { INGRESOS_FINANCIACION_DIFERIDA } from "@/lib/financiacion";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pedidos = await prisma.pedido.findMany({
      where: {
        ingresoDinero: { in: [...INGRESOS_FINANCIACION_DIFERIDA] },
        general: { not: "Archivado" },
      },
      select: {
        id: true,
        numeroOrden: true,
        cliente: true,
        telefono: true,
        ingresoDinero: true,
        valorTotal: true,
        creadoEn: true,
      },
      // Los pedidos más antiguos primero: son los que más urgencia tienen.
      orderBy: { creadoEn: "asc" },
    });

    return NextResponse.json({ pedidos });
  } catch (error) {
    await capturarError(error);
    return NextResponse.json(
      { error: "No se pudieron cargar los pedidos por cobrar" },
      { status: 500 }
    );
  }
}
