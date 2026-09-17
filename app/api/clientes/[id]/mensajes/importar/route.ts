import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsearExportacionWhatsapp, remitentesUnicos } from "@/lib/whatsappExport";
import { capturarError } from "@/lib/sentry";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Sin remitenteNegocio: solo analiza el archivo y devuelve una vista previa
// (cuántos mensajes encontró y quiénes participan), sin guardar nada. Con
// remitenteNegocio: ya sabe cuál de los remitentes es el negocio y guarda
// los mensajes de verdad.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cliente = await prisma.cliente.findUnique({ where: { id: params.id } });
    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const { texto, remitenteNegocio } = await req.json();
    if (!texto || typeof texto !== "string") {
      return NextResponse.json({ error: "Falta el contenido del archivo" }, { status: 400 });
    }

    const mensajes = parsearExportacionWhatsapp(texto);
    if (mensajes.length === 0) {
      return NextResponse.json(
        {
          error:
            "No se reconoció ningún mensaje en el archivo. Verifica que sea el .txt exportado directamente desde WhatsApp (Exportar chat).",
        },
        { status: 400 }
      );
    }

    if (!remitenteNegocio) {
      return NextResponse.json({
        vistaPrevia: true,
        totalMensajes: mensajes.length,
        remitentes: remitentesUnicos(mensajes),
        muestra: mensajes.slice(0, 5),
      });
    }

    // Evita duplicar si el mismo archivo se sube más de una vez: no hay un
    // ID de mensaje en el .txt exportado, así que se compara por
    // fecha+contenido exactos contra lo que ya está guardado para este
    // teléfono.
    const existentes = await prisma.mensajeWhatsapp.findMany({
      where: { telefono: cliente.telefono },
      select: { contenido: true, creadoEn: true },
    });
    const yaExiste = new Set(existentes.map((m) => `${m.creadoEn.getTime()}|${m.contenido}`));

    const datos = mensajes
      .filter((m) => !yaExiste.has(`${m.fecha.getTime()}|${m.contenido}`))
      .map((m) => ({
        telefono: cliente.telefono,
        direccion: (m.remitente === remitenteNegocio ? "ENVIADO" : "RECIBIDO") as
          | "ENVIADO"
          | "RECIBIDO",
        tipo: m.tipo,
        contenido: m.contenido,
        creadoEn: m.fecha,
      }));

    if (datos.length > 0) {
      await prisma.mensajeWhatsapp.createMany({ data: datos });
    }

    return NextResponse.json({
      insertados: datos.length,
      omitidos: mensajes.length - datos.length,
    });
  } catch (error) {
    await capturarError(error);
    return NextResponse.json(
      { error: "No se pudo importar la conversación" },
      { status: 500 }
    );
  }
}
