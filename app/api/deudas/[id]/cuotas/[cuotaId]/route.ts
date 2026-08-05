import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; cuotaId: string } }
) {
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.numeroCuota !== undefined) data.numeroCuota = String(body.numeroCuota).trim();
    if (body.fechaVencimiento !== undefined) data.fechaVencimiento = new Date(body.fechaVencimiento);
    if (body.capital !== undefined) data.capital = Math.round(Number(body.capital) || 0);
    if (body.interes !== undefined) data.interes = Math.round(Number(body.interes) || 0);
    if (body.otros !== undefined) data.otros = Math.round(Number(body.otros) || 0);
    if (body.total !== undefined) data.total = Math.round(Number(body.total));
    if (body.pagada !== undefined) data.pagada = Boolean(body.pagada);

    const cuota = await prisma.cuotaDeuda.update({
      where: { id: params.cuotaId },
      data,
    });

    return NextResponse.json(cuota);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo actualizar la cuota" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; cuotaId: string } }
) {
  try {
    await prisma.cuotaDeuda.delete({ where: { id: params.cuotaId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo eliminar la cuota" }, { status: 500 });
  }
}
