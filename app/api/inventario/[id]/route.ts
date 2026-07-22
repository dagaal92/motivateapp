import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { nombre, variante, stock, activo } = body;

    const data: Record<string, unknown> = {};
    if (nombre !== undefined) data.nombre = nombre;
    if (variante !== undefined) data.variante = variante || null;
    if (stock !== undefined) data.stock = Number(stock);
    if (activo !== undefined) data.activo = Boolean(activo);

    const producto = await prisma.producto.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(producto);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo actualizar el producto" },
      { status: 400 }
    );
  }
}
