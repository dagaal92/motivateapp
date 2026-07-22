import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [clientes, conteos] = await Promise.all([
      prisma.cliente.findMany({ orderBy: { nombre: "asc" } }),
      prisma.pedido.groupBy({ by: ["telefono"], _count: true }),
    ]);

    const mapaConteo = new Map(conteos.map((c) => [c.telefono, c._count]));

    const resultado = clientes.map((c) => ({
      ...c,
      compras: mapaConteo.get(c.telefono) || 0,
    }));

    return NextResponse.json(resultado);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudieron cargar los clientes" },
      { status: 500 }
    );
  }
}
