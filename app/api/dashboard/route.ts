import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rangoMesColombia, rangoAnioColombia } from "@/lib/fechas";
import { capturarError } from "@/lib/sentry";
import { INGRESOS_FINANCIACION_DIFERIDA } from "@/lib/financiacion";

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

    const [pedidos, devolucionesPendientes, porCobrarFinanciacion] = await Promise.all([
      prisma.pedido.findMany({
        where: { creadoEn: { gte: inicio, lt: fin } },
        select: {
          valorTotal: true,
          estado: true,
          fletes: { select: { valor: true } },
        },
      }),
      // No se filtra por el rango de fechas a propósito: son listas de
      // seguimiento en vivo, sin importar de cuándo sea el pedido original.
      prisma.pedido.count({
        where: { estado: "DEVUELTO", devolucionRecibidaEn: null },
      }),
      prisma.pedido.aggregate({
        where: {
          ingresoDinero: { in: [...INGRESOS_FINANCIACION_DIFERIDA] },
          general: { not: "Archivado" },
        },
        _sum: { valorTotal: true },
        _count: true,
      }),
    ]);

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
    const totalDevoluciones = pedidos.filter((p) => p.estado === "DEVUELTO").length;

    return NextResponse.json({
      anio,
      mes,
      totalPedidos,
      totalVentas,
      ventasEntregados,
      pedidosEntregados,
      pedidosPendientes,
      totalFletes,
      totalDevoluciones,
      devolucionesPendientes,
      totalPorCobrarFinanciacion: porCobrarFinanciacion._sum.valorTotal || 0,
      cantidadPorCobrarFinanciacion: porCobrarFinanciacion._count,
    });
  } catch (error) {
    await capturarError(error);
    return NextResponse.json(
      { error: "No se pudo cargar el dashboard" },
      { status: 500 }
    );
  }
}
