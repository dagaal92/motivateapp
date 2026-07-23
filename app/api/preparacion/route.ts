import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rangoHoyColombia } from "@/lib/fechas";
import { GENERAL_LISTO_PARA_PREPARAR } from "@/lib/preparacion";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { inicio, fin } = rangoHoyColombia();

    const [pendientes, preparadosHoy] = await Promise.all([
      prisma.pedido.findMany({
        where: { general: GENERAL_LISTO_PARA_PREPARAR, completadoEn: null },
        include: { productos: { include: { producto: true } }, fletes: true },
        orderBy: [{ actualizadoEn: "desc" }, { numeroOrden: "asc" }],
      }),
      prisma.pedido.count({
        where: { completadoEn: { gte: inicio, lt: fin } },
      }),
    ]);

    return NextResponse.json({ pendientes, preparadosHoy });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo cargar la preparación de pedidos" },
      { status: 500 }
    );
  }
}
