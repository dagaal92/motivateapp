import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.nombre !== undefined) data.nombre = String(body.nombre).trim();
    if (body.entidad !== undefined) data.entidad = body.entidad ? String(body.entidad).trim() : null;
    if (body.montoTotal !== undefined) data.montoTotal = Math.round(Number(body.montoTotal));
    if (body.saldoPendiente !== undefined)
      data.saldoPendiente = Math.max(0, Math.round(Number(body.saldoPendiente)));
    if (body.cuotaMensual !== undefined)
      data.cuotaMensual =
        body.cuotaMensual === null || body.cuotaMensual === ""
          ? null
          : Math.round(Number(body.cuotaMensual));
    if (body.diaPago !== undefined) data.diaPago = Math.round(Number(body.diaPago));
    if (body.cuentaId !== undefined) data.cuentaId = body.cuentaId || null;
    if (body.notas !== undefined) data.notas = body.notas ? String(body.notas).trim() : null;
    if (body.estado !== undefined) data.estado = body.estado;

    const deuda = await prisma.deuda.update({
      where: { id: params.id },
      data,
      include: { cuenta: { select: { id: true, nombre: true } } },
    });

    return NextResponse.json(deuda);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo actualizar la deuda" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.deuda.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo eliminar la deuda" }, { status: 500 });
  }
}
