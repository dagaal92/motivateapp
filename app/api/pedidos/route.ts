import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { BILLETERAS_FLETE } from "@/lib/billeterasFlete";
import { ajustarIngresoPedido } from "@/lib/balance";
import { ajustarStockPedido } from "@/lib/inventario";
import { upsertClienteDesdePedido } from "@/lib/clientes";

export async function GET(req: NextRequest) {
  try {
    const telefono = req.nextUrl.searchParams.get("telefono");
    const pedidos = await prisma.pedido.findMany({
      where: telefono ? { telefono } : undefined,
      orderBy: { creadoEn: "desc" },
    });
    return NextResponse.json(pedidos);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudieron cargar los pedidos" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      numeroOrden,
      cliente,
      telefono,
      direccion,
      ciudad,
      valorTotal,
      estado,
      prioridad,
      general,
      numeroGuia,
      transportadora,
      envio,
      ingresoDinero,
      departamento,
      municipio,
      notas,
      productos,
      fletes,
      cuentaFleteId,
    } = body;

    if (!telefono) {
      return NextResponse.json(
        { error: "El teléfono es obligatorio" },
        { status: 400 }
      );
    }

    const fletesValidos = (fletes || []).filter((f: any) => f.valor);
    const totalFlete = fletesValidos.reduce(
      (sum: number, f: any) => sum + Number(f.valor),
      0
    );

    if (totalFlete > 0 && !cuentaFleteId) {
      return NextResponse.json(
        { error: "Selecciona de qué billetera sale el flete" },
        { status: 400 }
      );
    }

    const pedido = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let cuenta = null;
      if (totalFlete > 0) {
        cuenta = await tx.cuenta.findUnique({ where: { id: cuentaFleteId } });
        if (!cuenta || !BILLETERAS_FLETE.includes(cuenta.nombre as any)) {
          throw new Error(
            "Billetera inválida para el flete. Debe ser Dropi, Envia o Bancolombia."
          );
        }
      }

      const nuevoPedido = await tx.pedido.create({
        data: {
          numeroOrden: numeroOrden || null,
          cliente: cliente || null,
          telefono,
          direccion: direccion || null,
          ciudad: ciudad || null,
          valorTotal: valorTotal ? Number(valorTotal) : 0,
          estado: estado || "PENDIENTE",
          prioridad: prioridad || null,
          general: general || null,
          numeroGuia: numeroGuia || null,
          transportadora: transportadora || null,
          envio: envio || null,
          ingresoDinero: ingresoDinero || null,
          departamento: departamento || null,
          municipio: municipio || null,
          notas: notas || null,
          cuentaFleteId: cuenta ? cuenta.id : null,
          productos: {
            create: (productos || [])
              .filter((p: any) => p.color || p.referencia || p.productoId)
              .map((p: any) => ({
                color: p.color || null,
                referencia: p.referencia || null,
                cantidad: p.cantidad ? Number(p.cantidad) : 1,
                productoId: p.productoId || null,
              })),
          },
          fletes: {
            create: fletesValidos.map((f: any) => ({
              valor: Number(f.valor),
              observacion: f.observacion || null,
            })),
          },
        },
        include: { productos: true, fletes: true },
      });

      if (cuenta) {
        await tx.cuenta.update({
          where: { id: cuenta.id },
          data: { saldo: cuenta.saldo - totalFlete },
        });
        await tx.movimiento.create({
          data: {
            cuentaId: cuenta.id,
            tipo: "EGRESO",
            monto: totalFlete,
            categoria: "Flete",
            descripcion: `Flete pedido ${nuevoPedido.numeroOrden || nuevoPedido.telefono}`,
          },
        });
      }

      await ajustarIngresoPedido(tx, null, nuevoPedido);
      await ajustarStockPedido(tx, null, nuevoPedido);
      await upsertClienteDesdePedido(tx, nuevoPedido);

      return nuevoPedido;
    });

    return NextResponse.json(pedido, { status: 201 });
  } catch (error) {
    console.error(error);
    const mensaje = error instanceof Error ? error.message : "No se pudo crear el pedido";
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}
