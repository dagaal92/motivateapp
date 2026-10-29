// Valores exactos que debe tener "Ingreso Dinero" (Maestros) para que un
// pedido se considere financiado por una pasarela de pago diferido: la
// plata no entra de inmediato (Addi paga al mes siguiente, Sistecrédito a
// los 3 meses), así que mientras tenga uno de estos valores no se puede
// archivar el pedido.
export const INGRESO_DINERO_ADDI = "Addi";
export const INGRESO_DINERO_SISTECREDITO = "Sistecredito";

export const INGRESOS_FINANCIACION_DIFERIDA = [
  INGRESO_DINERO_ADDI,
  INGRESO_DINERO_SISTECREDITO,
] as const;

export function esFinanciacionDiferida(ingresoDinero: string | null): boolean {
  return (
    ingresoDinero !== null &&
    (INGRESOS_FINANCIACION_DIFERIDA as readonly string[]).includes(ingresoDinero)
  );
}

// Plazo típico de pago de cada pasarela, usado solo para resaltar en el
// Dashboard cuáles llevan más tiempo esperando de lo normal.
export const DIAS_ESPERADOS_FINANCIACION: Record<string, number> = {
  [INGRESO_DINERO_ADDI]: 30,
  [INGRESO_DINERO_SISTECREDITO]: 90,
};
