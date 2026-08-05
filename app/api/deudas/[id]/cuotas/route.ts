import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cuotas = await prisma.cuotaDeuda.findMany({
      where: { deudaId: params.id },
      orderBy: { fechaVencimiento: "asc" },
    });
    return NextResponse.json(cuotas);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo cargar el cronograma" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { numeroCuota, fechaVencimiento, capital, interes, otros, total } = body;

    if (!numeroCuota || !fechaVencimiento || total === undefined || total === null) {
      return NextResponse.json(
        { error: "Faltan el número de cuota, la fecha de vencimiento o el total" },
        { status: 400 }
      );
    }

    const cuota = await prisma.cuotaDeuda.create({
      data: {
        deudaId: params.id,
        numeroCuota: String(numeroCuota).trim(),
        fechaVencimiento: new Date(fechaVencimiento),
        capital: Math.round(Number(capital) || 0),
        interes: Math.round(Number(interes) || 0),
        otros: Math.round(Number(otros) || 0),
        total: Math.round(Number(total)),
      },
    });

    return NextResponse.json(cuota, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo agregar la cuota" }, { status: 500 });
  }
}
