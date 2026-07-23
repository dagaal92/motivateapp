import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizarNombre } from "@/lib/normalizar";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { nombre, email, ciudad, departamento } = body;

    const data: Record<string, unknown> = {};
    if (nombre !== undefined) data.nombre = normalizarNombre(nombre);
    if (email !== undefined) data.email = email || null;
    if (ciudad !== undefined) data.ciudad = ciudad || null;
    if (departamento !== undefined) data.departamento = departamento || null;

    const cliente = await prisma.cliente.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(cliente);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo actualizar el cliente" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cliente = await prisma.cliente.findUnique({ where: { id: params.id } });
    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const pedidos = await prisma.pedido.count({ where: { telefono: cliente.telefono } });
    if (pedidos > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar: este cliente tiene pedidos asociados." },
        { status: 400 }
      );
    }

    await prisma.cliente.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo eliminar el cliente" },
      { status: 400 }
    );
  }
}
