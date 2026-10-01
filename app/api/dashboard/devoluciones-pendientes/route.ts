import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { capturarError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pedidos = await prisma.pedido.findMany({
      where: { estado: "DEVUELTO", devolucionRecibidaEn: null },
      select: {
        id: true,
        numeroOrden: true,
        cliente: true,
        telefono: true,
        transportadora: true,
        devueltoEn: true,
        creadoEn: true,
      },
      // Los más antiguos primero: son los que más urgencia tienen. Los
      // pedidos marcados como devueltos antes de que existiera este campo
      // no tienen devueltoEn, así que quedan al final.
      orderBy: [{ devueltoEn: { sort: "asc", nulls: "last" } }],
    });

    return NextResponse.json({ pedidos });
  } catch (error) {
    await capturarError(error);
    return NextResponse.json(
      { error: "No se pudieron cargar las devoluciones pendientes" },
      { status: 500 }
    );
  }
}
