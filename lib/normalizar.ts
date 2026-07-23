/**
 * Dado un teléfono con o sin indicativo de Colombia, espacios, guiones, etc.,
 * devuelve solo los dígitos. Si quedan 12 dígitos que arrancan en "57"
 * (indicativo de Colombia + celular de 10 dígitos), se lo quita.
 */
export function normalizarTelefono(valor: string | null | undefined): string {
  if (!valor) return "";
  let digitos = valor.replace(/\D/g, "");
  if (digitos.length === 12 && digitos.startsWith("57")) {
    digitos = digitos.slice(2);
  }
  return digitos;
}

/** Deja solo letras (con tildes/ñ) y espacios; colapsa espacios repetidos. */
export function normalizarNombre(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const limpio = valor
    .replace(/[^\p{L}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  return limpio || null;
}
