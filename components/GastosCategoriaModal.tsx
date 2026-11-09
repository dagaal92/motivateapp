"use client";

import { useEffect, useState } from "react";
import { X, Receipt } from "lucide-react";

type MovimientoGasto = {
  id: string;
  monto: number;
  descripcion: string | null;
  fecha: string;
  cuenta: { nombre: string };
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function GastosCategoriaModal({
  categoria,
  anio,
  mes,
  onClose,
}: {
  categoria: string | null;
  anio: number;
  mes: number | null;
  onClose: () => void;
}) {
  const [movimientos, setMovimientos] = useState<MovimientoGasto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!categoria) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ anio: String(anio), categoria });
    if (mes) params.set("mes", String(mes));
    fetch(`/api/dashboard/gastos/detalle?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setMovimientos(data.movimientos))
      .catch(() => setError("No se pudo cargar el detalle de gastos."))
      .finally(() => setLoading(false));
  }, [categoria, anio, mes]);

  if (!categoria) return null;

  const total = movimientos.reduce((sum, m) => sum + m.monto, 0);

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
            <div className="w-9 h-9 rounded-lg bg-orangeSoft text-orange flex items-center justify-center">
              <Receipt size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink2">{categoria}</h2>
              <p className="text-xs text-muted2">
                {loading ? "Cargando…" : `${movimientos.length} movimiento(s) · ${fmt(total)} en total`}
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
          ) : movimientos.length === 0 ? (
            <p className="text-sm text-muted2 text-center">
              No hay movimientos en esta categoría para el periodo seleccionado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm bg-white rounded-lg border border-borderLight">
                <thead>
                  <tr className="text-left text-xs font-semibold text-muted2 uppercase tracking-wide">
                    <th className="px-4 py-2.5">Fecha</th>
                    <th className="px-4 py-2.5">Bolsillo</th>
                    <th className="px-4 py-2.5">Descripción</th>
                    <th className="px-4 py-2.5 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((m) => (
                    <tr key={m.id} className="border-t border-borderLight">
                      <td className="px-4 py-2.5 text-muted2">{fmtFecha(m.fecha)}</td>
                      <td className="px-4 py-2.5 text-ink2">{m.cuenta.nombre}</td>
                      <td className="px-4 py-2.5 text-muted2">{m.descripcion || "—"}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-ink2">
                        {fmt(m.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t border-borderLight px-5 py-3 flex items-center justify-end shrink-0">
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
