import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const pdfMake = require("pdfmake");

pdfMake.setFonts({
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
});
pdfMake.setUrlAccessPolicy(() => false);
pdfMake.setLocalAccessPolicy(() => false);

const LABEL_WIDTH = 189; // 5cm en puntos (1cm = 37.8pt)
const LABEL_HEIGHT = 94.5; // 2.5cm en puntos
const MAX_PRODUCTOS_POR_ETIQUETA = 5;

export async function POST(req: NextRequest) {
  try {
    const { pedidoIds } = await req.json();
    if (!Array.isArray(pedidoIds) || pedidoIds.length === 0) {
      return NextResponse.json(
        { error: "Selecciona al menos un pedido" },
        { status: 400 }
      );
    }

    const pedidos = await prisma.pedido.findMany({
      where: { id: { in: pedidoIds } },
      include: { productos: true },
    });
    const pedidosOrdenados = pedidoIds
      .map((id: string) => pedidos.find((p) => p.id === id))
      .filter((p): p is (typeof pedidos)[number] => Boolean(p));

    const content: any[] = [];

    for (const pedido of pedidosOrdenados) {
      const productos = pedido.productos;
      const lotes: (typeof productos)[] = [];
      for (let i = 0; i < productos.length; i += MAX_PRODUCTOS_POR_ETIQUETA) {
        lotes.push(productos.slice(i, i + MAX_PRODUCTOS_POR_ETIQUETA));
      }
      if (lotes.length === 0) lotes.push([]);

      lotes.forEach((lote, indice) => {
        if (content.length > 0) {
          content.push({ text: "", pageBreak: "before" });
        }
        content.push({
          stack: [
            {
              text: `PEDIDO #${pedido.numeroOrden || pedido.id}${
                lotes.length > 1 ? ` (${indice + 1}/${lotes.length})` : ""
              }`,
              fontSize: 11,
              bold: true,
              alignment: "center",
              margin: [0, 0, 0, 3],
            },
            {
              table: {
                widths: ["*"],
                body:
                  lote.length > 0
                    ? lote.map((p) => [
                        {
                          text: [
                            { text: `${p.cantidad}x `, bold: true, fontSize: 9 },
                            { text: p.referencia || "Producto", fontSize: 8 },
                            p.color
                              ? { text: ` (${p.color})`, fontSize: 7, italics: true }
                              : {},
                          ],
                        },
                      ])
                    : [[{ text: "Sin productos", fontSize: 8, italics: true }]],
              },
              layout: "noBorders",
            },
          ],
          border: [true, true, true, true],
          margin: [2, 2, 2, 2],
        });
      });
    }

    const docDefinition = {
      pageSize: { width: LABEL_WIDTH + 20, height: LABEL_HEIGHT + 20 },
      pageMargins: [8, 8, 8, 8] as [number, number, number, number],
      content,
      defaultStyle: { fontSize: 9, font: "Helvetica" },
    };

    const buffer: Buffer = await pdfMake.createPdf(docDefinition).getBuffer();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=etiquetas-pedidos.pdf",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo generar el PDF de etiquetas" },
      { status: 500 }
    );
  }
}
