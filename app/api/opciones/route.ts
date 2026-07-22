import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SEED: Record<string, string[]> = {
  GENERAL: ["Por revisar", "Por despachar", "Despachado", "Devuelto", "Cancelado"],
  PRIORIDAD: ["Alta", "Media", "Baja"],
  TRANSPORTADORA: ["Servientrega", "Inter Rapidísimo", "Coordinadora", "TCC"],
  ENVIO: ["Pendiente", "En tránsito", "Entregado", "Devuelto"],
  INGRESO_DINERO: ["Pendiente", "Pagado", "Parcial"],
  DEPARTAMENTO: [
    "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bolívar", "Boyacá",
    "Caldas", "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba",
    "Cundinamarca", "Guainía", "Guaviare", "Huila", "La Guajira", "Magdalena",
    "Meta", "Nariño", "Norte de Santander", "Putumayo", "Quindío",
    "Risaralda", "San Andrés y Providencia", "Santander", "Sucre", "Tolima",
    "Valle del Cauca", "Vaupés", "Vichada", "Bogotá D.C.",
  ],
  MUNICIPIO: [],
  COLOR: [],
  REFERENCIA: [],
  CATEGORIA_GASTO: [
    "Flete",
    "Publicidad",
    "Nómina",
    "Insumos e inventario",
    "Comisiones pasarela de pago",
    "Arriendo y servicios",
    "Otros gastos",
  ],
  CATEGORIA_INGRESO: ["Venta", "Otros ingresos"],
};

let seeded = false;

async function asegurarSemillas() {
  if (seeded) return;
  for (const [categoria, valores] of Object.entries(SEED)) {
    if (valores.length === 0) continue;
    await prisma.opcionMaestra.createMany({
      data: valores.map((valor) => ({ categoria, valor })),
      skipDuplicates: true,
    });
  }
  seeded = true;
}

export async function GET(req: NextRequest) {
  try {
    await asegurarSemillas();
    const categoria = req.nextUrl.searchParams.get("categoria");

    const opciones = await prisma.opcionMaestra.findMany({
      where: categoria ? { categoria } : undefined,
      orderBy: { valor: "asc" },
    });

    return NextResponse.json(opciones);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudieron cargar las opciones" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { categoria, valor } = body;

    if (!categoria || !valor || !valor.trim()) {
      return NextResponse.json(
        { error: "Faltan la categoría o el valor" },
        { status: 400 }
      );
    }

    const opcion = await prisma.opcionMaestra.create({
      data: { categoria, valor: valor.trim() },
    });

    return NextResponse.json(opcion, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Esa opción ya existe en esta categoría" },
        { status: 409 }
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo crear la opción" },
      { status: 500 }
    );
  }
}
