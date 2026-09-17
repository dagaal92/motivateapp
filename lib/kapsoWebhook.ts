import crypto from "crypto";

export function verificarFirmaKapso(rawBody: string, firmaHeader: string | null, secret: string) {
  if (!firmaHeader) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const digestBuf = Buffer.from(digest);
  const headerBuf = Buffer.from(firmaHeader);
  if (digestBuf.length !== headerBuf.length) return false;
  return crypto.timingSafeEqual(digestBuf, headerBuf);
}

type PayloadMensajeKapso = {
  message?: {
    id?: string;
    from?: string;
    to?: string;
    type?: string;
    text?: { body?: string };
  };
  conversation?: { phone_number?: string };
};

/**
 * Confirmado con un mensaje real: el payload viene envuelto en "message"
 * (con el "from"/"to" crudo de WhatsApp) y "conversation" (metadata de
 * Kapso sobre la conversación). "conversation.phone_number" es el más
 * confiable porque no depende de la dirección del mensaje (aplica igual
 * para recibidos y enviados); "message.from"/"message.to" quedan como
 * respaldo por si algún tipo de evento no trae "conversation".
 */
export function extraerTelefonoContraparte(payload: PayloadMensajeKapso): string | null {
  return (
    payload.conversation?.phone_number || payload.message?.from || payload.message?.to || null
  );
}

/**
 * Solo se guarda el texto cuando el mensaje es de tipo "text": para fotos,
 * audios, documentos, etc. no se descarga ni se guarda el archivo (por
 * espacio), solo queda registrado el tipo para mostrar un aviso genérico
 * en el historial ("Imagen", "Audio"...).
 */
export function extraerDatosMensaje(payload: PayloadMensajeKapso) {
  const tipo = payload.message?.type || "text";
  const contenido = tipo === "text" ? payload.message?.text?.body || null : null;
  const wamid = payload.message?.id || null;
  return { tipo, contenido, wamid };
}
