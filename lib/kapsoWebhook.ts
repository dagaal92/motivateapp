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
  message?: { from?: string; to?: string };
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
