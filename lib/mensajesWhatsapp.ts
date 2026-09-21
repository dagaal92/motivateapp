import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { capturarError } from "@/lib/sentry";

/**
 * Guarda en el historial de conversación (MensajeWhatsapp) el texto real de
 * una plantilla que la propia app acaba de mandar, para que no se quede
 * solo la etiqueta "Plantilla" sin contenido. Nunca lanza error: si esto
 * falla, el envío de WhatsApp ya fue exitoso y no hay que tumbar ni
 * reintentar nada por un problema al guardar el historial.
 *
 * Si el mismo mensaje también llega por el webhook de Kapso (evento
 * "whatsapp.message.sent"), el `wamid` repetido hace que esa segunda
 * escritura se ignore en silencio en vez de duplicar la fila.
 */
export async function registrarPlantillaSaliente(datos: {
  telefono: string;
  tipo: string;
  contenido: string;
  wamid: string | null;
}): Promise<void> {
  try {
    await prisma.mensajeWhatsapp.create({
      data: {
        telefono: datos.telefono,
        direccion: "ENVIADO",
        tipo: datos.tipo,
        contenido: datos.contenido,
        wamid: datos.wamid,
      },
    });
  } catch (error) {
    const esDuplicado =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (!esDuplicado) {
      await capturarError(error);
    }
  }
}
