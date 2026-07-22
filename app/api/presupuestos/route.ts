import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rangoMesColombia } from "@/lib/fechas";

export const dynamic = "force-dynamic";

type Tipo = "INGRESO" | "EGRESO";

export async function GET(req: NextRequest) {
  try {
    const anio = Number(req.nextUrl.searchParams.get("anio"));
    const mes = Number(req.nextUrl.searchParams.get("mes"));
    if (!anio || !mes) {
      return NextResponse.json({ error: "Faltan año o mes" }, { status: 400 });
    }

    const { inicio, fin } = rangoMesColombia(anio, mes);

    const [categoriasGasto, categoriasIngreso, presupuestos, movimientos, sinCategorizar] =
      await Promise.all([
        prisma.opcionMaestra.findMany({
          where: { categoria: "CATEGORIA_GASTO" },
          orderBy: { valor: "asc" },
        }),
        prisma.opcionMaestra.findMany({
          where: { categoria: "CATEGORIA_INGRESO" },
          orderBy: { valor: "asc" },
        }),
        prisma.presupuesto.findMany({ where: { anio, mes } }),
        prisma.movimiento.findMany({
          where: { creadoEn: { gte: inicio, lt: fin }, categoria: { not: null } },
          select: { categoria: true, tipo: true, monto: true },
        }),
        prisma.movimiento.count({
          where: { creadoEn: { gte: inicio, lt: fin }, categoria: null },
        }),
      ]);

    // Neto por categoría: los movimientos del tipo "dueño" suman, el tipo
    // contrario resta (así una reversión de flete/venta se cancela sola).
    function calcularReal(categoria: string, tipoDueno: Tipo) {
      let ingreso = 0;
      let egreso = 0;
      for (const m of movimientos) {
        if (m.categoria !== categoria) continue;
        if (m.tipo === "INGRESO") ingreso += m.monto;
        else egreso += m.monto;
      }
      return tipoDueno === "EGRESO" ? egreso - ingreso : ingreso - egreso;
    }

    function armarFila(valor: string, tipo: Tipo) {
      const presupuesto = presupuestos.find(
        (p) => p.categoria === valor && p.tipo === tipo
      );
      return {
        categoria: valor,
        tipo,
        presupuesto: presupuesto?.monto || 0,
        real: calcularReal(valor, tipo),
      };
    }

    const gastos = categoriasGasto.map((c) => armarFila(c.valor, "EGRESO"));
    const ingresos = categoriasIngreso.map((c) => armarFila(c.valor, "INGRESO"));

    return NextResponse.json({ anio, mes, gastos, ingresos, sinCategorizar });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo cargar el reporte" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { categoria, tipo, anio, mes, monto } = body;

    if (!categoria || !tipo || !anio || !mes) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }
    if (tipo !== "INGRESO" && tipo !== "EGRESO") {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }

    const presupuesto = await prisma.presupuesto.upsert({
      where: {
        categoria_tipo_anio_mes: {
          categoria,
          tipo,
          anio: Number(anio),
          mes: Number(mes),
        },
      },
      update: { monto: Math.round(Number(monto)) || 0 },
      create: {
        categoria,
        tipo,
        anio: Number(anio),
        mes: Number(mes),
        monto: Math.round(Number(monto)) || 0,
      },
    });

    return NextResponse.json(presupuesto, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo guardar el presupuesto" },
      { status: 500 }
    );
  }
}
