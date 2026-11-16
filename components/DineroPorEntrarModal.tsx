"use client";

import Link from "next/link";
import { X, HandCoins } from "lucide-react";
import { DIAS_ESPERADOS_FINANCIACION } from "@/lib/financiacion";
import {
  CANAL_INFO,
  INGRESO_DINERO_SUMAS,
  type CanalPorEntrar,
  type DineroPorEntrarDatos,
} from "@/lib/dineroPorEntrar";

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  EN_CAMINO: "En camino",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
  DEVUELTO: "Devuelto",
};

const ESTADO_PILL: Record<string, string> = {
  PENDIENTE: "bg-amberSoft text-amber2",
  CONFIRMADO: "bg-greenSoft text-green",
  EN_CAMINO: "bg-accentSoft text-accent",
  ENTREGADO: "bg-tealSoft text-teal",
  CANCELADO: "bg-borderLight text-muted2",
  DEVUELTO: "bg-redSoft text-red",
};

// Clave de "Ingreso Dinero" de cada canal, para resaltar los que ya llevan
// más tiempo esperando de lo normal (DIAS_ESPERADOS_FINANCIACION).
const INGRESO_DE_CANAL: Partial<Record<CanalPorEntrar, string>> = {
  ADDI: "Addi",
  SISTECREDITO: "Sistecredito",
  SUMAS: INGRESO_DINERO_SUMAS,
};

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });

function diasDesde(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

export default function DineroPorEntrarModal({
  canal,
  datos,
  onClose,
}: {
  canal: CanalPorEntrar | "TOTAL" | null;
  datos: DineroPorEntrarDatos | null;
  onClose: () => void;
}) {
  if (!canal || !datos) return null;

  const esTotal = canal === "TOTAL";
  const pedidos = esTotal
    ? datos.canales
        .flatMap((c) => c.pedidos)
        .sort((a, b) => new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime())
    : datos.canales.find((c) => c.canal === canal)?.pedidos ?? [];
  const resumen = esTotal ? datos.total : datos.canales.find((c) => c.canal === canal);
  const mostrarPagoEsperado = esTotal || canal === "ADDI";
  const hayInferidos = pedidos.some((p) => p.sinIngresoDinero);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-borderLight px-5 py-4 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-greenSoft text-green flex items-center justify-center shrink-0">
              <HandCoins size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink2">
                {esTotal ? "Total por entrar" : `Por entrar: ${CANAL_INFO[canal].label}`}
              </h2>
              <p className="text-xs text-muted2">
                {esTotal
                  ? "Todos los pedidos abiertos con plata que todavía no ha entrado, de todos los canales."
                  : CANAL_INFO[canal].detalle}
              </p>
              {resumen && (
                <p className="text-xs text-ink2 mt-1">
                  {resumen.cantidad} pedido(s) · Bruto {fmtMoney(resumen.bruto)} · Neto estimado{" "}
                  {fmtMoney(resumen.neto)}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted2 hover:bg-paper hover:text-ink2 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 bg-paper">
          {pedidos.length === 0 ? (
            <p className="text-sm text-muted2 text-center">
              No hay plata pendiente por entrar en este canal. 🎉
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm bg-white rounded-lg border border-borderLight">
                <thead>
                  <tr className="text-left text-xs font-semibold text-muted2 uppercase tracking-wide">
                    <th className="px-4 py-2.5">Pedido</th>
                    <th className="px-4 py-2.5">Cliente</th>
                    {esTotal && <th className="px-4 py-2.5">Canal</th>}
                    <th className="px-4 py-2.5">Fecha</th>
                    <th className="px-4 py-2.5">Estado</th>
                    <th className="px-4 py-2.5 text-right">Valor</th>
                    <th className="px-4 py-2.5 text-right">Neto est.</th>
                    {mostrarPagoEsperado && <th className="px-4 py-2.5">Pago esperado</th>}
                    <th className="px-4 py-2.5">Días</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.map((p) => {
                    const dias = diasDesde(p.creadoEn);
                    const ingreso = INGRESO_DE_CANAL[p.canal];
                    const umbral = ingreso ? DIAS_ESPERADOS_FINANCIACION[ingreso] : undefined;
                    const vencido = umbral !== undefined && dias > umbral;
                    return (
                      <tr key={p.id} className="border-t border-borderLight">
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <Link
                            href={`/pedidos/${p.id}/editar`}
                            className="text-accent hover:underline font-medium"
                          >
                            {p.numeroOrden ? `#${p.numeroOrden}` : "Ver pedido"}
                          </Link>
                          {p.sinIngresoDinero && (
                            <span
                              className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amberSoft text-amber2"
                              title={
                                p.pasarela
                                  ? `Método de pago en Shopify: ${p.pasarela}`
                                  : "Pedido sin método de pago en Shopify"
                              }
                            >
                              Sin Ingreso Dinero
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-ink2">{p.cliente || p.telefono}</td>
                        {esTotal && (
                          <td className="px-4 py-2.5 text-muted2 whitespace-nowrap">
                            {CANAL_INFO[p.canal].label}
                          </td>
                        )}
                        <td className="px-4 py-2.5 text-muted2 whitespace-nowrap">
                          {fmtFecha(p.creadoEn)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                              ESTADO_PILL[p.estado] || "bg-borderLight text-muted2"
                            }`}
                          >
                            {ESTADO_LABEL[p.estado] || p.estado}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-ink2 whitespace-nowrap">
                          {fmtMoney(p.valorTotal)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted2 whitespace-nowrap">
                          {fmtMoney(p.neto)}
                        </td>
                        {mostrarPagoEsperado && (
                          <td className="px-4 py-2.5 text-muted2 whitespace-nowrap">
                            {p.pagoEsperado ? fmtFecha(p.pagoEsperado) : "—"}
                          </td>
                        )}
                        <td className="px-4 py-2.5">
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                              vencido ? "bg-redSoft text-red" : "bg-amberSoft text-amber2"
                            }`}
                            title={umbral !== undefined ? `Plazo típico: ${umbral} días` : undefined}
                          >
                            {dias} {dias === 1 ? "día" : "días"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t border-borderLight px-5 py-3 flex items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-muted2">
            {hayInferidos
              ? "\"Sin Ingreso Dinero\": el canal se tomó del método de pago en Shopify. Cuando entre la plata, cambia \"Ingreso Dinero\" y archiva el pedido."
              : "Cuando entre la plata, cambia \"Ingreso Dinero\" en el pedido y archívalo."}
          </p>
          <button
            onClick={onClose}
            className="bg-paper hover:bg-borderLight text-ink2 text-sm font-medium px-4 py-1.5 rounded-md transition-colors shrink-0"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
