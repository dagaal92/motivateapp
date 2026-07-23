import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const categoria = req.nextUrl.searchParams.get("categoria");

    const opciones = await prisma.opcionMaestra.findMany({
      where: categoria ? { categoria } : undefined,
      orderBy: { valor: "asc" },
    });

    return NextResponse.json(opciones);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudieron cargar las opciones" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { categoria, valor } = body;

    if (!categoria || !valor || !valor.trim()) {
      return NextResponse.json(
        { error: "Faltan la categoría o el valor" },
        { status: 400 }
      );
    }

    const opcion = await prisma.opcionMaestra.create({
      data: { categoria, valor: valor.trim() },
    });

    return NextResponse.json(opcion, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Esa opción ya existe en esta categoría" },
        { status: 409 }
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo crear la opción" },
      { status: 500 }
    );
  }
}
