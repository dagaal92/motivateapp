import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ORDENABLES = ["nombre", "telefono", "ciudad", "departamento", "compras"] as const;
type Ordenable = (typeof ORDENABLES)[number];

export async function GET(req: NextRequest) {
  try {
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
    const pageSize = Math.max(1, Number(req.nextUrl.searchParams.get("pageSize")) || 25);
    const sortByParam = req.nextUrl.searchParams.get("sortBy") || "nombre";
    const sortBy: Ordenable = (ORDENABLES as readonly string[]).includes(sortByParam)
      ? (sortByParam as Ordenable)
      : "nombre";
    const order = req.nextUrl.searchParams.get("order") === "desc" ? "desc" : "asc";

    const [clientes, conteos] = await Promise.all([
      prisma.cliente.findMany(),
      prisma.pedido.groupBy({ by: ["telefono"], _count: true }),
    ]);

    const mapaConteo = new Map(conteos.map((c) => [c.telefono, c._count]));
    const conCompras = clientes.map((c) => ({
      ...c,
      compras: mapaConteo.get(c.telefono) || 0,
    }));

    // Resumen sobre el dataset completo, no sobre la página actual
    const totalClientes = conCompras.length;
    const clientesConCompra = conCompras.filter((c) => c.compras >= 1).length;
    const clientesRecompra = conCompras.filter((c) => c.compras >= 2).length;
    const recompraPct =
      clientesConCompra > 0 ? (clientesRecompra / clientesConCompra) * 100 : 0;

    conCompras.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "compras") {
        cmp = a.compras - b.compras;
      } else {
        const va = (a[sortBy] || "").toString().toLowerCase();
        const vb = (b[sortBy] || "").toString().toLowerCase();
        cmp = va.localeCompare(vb, "es");
      }
      return order === "desc" ? -cmp : cmp;
    });

    const total = conCompras.length;
    const inicio = (page - 1) * pageSize;
    const data = conCompras.slice(inicio, inicio + pageSize);

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      resumen: {
        totalClientes,
        clientesConCompra,
        clientesRecompra,
        recompraPct,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudieron cargar los clientes" },
      { status: 500 }
    );
  }
}
