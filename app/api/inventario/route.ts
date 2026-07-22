import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const productos = await prisma.producto.findMany({
      orderBy: [{ nombre: "asc" }, { variante: "asc" }],
    });
    return NextResponse.json(productos);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo cargar el inventario" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, variante, stock } = body;

    if (!nombre) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }

    const producto = await prisma.producto.create({
      data: {
        nombre,
        variante: variante || null,
        stock: stock ? Number(stock) : 0,
      },
    });

    return NextResponse.json(producto, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo crear el producto" },
      { status: 500 }
    );
  }
}
