import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { capturarError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

// Historial reciente, no completo: alcanza para lo que se necesita
// (revisar la conversación) sin cargar años de mensajes de un cliente
// con mucho movimiento.
const LIMITE_MENSAJES = 200;

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cliente = await prisma.cliente.findUnique({ where: { id: params.id } });
    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const mensajes = await prisma.mensajeWhatsapp.findMany({
      where: { telefono: cliente.telefono },
      orderBy: { creadoEn: "desc" },
      take: LIMITE_MENSAJES,
    });

    return NextResponse.json({
      cliente: { nombre: cliente.nombre, telefono: cliente.telefono },
      mensajes: mensajes.reverse(),
    });
  } catch (error) {
    await capturarError(error);
    return NextResponse.json(
      { error: "No se pudo cargar el historial de mensajes" },
      { status: 500 }
    );
  }
}
