"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Landmark } from "lucide-react";
import { DIAS_ESPERADOS_FINANCIACION } from "@/lib/financiacion";

type PedidoPorCobrar = {
  id: string;
  numeroOrden: string | null;
  cliente: string | null;
  telefono: string;
  ingresoDinero: string | null;
  valorTotal: number;
  creadoEn: string;
};

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

function diasDesdePedido(creadoEn: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(creadoEn).getTime()) / 86400000));
}

export default function PorCobrarFinanciacionModal({
  abierto,
  onClose,
}: {
  abierto: boolean;
  onClose: () => void;
}) {
  const [pedidos, setPedidos] = useState<PedidoPorCobrar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setLoading(true);
    setError(null);
    fetch("/api/dashboard/por-cobrar-financiacion")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setPedidos(data.pedidos))
      .catch(() => setError("No se pudieron cargar los pedidos por cobrar."))
      .finally(() => setLoading(false));
  }, [abierto]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-borderLight px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purpleSoft text-purple flex items-center justify-center">
              <Landmark size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink2">Por cobrar (financiación)</h2>
              <p className="text-xs text-muted2">
                Plata financiada con Addi/Sistecrédito que todavía no ha ingresado
              </p>
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
          {loading ? (
            <p className="text-sm text-muted2 text-center">Cargando…</p>
          ) : error ? (
            <p className="text-sm text-red text-center">{error}</p>
          ) : pedidos.length === 0 ? (
            <p className="text-sm text-muted2 text-center">
              No hay pedidos pendientes de cobro por financiación. 🎉
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm bg-white rounded-lg border border-borderLight">
                <thead>
                  <tr className="text-left text-xs font-semibold text-muted2 uppercase tracking-wide">
                    <th className="px-4 py-2.5">Pedido</th>
                    <th className="px-4 py-2.5">Cliente</th>
                    <th className="px-4 py-2.5">Proveedor</th>
                    <th className="px-4 py-2.5 text-right">Valor</th>
                    <th className="px-4 py-2.5">Días desde el pedido</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.map((p) => {
                    const dias = diasDesdePedido(p.creadoEn);
                    const umbral = p.ingresoDinero
                      ? DIAS_ESPERADOS_FINANCIACION[p.ingresoDinero]
                      : undefined;
                    const vencido = umbral !== undefined && dias > umbral;
                    return (
                      <tr key={p.id} className="border-t border-borderLight">
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/pedidos/${p.id}/editar`}
                            className="text-accent hover:underline font-medium"
                          >
                            {p.numeroOrden ? `#${p.numeroOrden}` : "Ver pedido"}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-ink2">{p.cliente || p.telefono}</td>
                        <td className="px-4 py-2.5 text-muted2">{p.ingresoDinero || "—"}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-ink2">
                          {fmtMoney(p.valorTotal)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                              vencido ? "bg-redSoft text-red" : "bg-amberSoft text-amber2"
                            }`}
                            title={
                              umbral !== undefined
                                ? `Plazo típico: ${umbral} días`
                                : undefined
                            }
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

        <div className="border-t border-borderLight px-5 py-3 flex items-center justify-between shrink-0">
          <p className="text-xs text-muted2">
            Entra al pedido y cambia &quot;Ingreso Dinero&quot; cuando se confirme el pago.
          </p>
          <button
            onClick={onClose}
            className="bg-paper hover:bg-borderLight text-ink2 text-sm font-medium px-4 py-1.5 rounded-md transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
