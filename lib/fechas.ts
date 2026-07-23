// Colombia = UTC-5 todo el año (sin horario de verano)
export function rangoMesColombia(anio: number, mes: number) {
  const inicio = new Date(Date.UTC(anio, mes - 1, 1, 5, 0, 0));
  const fin = new Date(Date.UTC(anio, mes, 1, 5, 0, 0));
  return { inicio, fin };
}

export function rangoAnioColombia(anio: number) {
  const inicio = new Date(Date.UTC(anio, 0, 1, 5, 0, 0));
  const fin = new Date(Date.UTC(anio + 1, 0, 1, 5, 0, 0));
  return { inicio, fin };
}

/** Rango del "día de hoy" en hora de Colombia, expresado en UTC. */
export function rangoHoyColombia() {
  const ahoraColombia = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const anio = ahoraColombia.getUTCFullYear();
  const mes = ahoraColombia.getUTCMonth();
  const dia = ahoraColombia.getUTCDate();
  const inicio = new Date(Date.UTC(anio, mes, dia, 5, 0, 0));
  const fin = new Date(Date.UTC(anio, mes, dia + 1, 5, 0, 0));
  return { inicio, fin };
}
