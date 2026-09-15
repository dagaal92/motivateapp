import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LIMITE_LISTADO_SEGURIDAD } from "@/lib/constantes";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const productos = await prisma.producto.findMany({
      orderBy: [{ nombre: "asc" }, { variante: "asc" }],
      take: LIMITE_LISTADO_SEGURIDAD,
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

    const stockInicial = stock ? Number(stock) : 0;
    if (!Number.isFinite(stockInicial) || stockInicial < 0) {
      return NextResponse.json(
        { error: "El stock inicial no puede ser negativo" },
        { status: 400 }
      );
    }

    const producto = await prisma.$transaction(async (tx) => {
      const creado = await tx.producto.create({
        data: {
          nombre,
          variante: variante || null,
          stock: stockInicial,
        },
      });

      if (stockInicial !== 0) {
        await tx.movimientoInventario.create({
          data: {
            productoId: creado.id,
            cantidad: stockInicial,
            motivo: "ALTA_PRODUCTO",
          },
        });
      }

      return creado;
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
