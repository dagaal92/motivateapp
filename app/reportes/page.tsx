"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DollarSign, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

type Fila = {
  categoria: string;
  tipo: "INGRESO" | "EGRESO";
  presupuesto: number;
  real: number;
};

type Reporte = {
  anio: number;
  mes: number;
  gastos: Fila[];
  ingresos: Fila[];
  sinCategorizar: number;
};

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

const inputCls =
  "w-full bg-white border border-borderLight rounded-md px-3 py-2 text-sm text-ink2 placeholder:text-muted2 focus:outline-none focus:ring-1 focus:ring-accent";

export default function ReportesPage() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [presupuestos, setPresupuestos] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/presupuestos?anio=${anio}&mes=${mes}`);
      if (!res.ok) throw new Error();
      const data: Reporte = await res.json();
      setReporte(data);
      const inputs: Record<string, string> = {};
      [...data.gastos, ...data.ingresos].forEach((f) => {
        inputs[`${f.tipo}-${f.categoria}`] = f.presupuesto ? String(f.presupuesto) : "";
      });
      setPresupuestos(inputs);
      setError(null);
    } catch {
      setError("No se pudo cargar el reporte.");
    } finally {
      setLoading(false);
    }
  }, [anio, mes]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarMes = (delta: number) => {
    let m = mes + delta;
    let a = anio;
    if (m < 1) {
      m = 12;
      a -= 1;
    }
    if (m > 12) {
      m = 1;
      a += 1;
    }
    setMes(m);
    setAnio(a);
  };

  const guardarPresupuesto = async (categoria: string, tipo: "INGRESO" | "EGRESO") => {
    const key = `${tipo}-${categoria}`;
    const monto = Number(presupuestos[key] || 0);
    setGuardando(key);
    try {
      const res = await fetch("/api/presupuestos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoria, tipo, anio, mes, monto }),
      });
      if (!res.ok) throw new Error();
    } catch {
      alert("No se pudo guardar el presupuesto");
    } finally {
      setGuardando(null);
    }
  };

  const renderFila = (f: Fila) => {
    const key = `${f.tipo}-${f.categoria}`;
    const presupuestoNum = Number(presupuestos[key] || 0);
    const pct =
      presupuestoNum > 0
        ? Math.min(100, Math.round((Math.max(f.real, 0) / presupuestoNum) * 100))
        : 0;
    const sobre = presupuestoNum > 0 && f.real > presupuestoNum;

    return (
      <tr key={key} className="border-t border-borderLight">
        <td className="px-5 py-3 text-ink2">{f.categoria}</td>
        <td className="px-5 py-3">
          <input
            type="number"
            min="0"
            value={presupuestos[key] ?? ""}
            disabled={guardando === key}
            onChange={(e) =>
              setPresupuestos((p) => ({ ...p, [key]: e.target.value }))
            }
            onBlur={() => guardarPresupuesto(f.categoria, f.tipo)}
            className={`${inputCls} w-32 disabled:opacity-50`}
            placeholder="0"
          />
        </td>
        <td className={`px-5 py-3 text-right font-medium ${sobre ? "text-red" : "text-ink2"}`}>
          {fmt(f.real)}
        </td>
        <td className="px-5 py-3 text-right text-muted2">
          {presupuestoNum > 0 ? fmt(presupuestoNum - f.real) : "—"}
        </td>
        <td className="px-5 py-3 w-40">
          {presupuestoNum > 0 && (
            <div className="w-full h-2 rounded-full bg-paper overflow-hidden">
              <div
                className={`h-full ${sobre ? "bg-red" : "bg-green"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </td>
      </tr>
    );
  };

  return (
    <main className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="bg-card border border-borderLight rounded-xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accentSoft text-accent flex items-center justify-center">
              <DollarSign size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-ink2">Reportes</h1>
              <p className="text-sm text-muted2">
                Presupuesto vs. real por categoría, mes a mes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => cambiarMes(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-paper text-ink2"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-ink2 w-36 text-center">
              {MESES[mes - 1]} {anio}
            </span>
            <button
              onClick={() => cambiarMes(1)}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-paper text-ink2"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-redSoft text-red text-sm p-4 rounded-md">{error}</div>
      )}

      {reporte && reporte.sinCategorizar > 0 && (
        <Link
          href="/balance"
          className="flex items-center gap-2 bg-amberSoft text-amber2 text-sm font-medium px-4 py-3 rounded-md hover:bg-amberSoft/80 transition-colors"
        >
          <AlertTriangle size={16} />
          {reporte.sinCategorizar} movimiento{reporte.sinCategorizar === 1 ? "" : "s"} sin
          categorizar este mes — ir a Balance
        </Link>
      )}

      {loading ? (
        <p className="text-sm text-muted2">Cargando reporte…</p>
      ) : (
        reporte && (
          <>
            <Seccion titulo="Gastos" filas={reporte.gastos} render={renderFila} />
            <Seccion titulo="Ingresos" filas={reporte.ingresos} render={renderFila} />
          </>
        )
      )}
    </main>
  );
}

function Seccion({
  titulo,
  filas,
  render,
}: {
  titulo: string;
  filas: Fila[];
  render: (f: Fila) => React.ReactNode;
}) {
  if (filas.length === 0) return null;
  const totalReal = filas.reduce((s, f) => s + f.real, 0);
  return (
    <div className="bg-card border border-borderLight rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-borderLight flex items-center justify-between">
        <p className="text-sm font-semibold text-ink2">{titulo}</p>
        <p className="text-sm font-semibold text-ink2">{fmt(totalReal)}</p>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-paper text-left text-xs font-semibold text-muted2 uppercase tracking-wide">
            <th className="px-5 py-3">Categoría</th>
            <th className="px-5 py-3">Presupuesto</th>
            <th className="px-5 py-3 text-right">Real</th>
            <th className="px-5 py-3 text-right">Diferencia</th>
            <th className="px-5 py-3">Uso</th>
          </tr>
        </thead>
        <tbody>{filas.map(render)}</tbody>
      </table>
      </div>
    </div>
  );
}
