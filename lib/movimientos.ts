import type { Prisma } from "@prisma/client";
import { afectaSaldoPorFecha } from "@/lib/balanceCorte";

type DatosMovimiento = {
  cuentaId: string;
  tipo: "INGRESO" | "EGRESO";
  monto: number;
  categoria: string;
  descripcion?: string | null;
  fecha?: Date;
};

/**
 * Crea un movimiento y ajusta el saldo de la cuenta (salvo que la fecha caiga
 * antes del corte de saldo). Centraliza esta lógica porque la usan tanto
 * POST /api/movimientos (formulario de Balance) como el comando por
 * WhatsApp, y no deben divergir en cómo tratan el corte de fecha.
 */
export async function crearMovimiento(
  tx: Prisma.TransactionClient,
  datos: DatosMovimiento
) {
  const montoNum = Math.abs(Math.round(datos.monto));
  const fecha = datos.fecha ?? new Date();
  const afectaSaldo = afectaSaldoPorFecha(fecha);

  const cuenta = await tx.cuenta.findUnique({ where: { id: datos.cuentaId } });
  if (!cuenta) throw new Error("Cuenta no encontrada");

  const cuentaActualizada = afectaSaldo
    ? await tx.cuenta.update({
        where: { id: datos.cuentaId },
        data: {
          saldo:
            datos.tipo === "INGRESO" ? cuenta.saldo + montoNum : cuenta.saldo - montoNum,
        },
      })
    : cuenta;

  const movimiento = await tx.movimiento.create({
    data: {
      cuentaId: datos.cuentaId,
      tipo: datos.tipo,
      monto: montoNum,
      descripcion: datos.descripcion || null,
      categoria: datos.categoria,
      fecha,
      afectaSaldo,
    },
  });

  return { cuenta: cuentaActualizada, movimiento };
}
