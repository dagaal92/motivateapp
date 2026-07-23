"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Package,
  CheckCircle2,
  Printer,
  Eye,
} from "lucide-react";
import DetallePedidoModal, { type PedidoDetalle } from "@/components/DetallePedidoModal";

type Pedido = PedidoDetalle & {
  completadoEn: string | null;
  impreso: boolean;
  actualizadoEn: string;
};

const fmtFechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const hoyISO = () => new Date().toISOString().split("T")[0];

export default function PreparacionPage() {
  const [pendientes, setPendientes] = useState<Pedido[]>([]);
  const [preparadosHoy, setPreparadosHoy] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [revisados, setRevisados] = useState<Record<string, boolean>>({});
  const [enCurso, setEnCurso] = useState<Record<string, boolean>>({});
  const [imprimiendo, setImprimiendo] = useState(false);
  const [detalle, setDetalle] = useState<PedidoDetalle | null>(null);

  const storageKey = `preparacion_revisado_${hoyISO()}`;

  useEffect(() => {
    const guardado = localStorage.getItem(storageKey);
    setRevisados(guardado ? JSON.parse(guardado) : {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/preparacion");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPendientes(data.pendientes);
      setPreparadosHoy(data.preparadosHoy);
      setError(null);
    } catch {
      setError("No se pudo cargar la preparación de pedidos. Revisa tu conexión a la base de datos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const toggleRevisado = (id: string) => {
    setRevisados((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const marcarPreparado = async (id: string) => {
    setEnCurso((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/pedidos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completadoEn: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error();
      await cargar();
    } catch {
      alert("No se pudo marcar el pedido como preparado");
    } finally {
      setEnCurso((prev) => ({ ...prev, [id]: false }));
    }
  };

  const toggleImpreso = async (id: string, actual: boolean) => {
    setPendientes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, impreso: !actual } : p))
    );
    try {
      const res = await fetch(`/api/pedidos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ impreso: !actual }),
      });
      if (!res.ok) throw new Error();
    } catch {
      alert("No se pudo actualizar el estado de impresión");
      cargar();
    }
  };

  const imprimirEtiquetas = async () => {
    if (seleccionados.size === 0) return;
    setImprimiendo(true);
    try {
      const ids = Array.from(seleccionados);
      const res = await fetch("/api/preparacion/etiquetas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoIds: ids }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "etiquetas-pedidos.pdf";
      a.click();
      URL.revokeObjectURL(url);

      const pendientesDeImprimir = pendientes.filter(
        (p) => ids.includes(p.id) && !p.impreso
      );
      await Promise.all(
        pendientesDeImprimir.map((p) =>
          fetch(`/api/pedidos/${p.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ impreso: true }),
          })
        )
      );
      setSeleccionados(new Set());
      await cargar();
    } catch {
      alert("No se pudieron generar las etiquetas");
    } finally {
      setImprimiendo(false);
    }
  };

  const prioridadCls = useMemo(
    () => "text-xs font-medium px-2 py-0.5 rounded-full bg-accentSoft text-accent",
    []
  );

  return (
    <main className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="bg-card border border-borderLight rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-greenSoft text-green flex items-center justify-center">
            <ClipboardList size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink2">Preparación de Pedidos</h1>
            <p className="text-sm text-muted2">
              Gestiona los pedidos confirmados listos para preparar
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <div className="bg-orangeSoft/60 border border-orange/20 rounded-lg p-3 flex items-center gap-3">
            <Package className="text-orange" size={18} />
            <div>
              <p className="text-xs font-medium text-orange">Pendientes de preparar</p>
              <p className="text-xl font-semibold text-ink2">{pendientes.length}</p>
            </div>
          </div>
          <div className="bg-greenSoft/60 border border-green/20 rounded-lg p-3 flex items-center gap-3">
            <CheckCircle2 className="text-green" size={18} />
            <div>
              <p className="text-xs font-medium text-green">Preparados hoy</p>
              <p className="text-xl font-semibold text-ink2">{preparadosHoy}</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-redSoft text-red text-sm p-4 rounded-md">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-muted2">Cargando…</p>
      ) : (
        <div className="bg-card border border-borderLight rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-borderLight bg-greenSoft/40 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-semibold text-ink2">
                Pedidos por preparar ({pendientes.length})
              </p>
              <p className="text-xs text-muted2 mt-0.5">
                Selecciona los pedidos que han sido preparados para envío
              </p>
            </div>
            {seleccionados.size > 0 && (
              <button
                onClick={imprimirEtiquetas}
                disabled={imprimiendo}
                className="flex items-center gap-2 bg-accent text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                <Printer size={15} />
                {imprimiendo
                  ? "Generando…"
                  : `Imprimir Etiquetas (${seleccionados.size})`}
              </button>
            )}
          </div>

          {pendientes.length === 0 ? (
            <div className="p-10 text-center">
              <CheckCircle2 className="mx-auto text-green mb-2" size={36} />
              <p className="text-ink2 font-medium">¡Excelente trabajo!</p>
              <p className="text-muted2 text-sm mt-1">
                No hay pedidos pendientes de preparación.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-paper text-left text-xs font-semibold text-muted2 uppercase tracking-wide">
                    <th className="px-5 py-3 text-center">Imprimir</th>
                    <th className="px-5 py-3">Orden</th>
                    <th className="px-5 py-3">Cliente</th>
                    <th className="px-5 py-3">Fecha</th>
                    <th className="px-5 py-3 text-center">Detalle</th>
                    <th className="px-5 py-3 text-center">Revisado</th>
                    <th className="px-5 py-3 text-center">Preparado</th>
                    <th className="px-5 py-3 text-center">Impreso</th>
                  </tr>
                </thead>
                <tbody>
                  {pendientes.map((p) => (
                    <tr key={p.id} className="border-t border-borderLight hover:bg-paper/60 transition-colors">
                      <td className="px-5 py-3 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-accent rounded focus:ring-1 focus:ring-accent cursor-pointer"
                          checked={seleccionados.has(p.id)}
                          onChange={() => toggleSeleccion(p.id)}
                        />
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-ink2">
                          {p.numeroOrden ? `# ${p.numeroOrden}` : "—"}
                        </p>
                        {p.prioridad && (
                          <span className={`${prioridadCls} inline-block mt-1`}>
                            {p.prioridad}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-ink2">{p.cliente || "Sin especificar"}</p>
                        <p className="text-xs text-muted2">{p.telefono}</p>
                      </td>
                      <td className="px-5 py-3 text-muted2">{fmtFechaHora(p.actualizadoEn)}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-center">
                          <button
                            onClick={() => setDetalle(p)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-borderLight rounded-md text-ink2 hover:bg-paper transition-colors text-xs font-medium"
                          >
                            <Eye size={13} /> Ver
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-accent rounded focus:ring-1 focus:ring-accent cursor-pointer"
                          checked={!!revisados[p.id]}
                          onChange={() => toggleRevisado(p.id)}
                        />
                      </td>
                      <td className="px-5 py-3 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-green rounded focus:ring-1 focus:ring-green cursor-pointer disabled:opacity-50"
                          disabled={enCurso[p.id]}
                          checked={false}
                          onChange={() => marcarPreparado(p.id)}
                          title="Marcar como preparado"
                        />
                      </td>
                      <td className="px-5 py-3 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-purple rounded focus:ring-1 focus:ring-purple cursor-pointer"
                          checked={p.impreso}
                          onChange={() => toggleImpreso(p.id, p.impreso)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <DetallePedidoModal pedido={detalle} onClose={() => setDetalle(null)} />
    </main>
  );
}
