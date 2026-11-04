import { rangoMesColombia } from "@/lib/fechas";

// A partir de esta fecha (inclusive) los movimientos sí afectan el saldo de
// la billetera. No es "el mes actual" de forma rotativa — es un punto de
// arranque fijo para siempre, elegido al poner en orden las billeteras en
// noviembre de 2026. Todo lo anterior queda como registro histórico puro:
// no se pierde el dato, pero nunca mueve el saldo, sin importar cuándo se
// cargue.
export const FECHA_CORTE_SALDO = rangoMesColombia(2026, 11).inicio;

export function afectaSaldoPorFecha(fecha: Date): boolean {
  return fecha.getTime() >= FECHA_CORTE_SALDO.getTime();
}
