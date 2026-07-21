import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const movimientos = await prisma.movimiento.findMany({
      orderBy: { creadoEn: "desc" },
      take: 30,
      include: { cuenta: { select: { nombre: true } } },
    });
    return NextResponse.json(movimientos);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudieron cargar los movimientos" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cuentaId, tipo, monto, descripcion } = body;

    if (!cuentaId || !tipo || !monto) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    if (tipo !== "INGRESO" && tipo !== "EGRESO") {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }

    const montoNum = Math.abs(Math.round(Number(monto)));

    const resultado = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const cuenta = await tx.cuenta.findUnique({ where: { id: cuentaId } });
      if (!cuenta) throw new Error("Cuenta no encontrada");

      const nuevoSaldo =
        tipo === "INGRESO" ? cuenta.saldo + montoNum : cuenta.saldo - montoNum;

      const cuentaActualizada = await tx.cuenta.update({
        where: { id: cuentaId },
        data: { saldo: nuevoSaldo },
      });

      const movimiento = await tx.movimiento.create({
        data: {
          cuentaId,
          tipo,
          monto: montoNum,
          descripcion: descripcion || null,
        },
      });

      return { cuenta: cuentaActualizada, movimiento };
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo registrar el movimiento" },
      { status: 500 }
    );
  }
}
