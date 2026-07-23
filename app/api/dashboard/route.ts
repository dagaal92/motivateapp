import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rangoMesColombia, rangoAnioColombia } from "@/lib/fechas";

export const dynamic = "force-dynamic";

const ESTADOS_PENDIENTES = ["PENDIENTE", "CONFIRMADO", "EN_CAMINO"];

export async function GET(req: NextRequest) {
  try {
    const anio = Number(req.nextUrl.searchParams.get("anio"));
    const mesParam = req.nextUrl.searchParams.get("mes");
    const mes = mesParam ? Number(mesParam) : null;
    if (!anio) {
      return NextResponse.json({ error: "Falta el año" }, { status: 400 });
    }

    const { inicio, fin } = mes ? rangoMesColombia(anio, mes) : rangoAnioColombia(anio);

    const pedidos = await prisma.pedido.findMany({
      where: { creadoEn: { gte: inicio, lt: fin } },
      select: {
        valorTotal: true,
        estado: true,
        fletes: { select: { valor: true } },
      },
    });

    const totalPedidos = pedidos.length;
    // Total ventas excluye cancelados: son pedidos que no se concretaron.
    const totalVentas = pedidos
      .filter((p) => p.estado !== "CANCELADO")
      .reduce((sum, p) => sum + p.valorTotal, 0);
    const entregados = pedidos.filter((p) => p.estado === "ENTREGADO");
    const ventasEntregados = entregados.reduce((sum, p) => sum + p.valorTotal, 0);
    const pedidosEntregados = entregados.length;
    const pedidosPendientes = pedidos.filter((p) =>
      ESTADOS_PENDIENTES.includes(p.estado)
    ).length;
    const totalFletes = pedidos.reduce(
      (sum, p) => sum + p.fletes.reduce((s, f) => s + f.valor, 0),
      0
    );

    return NextResponse.json({
      anio,
      mes,
      totalPedidos,
      totalVentas,
      ventasEntregados,
      pedidosEntregados,
      pedidosPendientes,
      totalFletes,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo cargar el dashboard" },
      { status: 500 }
    );
  }
}
