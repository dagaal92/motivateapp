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
