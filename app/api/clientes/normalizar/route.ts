import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizarNombre, normalizarTelefono } from "@/lib/normalizar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Limpieza masiva de datos ya existentes: quita el +57, espacios y demás
 * caracteres no numéricos de los teléfonos, y los caracteres especiales de
 * los nombres. Como Cliente y Pedido se cruzan por el texto exacto del
 * teléfono (no hay relación en el modelo), hay que normalizar los dos lados
 * a la vez. Si dos fichas de Cliente quedan con el mismo teléfono luego de
 * limpiar (por ejemplo una se creó con "+57 300..." y otra con "300..."),
 * se fusionan en una sola conservando los datos ya completados.
 */
export async function POST() {
  try {
    const pedidos = await prisma.pedido.findMany({
      select: { id: true, telefono: true, cliente: true },
    });

    let pedidosActualizados = 0;
    for (const p of pedidos) {
      const telefonoLimpio = normalizarTelefono(p.telefono) || p.telefono;
      const clienteLimpio = normalizarNombre(p.cliente);
      const cambios: Record<string, unknown> = {};
      if (telefonoLimpio !== p.telefono) cambios.telefono = telefonoLimpio;
      if (clienteLimpio !== p.cliente) cambios.cliente = clienteLimpio;
      if (Object.keys(cambios).length > 0) {
        await prisma.pedido.update({ where: { id: p.id }, data: cambios });
        pedidosActualizados++;
      }
    }

    const clientes = await prisma.cliente.findMany();
    const grupos = new Map<string, typeof clientes>();
    for (const c of clientes) {
      const telLimpio = normalizarTelefono(c.telefono) || c.telefono;
      const lista = grupos.get(telLimpio) || [];
      lista.push(c);
      grupos.set(telLimpio, lista);
    }

    let clientesActualizados = 0;
    let duplicadosFusionados = 0;

    for (const [telefonoLimpio, grupo] of grupos) {
      const principal = grupo.find((c) => c.telefono === telefonoLimpio) || grupo[0];
      const otros = grupo.filter((c) => c.id !== principal.id);

      let nombre = normalizarNombre(principal.nombre);
      let email = principal.email;
      let ciudad = principal.ciudad;
      let departamento = principal.departamento;
      for (const dup of otros) {
        if (!nombre) nombre = normalizarNombre(dup.nombre);
        if (!email) email = dup.email;
        if (!ciudad) ciudad = dup.ciudad;
        if (!departamento) departamento = dup.departamento;
      }

      const cambia =
        principal.telefono !== telefonoLimpio ||
        principal.nombre !== nombre ||
        principal.email !== email ||
        principal.ciudad !== ciudad ||
        principal.departamento !== departamento;

      if (cambia) {
        await prisma.cliente.update({
          where: { id: principal.id },
          data: { telefono: telefonoLimpio, nombre, email, ciudad, departamento },
        });
        clientesActualizados++;
      }

      if (otros.length > 0) {
        await prisma.cliente.deleteMany({ where: { id: { in: otros.map((o) => o.id) } } });
        duplicadosFusionados += otros.length;
      }
    }

    return NextResponse.json({
      pedidosActualizados,
      clientesActualizados,
      duplicadosFusionados,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo normalizar la información" },
      { status: 500 }
    );
  }
}
