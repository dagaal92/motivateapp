import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rangoAnioColombia } from "@/lib/fechas";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const anio = Number(req.nextUrl.searchParams.get("anio"));
    if (!anio) {
      return NextResponse.json({ error: "Falta el año" }, { status: 400 });
    }

    const { inicio, fin } = rangoAnioColombia(anio);
    const pedidos = await prisma.pedido.findMany({
      where: { creadoEn: { gte: inicio, lt: fin } },
      select: { creadoEn: true },
    });

    const conteos = new Array(12).fill(0);
    for (const p of pedidos) {
      // Mismo corte de mes que rangoMesColombia: día 1 05:00 UTC = medianoche en Colombia.
      const local = new Date(p.creadoEn.getTime() - 5 * 60 * 60 * 1000);
      conteos[local.getUTCMonth()]++;
    }

    const meses = conteos.map((totalPedidos, i) => ({ mes: i + 1, totalPedidos }));
    return NextResponse.json({ anio, meses });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo cargar la serie mensual" },
      { status: 500 }
    );
  }
}
