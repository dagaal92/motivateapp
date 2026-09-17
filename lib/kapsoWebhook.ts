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
  from?: string;
  to?: string;
  kapso?: { phone_number?: string };
};

/**
 * El número del cliente (el otro extremo de la conversación) viene en
 * lugares distintos según la dirección del mensaje. Kapso normaliza esto
 * en "kapso.phone_number"; si no viene, se cae a "from"/"to" del payload
 * crudo de WhatsApp.
 */
export function extraerTelefonoContraparte(payload: PayloadMensajeKapso): string | null {
  return payload.kapso?.phone_number || payload.from || payload.to || null;
}
