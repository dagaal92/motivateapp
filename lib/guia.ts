const PLACEHOLDERS_GUIA = ["n/a", "na", "-", "sin guia", "singuia", "pendiente", "0", "0000", "000000"];
const FORMATO_VALIDO_GUIA = /^[A-Za-z0-9-]{5,30}$/;

/**
 * Limpia un número de guía que puede venir con espacios o con un valor
 * placeholder ("N/A", "pendiente", etc.). Devuelve null si no hay nada
 * aprovechable.
 */
export function limpiarGuia(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const limpio = valor.trim();
  if (!limpio || PLACEHOLDERS_GUIA.includes(limpio.toLowerCase())) return null;
  return limpio;
}

export function esGuiaValida(valor: string): boolean {
  return FORMATO_VALIDO_GUIA.test(valor);
}
