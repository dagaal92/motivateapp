import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { cuentaId, monto } = body;

    if (!cuentaId || !monto || Number(monto) <= 0) {
      return NextResponse.json(
        { error: "Falta la billetera o el valor del pago" },
        { status: 400 }
      );
    }

    const montoNum = Math.abs(Math.round(Number(monto)));

    const resultado = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const deuda = await tx.deuda.findUnique({ where: { id: params.id } });
      if (!deuda) throw new Error("Deuda no encontrada");

      const cuenta = await tx.cuenta.findUnique({ where: { id: cuentaId } });
      if (!cuenta) throw new Error("Cuenta no encontrada");

      await tx.cuenta.update({
        where: { id: cuentaId },
        data: { saldo: cuenta.saldo - montoNum },
      });

      const movimiento = await tx.movimiento.create({
        data: {
          cuentaId,
          tipo: "EGRESO",
          monto: montoNum,
          descripcion: `Pago deuda: ${deuda.nombre}`,
          categoria: "Pago de deuda",
        },
      });

      const pago = await tx.pagoDeuda.create({
        data: {
          deudaId: deuda.id,
          cuentaId,
          movimientoId: movimiento.id,
          monto: montoNum,
        },
      });

      const nuevoSaldoPendiente = Math.max(0, deuda.saldoPendiente - montoNum);

      const deudaActualizada = await tx.deuda.update({
        where: { id: deuda.id },
        data: {
          saldoPendiente: nuevoSaldoPendiente,
          estado: nuevoSaldoPendiente === 0 ? "PAGADA" : "ACTIVA",
        },
        include: { cuenta: { select: { id: true, nombre: true } } },
      });

      return { deuda: deudaActualizada, pago };
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo registrar el pago" }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pagos = await prisma.pagoDeuda.findMany({
      where: { deudaId: params.id },
      orderBy: { fecha: "desc" },
      include: { cuenta: { select: { nombre: true } } },
    });
    return NextResponse.json(pagos);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudieron cargar los pagos" }, { status: 500 });
  }
}
