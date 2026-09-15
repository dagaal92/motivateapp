import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { capturarError } from "@/lib/sentry";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.opcionMaestra.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    capturarError(error);
    return NextResponse.json(
      { error: "No se pudo eliminar la opción" },
      { status: 500 }
    );
  }
}
