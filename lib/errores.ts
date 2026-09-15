/**
 * Error de validación de negocio, pensado para mostrarse tal cual al
 * usuario (ej. "Selecciona de qué billetera sale el flete"). Cualquier otro
 * error (Prisma, de red, de programación) NO debe llegar al cliente con su
 * mensaje original — solo estos.
 */
export class ErrorValidacion extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorValidacion";
  }
}
