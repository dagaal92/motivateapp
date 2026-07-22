import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { categoria } = body;

    if (categoria !== null && typeof categoria !== "string") {
      return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });
    }

    const movimiento = await prisma.movimiento.update({
      where: { id: params.id },
      data: { categoria: categoria || null },
      include: { cuenta: { select: { nombre: true } } },
    });

    return NextResponse.json(movimiento);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo actualizar la categoría" },
      { status: 400 }
    );
  }
}
