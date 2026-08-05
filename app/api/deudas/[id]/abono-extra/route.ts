import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma, CuotaDeuda } from "@prisma/client";

export const dynamic = "force-dynamic";

// Reamortiza las cuotas no pagadas de una deuda tras un abono extra a capital,
// manteniendo el valor de la cuota fija y reduciendo el número de cuotas restantes.
function reamortizar(futuras: CuotaDeuda[], abonoExtra: number, cuotaMensual: number | null) {
  const otros = futuras[0].otros;
  const A = (cuotaMensual ?? futuras[0].capital + futuras[0].interes) - otros;

  // Tasa periódica implícita: interés de la primera cuota futura / saldo pendiente en ese punto
  // (el saldo al inicio de esa cuota es la suma de capital de todas las cuotas futuras).
  const saldoInicial = futuras.reduce((s, c) => s + c.capital, 0);
  const i = saldoInicial > 0 ? futuras[0].interes / saldoInicial : 0;

  let saldo = Math.max(0, saldoInicial - abonoExtra);

  const actualizaciones: { id: string; capital: number; interes: number; total: number }[] = [];
  const aEliminar: string[] = [];

  for (const cuota of futuras) {
    if (saldo <= 0) {
      aEliminar.push(cuota.id);
      continue;
    }
    let interes = Math.round(saldo * i);
    let capital = A - interes;
    if (capital >= saldo) {
      capital = saldo;
      interes = Math.round(saldo * i);
    }
    saldo -= capital;
    actualizaciones.push({ id: cuota.id, capital, interes, total: capital + interes + otros });
  }

  return { actualizaciones, aEliminar };
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { cuentaId, monto } = body;

    if (!cuentaId || !monto || Number(monto) <= 0) {
      return NextResponse.json(
        { error: "Falta la billetera o el valor del abono" },
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
          descripcion: `Abono extra a capital: ${deuda.nombre}`,
          categoria: "Pago de deuda",
        },
      });

      const pago = await tx.pagoDeuda.create({
        data: { deudaId: deuda.id, cuentaId, movimientoId: movimiento.id, monto: montoNum },
      });

      const futuras = await tx.cuotaDeuda.findMany({
        where: { deudaId: deuda.id, pagada: false },
        orderBy: { fechaVencimiento: "asc" },
      });

      if (futuras.length > 0) {
        const { actualizaciones, aEliminar } = reamortizar(futuras, montoNum, deuda.cuotaMensual);

        for (const u of actualizaciones) {
          await tx.cuotaDeuda.update({
            where: { id: u.id },
            data: { capital: u.capital, interes: u.interes, total: u.total },
          });
        }
        if (aEliminar.length > 0) {
          await tx.cuotaDeuda.deleteMany({ where: { id: { in: aEliminar } } });
        }
      }

      const cuotasRestantes = await tx.cuotaDeuda.findMany({
        where: { deudaId: deuda.id, pagada: false },
      });
      const nuevoSaldoPendiente =
        futuras.length > 0
          ? cuotasRestantes.reduce((s, c) => s + c.total, 0)
          : Math.max(0, deuda.saldoPendiente - montoNum);

      const deudaActualizada = await tx.deuda.update({
        where: { id: deuda.id },
        data: {
          saldoPendiente: nuevoSaldoPendiente,
          estado: nuevoSaldoPendiente === 0 ? "PAGADA" : "ACTIVA",
        },
        include: { cuenta: { select: { id: true, nombre: true } } },
      });

      return { deuda: deudaActualizada, pago, cuotasRestantes: cuotasRestantes.length };
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo registrar el abono extra" }, { status: 500 });
  }
}
