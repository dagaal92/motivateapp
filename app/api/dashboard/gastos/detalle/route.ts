import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rangoMesColombia, rangoAnioColombia } from "@/lib/fechas";
import { capturarError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

const SIN_CATEGORIZAR = "Sin categorizar";

export async function GET(req: NextRequest) {
  try {
    const anio = Number(req.nextUrl.searchParams.get("anio"));
    const mesParam = req.nextUrl.searchParams.get("mes");
    const mes = mesParam ? Number(mesParam) : null;
    const categoria = req.nextUrl.searchParams.get("categoria");
    if (!anio || !categoria) {
      return NextResponse.json({ error: "Falta el año o la categoría" }, { status: 400 });
    }

    const { inicio, fin } = mes ? rangoMesColombia(anio, mes) : rangoAnioColombia(anio);

    const movimientos = await prisma.movimiento.findMany({
      where: {
        tipo: "EGRESO",
        categoria: categoria === SIN_CATEGORIZAR ? null : categoria,
        fecha: { gte: inicio, lt: fin },
      },
      select: {
        id: true,
        monto: true,
        descripcion: true,
        fecha: true,
        cuenta: { select: { nombre: true } },
      },
      orderBy: { fecha: "desc" },
    });

    return NextResponse.json({ movimientos });
  } catch (error) {
    await capturarError(error);
    return NextResponse.json(
      { error: "No se pudo cargar el detalle de gastos" },
      { status: 500 }
    );
  }
}
