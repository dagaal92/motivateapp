import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { capturarError } from "@/lib/sentry";
import { fechaDesdeInputColombia } from "@/lib/fechas";
import { afectaSaldoPorFecha } from "@/lib/balanceCorte";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sinCategoria = req.nextUrl.searchParams.get("sinCategoria") === "1";
    const movimientos = await prisma.movimiento.findMany({
      where: sinCategoria ? { categoria: null } : undefined,
      orderBy: { fecha: "desc" },
      take: sinCategoria ? 500 : 30,
      include: { cuenta: { select: { nombre: true } } },
    });
    return NextResponse.json(movimientos);
  } catch (error) {
    await capturarError(error);
    return NextResponse.json(
      { error: "No se pudieron cargar los movimientos" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cuentaId, tipo, monto, descripcion, categoria, fecha } = body;

    if (!cuentaId || !tipo || !monto || !categoria) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    if (tipo !== "INGRESO" && tipo !== "EGRESO") {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }

    const montoNum = Math.abs(Math.round(Number(monto)));
    const fechaMovimiento: Date = fecha ? fechaDesdeInputColombia(fecha) : new Date();
    if (isNaN(fechaMovimiento.getTime())) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }
    const afectaSaldo = afectaSaldoPorFecha(fechaMovimiento);

    const resultado = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const cuenta = await tx.cuenta.findUnique({ where: { id: cuentaId } });
      if (!cuenta) throw new Error("Cuenta no encontrada");

      // Un movimiento fechado antes del corte (lib/balanceCorte.ts) queda
      // como registro histórico puro: se guarda, pero no toca el saldo.
      const cuentaActualizada = afectaSaldo
        ? await tx.cuenta.update({
            where: { id: cuentaId },
            data: {
              saldo: tipo === "INGRESO" ? cuenta.saldo + montoNum : cuenta.saldo - montoNum,
            },
          })
        : cuenta;

      const movimiento = await tx.movimiento.create({
        data: {
          cuentaId,
          tipo,
          monto: montoNum,
          descripcion: descripcion || null,
          categoria,
          fecha: fechaMovimiento,
          afectaSaldo,
        },
      });

      return { cuenta: cuentaActualizada, movimiento };
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    await capturarError(error);
    return NextResponse.json(
      { error: "No se pudo registrar el movimiento" },
      { status: 500 }
    );
  }
}
