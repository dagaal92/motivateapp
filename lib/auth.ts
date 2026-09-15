export const COOKIE_SESION = "motivate_session";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

// Firma con Web Crypto (disponible tanto en el runtime de middleware/Edge
// como en el runtime Node de las rutas de API) en vez del módulo "crypto" de
// Node, que no existe en Edge.
const encoder = new TextEncoder();

function bufferAHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function compararConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function firmar(mensaje: string, secreto: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const firma = await crypto.subtle.sign("HMAC", key, encoder.encode(mensaje));
  return bufferAHex(firma);
}

/**
 * Crea el valor de la cookie de sesión: no es la contraseña, es un token con
 * fecha de expiración firmado con HMAC usando la contraseña como secreto. Sin
 * conocer la contraseña no se puede forjar un token válido, y aunque alguien
 * capture la cookie no obtiene la contraseña real.
 */
export async function crearSesion(secreto: string): Promise<string> {
  const exp = Date.now() + COOKIE_MAX_AGE * 1000;
  const firma = await firmar(String(exp), secreto);
  return `${exp}.${firma}`;
}

export async function verificarSesion(
  token: string | undefined,
  secreto: string
): Promise<boolean> {
  if (!token) return false;
  const [expStr, firma] = token.split(".");
  if (!expStr || !firma) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const firmaEsperada = await firmar(expStr, secreto);
  return compararConstante(firma, firmaEsperada);
}
