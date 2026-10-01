"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, RotateCcw } from "lucide-react";

type DevolucionPendiente = {
  id: string;
  numeroOrden: string | null;
  cliente: string | null;
  telefono: string;
  transportadora: string | null;
  devueltoEn: string | null;
  creadoEn: string;
};

// Pasado este número de días sin que la devolución regrese, se marca en
// rojo para que salte a la vista. Antes de eso, en ámbar.
const DIAS_UMBRAL_CRITICO = 15;

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });

function diasEsperando(devueltoEn: string | null, creadoEn: string): number {
  const referencia = new Date(devueltoEn || creadoEn).getTime();
  return Math.max(0, Math.floor((Date.now() - referencia) / 86400000));
}

export default function DevolucionesPendientesModal({
  abierto,
  onClose,
}: {
  abierto: boolean;
  onClose: () => void;
}) {
  const [pedidos, setPedidos] = useState<DevolucionPendiente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setLoading(true);
    setError(null);
    fetch("/api/dashboard/devoluciones-pendientes")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setPedidos(data.pedidos))
      .catch(() => setError("No se pudieron cargar las devoluciones pendientes."))
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
            <div className="w-9 h-9 rounded-lg bg-amberSoft text-amber2 flex items-center justify-center">
              <RotateCcw size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink2">Devoluciones pendientes por llegar</h2>
              <p className="text-xs text-muted2">
                No depende del mes seleccionado en el Dashboard
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
              No hay devoluciones pendientes por llegar. 🎉
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm bg-white rounded-lg border border-borderLight">
                <thead>
                  <tr className="text-left text-xs font-semibold text-muted2 uppercase tracking-wide">
                    <th className="px-4 py-2.5">Pedido</th>
                    <th className="px-4 py-2.5">Cliente</th>
                    <th className="px-4 py-2.5">Transportadora</th>
                    <th className="px-4 py-2.5">Devuelto desde</th>
                    <th className="px-4 py-2.5">Días esperando</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.map((p) => {
                    const dias = diasEsperando(p.devueltoEn, p.creadoEn);
                    const critico = dias >= DIAS_UMBRAL_CRITICO;
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
                        <td className="px-4 py-2.5 text-ink2">{p.transportadora || "—"}</td>
                        <td className="px-4 py-2.5 text-muted2">
                          {p.devueltoEn ? fmtFecha(p.devueltoEn) : "No registrada"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                              critico ? "bg-redSoft text-red" : "bg-amberSoft text-amber2"
                            }`}
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
            Entra al pedido para marcar la fecha en que llegó.
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
