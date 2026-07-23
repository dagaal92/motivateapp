import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const deudas = await prisma.deuda.findMany({
      orderBy: [{ estado: "asc" }, { diaPago: "asc" }],
      include: {
        cuenta: { select: { id: true, nombre: true } },
        pagos: {
          where: { fecha: { gte: inicioMes } },
          orderBy: { fecha: "desc" },
        },
      },
    });

    return NextResponse.json(deudas);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudieron cargar las deudas" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, entidad, montoTotal, saldoPendiente, cuotaMensual, diaPago, cuentaId, notas } =
      body;

    if (!nombre || !nombre.trim() || !montoTotal || !diaPago) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios (nombre, valor del crédito, día de pago)" },
        { status: 400 }
      );
    }

    const dia = Math.round(Number(diaPago));
    if (dia < 1 || dia > 31) {
      return NextResponse.json({ error: "El día de pago debe estar entre 1 y 31" }, { status: 400 });
    }

    const deuda = await prisma.deuda.create({
      data: {
        nombre: nombre.trim(),
        entidad: entidad?.trim() || null,
        montoTotal: Math.round(Number(montoTotal)),
        saldoPendiente:
          saldoPendiente !== undefined && saldoPendiente !== null && saldoPendiente !== ""
            ? Math.round(Number(saldoPendiente))
            : Math.round(Number(montoTotal)),
        cuotaMensual:
          cuotaMensual !== undefined && cuotaMensual !== null && cuotaMensual !== ""
            ? Math.round(Number(cuotaMensual))
            : null,
        diaPago: dia,
        cuentaId: cuentaId || null,
        notas: notas?.trim() || null,
      },
      include: { cuenta: { select: { id: true, nombre: true } } },
    });

    return NextResponse.json(deuda, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo crear la deuda" }, { status: 500 });
  }
}
