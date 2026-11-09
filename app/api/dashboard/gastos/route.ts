import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rangoMesColombia, rangoAnioColombia } from "@/lib/fechas";
import { capturarError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

const SIN_CATEGORIZAR = "Sin categorizar";

// Categorías que no son un gasto real: "Transferencia entre cuentas" es
// plata moviéndose entre tus propias billeteras, y "Ajuste de saldo" es una
// corrección contable (cuadrar el saldo calculado con el real), no algo que
// de verdad se gastó.
const CATEGORIAS_EXCLUIDAS = ["Transferencia entre cuentas", "Ajuste de saldo"];

export async function GET(req: NextRequest) {
  try {
    const anio = Number(req.nextUrl.searchParams.get("anio"));
    const mesParam = req.nextUrl.searchParams.get("mes");
    const mes = mesParam ? Number(mesParam) : null;
    if (!anio) {
      return NextResponse.json({ error: "Falta el año" }, { status: 400 });
    }

    const { inicio, fin } = mes ? rangoMesColombia(anio, mes) : rangoAnioColombia(anio);

    const movimientos = await prisma.movimiento.findMany({
      where: {
        tipo: "EGRESO",
        categoria: { notIn: CATEGORIAS_EXCLUIDAS },
        fecha: { gte: inicio, lt: fin },
      },
      select: { categoria: true, monto: true },
    });

    const porCategoria = new Map<string, { total: number; cantidad: number }>();
    for (const m of movimientos) {
      const nombre = m.categoria || SIN_CATEGORIZAR;
      const actual = porCategoria.get(nombre) || { total: 0, cantidad: 0 };
      actual.total += m.monto;
      actual.cantidad += 1;
      porCategoria.set(nombre, actual);
    }

    const categorias = Array.from(porCategoria.entries())
      .map(([categoria, v]) => ({ categoria, total: v.total, cantidad: v.cantidad }))
      .sort((a, b) => b.total - a.total);

    const totalGastos = movimientos.reduce((sum, m) => sum + m.monto, 0);

    return NextResponse.json({
      anio,
      mes,
      totalGastos,
      cantidadMovimientos: movimientos.length,
      categorias,
    });
  } catch (error) {
    await capturarError(error);
    return NextResponse.json(
      { error: "No se pudieron cargar los gastos" },
      { status: 500 }
    );
  }
}
