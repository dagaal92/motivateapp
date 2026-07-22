import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CUENTAS_BASE } from "@/lib/cuentas";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Migra el nombre viejo "Envío" a "Envia" sin perder el saldo ya registrado
    const anterior = await prisma.cuenta.findUnique({ where: { nombre: "Envío" } });
    const nueva = await prisma.cuenta.findUnique({ where: { nombre: "Envia" } });
    if (anterior && !nueva) {
      await prisma.cuenta.update({
        where: { id: anterior.id },
        data: { nombre: "Envia" },
      });
    }

    await prisma.cuenta.createMany({
      data: CUENTAS_BASE.map((nombre) => ({ nombre })),
      skipDuplicates: true,
    });

    const cuentas = await prisma.cuenta.findMany();

    const ordenadas = CUENTAS_BASE.map((nombre) =>
      cuentas.find((c: { nombre: string }) => c.nombre === nombre)
    ).filter(Boolean);

    return NextResponse.json(ordenadas);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudieron cargar las cuentas" },
      { status: 500 }
    );
  }
}
