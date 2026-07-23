"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import {
  Users,
  Pencil,
  Trash2,
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Sparkles,
} from "lucide-react";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 25;

type Cliente = {
  id: string;
  telefono: string;
  nombre: string | null;
  email: string | null;
  ciudad: string | null;
  departamento: string | null;
  compras: number;
};

type Pedido = {
  id: string;
  numeroOrden: string | null;
  telefono: string;
  valorTotal: number;
  estado: string;
  creadoEn: string;
};

const inputCls =
  "w-full bg-white border border-borderLight rounded-md px-3 py-2 text-sm text-ink2 placeholder:text-muted2 focus:outline-none focus:ring-1 focus:ring-accent";
const labelCls = "text-xs font-medium text-muted2 mb-1 block";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  EN_CAMINO: "En camino",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
  DEVUELTO: "Devuelto",
};

type Resumen = {
  totalClientes: number;
  clientesConCompra: number;
  clientesRecompra: number;
  recompraPct: number;
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [sortBy, setSortBy] = useState<"nombre" | "compras">("nombre");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [pedidosPorTelefono, setPedidosPorTelefono] = useState<Record<string, Pedido[]>>({});
  const [cargandoPedidos, setCargandoPedidos] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [formEdicion, setFormEdicion] = useState({ nombre: "", email: "", ciudad: "", departamento: "" });
  const [guardando, setGuardando] = useState(false);
  const [normalizando, setNormalizando] = useState(false);
  const [mensajeNormalizar, setMensajeNormalizar] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagina),
        pageSize: String(PAGE_SIZE),
        sortBy,
        order,
      });
      const res = await fetch(`/api/clientes?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setClientes(data.data);
      setTotal(data.total);
      setResumen(data.resumen);
      setError(null);
    } catch {
      setError("No se pudieron cargar los clientes.");
    } finally {
      setLoading(false);
    }
  }, [pagina, sortBy, order]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const ordenarPor = (campo: "nombre" | "compras") => {
    if (sortBy === campo) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(campo);
      setOrder(campo === "compras" ? "desc" : "asc");
    }
    setPagina(1);
  };

  const iconoOrden = (campo: "nombre" | "compras") => {
    if (sortBy !== campo) return <ArrowUpDown size={12} className="text-muted2" />;
    return order === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  const toggleExpandir = async (cliente: Cliente) => {
    if (expandido === cliente.id) {
      setExpandido(null);
      return;
    }
    setExpandido(cliente.id);
    if (!pedidosPorTelefono[cliente.telefono]) {
      setCargandoPedidos(cliente.id);
      try {
        const res = await fetch(`/api/pedidos?telefono=${encodeURIComponent(cliente.telefono)}`);
        if (res.ok) {
          const data: Pedido[] = await res.json();
          setPedidosPorTelefono((prev) => ({ ...prev, [cliente.telefono]: data }));
        }
      } finally {
        setCargandoPedidos(null);
      }
    }
  };

  const iniciarEdicion = (cliente: Cliente) => {
    setEditando(cliente.id);
    setFormEdicion({
      nombre: cliente.nombre || "",
      email: cliente.email || "",
      ciudad: cliente.ciudad || "",
      departamento: cliente.departamento || "",
    });
  };

  const guardarEdicion = async (id: string) => {
    setGuardando(true);
    try {
      const res = await fetch(`/api/clientes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formEdicion),
      });
      if (!res.ok) throw new Error();
      setEditando(null);
      await cargar();
    } catch {
      alert("No se pudo actualizar el cliente");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarCliente = async (cliente: Cliente) => {
    if (!confirm(`¿Eliminar la ficha de ${cliente.nombre || cliente.telefono}?`)) return;
    try {
      const res = await fetch(`/api/clientes/${cliente.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar");
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo eliminar el cliente");
    }
  };

  const normalizarDatos = async () => {
    if (
      !confirm(
        "Esto va a quitar el +57, espacios y caracteres especiales de todos los teléfonos y nombres ya guardados (clientes y pedidos), y a fusionar fichas de cliente duplicadas por el mismo número. ¿Continuar?"
      )
    )
      return;
    setNormalizando(true);
    setMensajeNormalizar(null);
    try {
      const res = await fetch("/api/clientes/normalizar", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al normalizar");
      setMensajeNormalizar(
        `Listo: ${data.pedidosActualizados} pedidos y ${data.clientesActualizados} clientes actualizados, ${data.duplicadosFusionados} fichas duplicadas fusionadas.`
      );
      await cargar();
    } catch (err) {
      setMensajeNormalizar(
        err instanceof Error ? err.message : "No se pudo normalizar la información"
      );
    } finally {
      setNormalizando(false);
    }
  };

  return (
    <main className="p-4 sm:p-6 max-w-[1200px] mx-auto space-y-5">
      <div className="bg-card border border-borderLight rounded-xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accentSoft text-accent flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-ink2">Clientes</h1>
              <p className="text-sm text-muted2">
                Se crean solos a partir de tus pedidos, buscados por número de celular
              </p>
            </div>
          </div>
          <button
            onClick={normalizarDatos}
            disabled={normalizando}
            className="flex items-center gap-2 border border-borderLight text-ink2 text-sm font-medium px-4 py-2 rounded-md hover:bg-paper transition-colors disabled:opacity-50"
          >
            <Sparkles size={15} />
            {normalizando ? "Normalizando…" : "Normalizar teléfonos y nombres"}
          </button>
        </div>

        {mensajeNormalizar && (
          <p className="text-sm text-muted2 mt-3">{mensajeNormalizar}</p>
        )}

        {resumen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="bg-accentSoft/60 border border-accent/20 rounded-lg p-3">
              <p className="text-xs font-medium text-accent">Total clientes</p>
              <p className="text-lg font-semibold text-ink2 mt-0.5">
                {resumen.totalClientes.toLocaleString("es-CO")}
              </p>
            </div>
            <div className="bg-greenSoft/60 border border-green/20 rounded-lg p-3">
              <p className="text-xs font-medium text-green">Clientes con al menos 1 compra</p>
              <p className="text-lg font-semibold text-ink2 mt-0.5">
                {resumen.clientesConCompra.toLocaleString("es-CO")}
              </p>
            </div>
            <div className="bg-amberSoft/60 border border-amber2/20 rounded-lg p-3">
              <p className="text-xs font-medium text-amber2">
                % de recompra <span className="text-amber2/70">(2+ compras)</span>
              </p>
              <p className="text-lg font-semibold text-ink2 mt-0.5">
                {resumen.recompraPct.toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-redSoft text-red text-sm p-4 rounded-md">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-muted2">Cargando clientes…</p>
      ) : (
        <div className="bg-card border border-borderLight rounded-xl overflow-hidden">
          {clientes.length === 0 ? (
            <p className="text-sm text-muted2 p-5">Aún no hay clientes.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-paper text-left text-xs font-semibold text-muted2 uppercase tracking-wide">
                  <th className="px-5 py-3">
                    <button
                      onClick={() => ordenarPor("nombre")}
                      className="flex items-center gap-1 hover:text-ink2 transition-colors"
                    >
                      Cliente {iconoOrden("nombre")}
                    </button>
                  </th>
                  <th className="px-5 py-3">Contacto</th>
                  <th className="px-5 py-3">Ubicación</th>
                  <th className="px-5 py-3">
                    <button
                      onClick={() => ordenarPor("compras")}
                      className="flex items-center gap-1 hover:text-ink2 transition-colors"
                    >
                      Compras {iconoOrden("compras")}
                    </button>
                  </th>
                  <th className="px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <Fragment key={c.id}>
                    <tr className="border-t border-borderLight align-top">
                      <td className="px-5 py-3 text-ink2">{c.nombre || "Sin nombre"}</td>
                      <td className="px-5 py-3">
                        <p className="text-accent">{c.telefono}</p>
                        {c.email && <p className="text-xs text-muted2">{c.email}</p>}
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-ink2">{c.ciudad || "—"}</p>
                        {c.departamento && <p className="text-xs text-muted2">{c.departamento}</p>}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-ink2">{c.compras}</span>
                          <button
                            onClick={() => toggleExpandir(c)}
                            className="w-6 h-6 flex items-center justify-center rounded-md bg-accentSoft text-accent hover:bg-accent hover:text-white transition-colors"
                            title={expandido === c.id ? "Ocultar pedidos" : "Ver pedidos"}
                          >
                            {expandido === c.id ? <Minus size={13} /> : <Plus size={13} />}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => iniciarEdicion(c)}
                            className="text-accent hover:text-accent/70"
                            title="Editar"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => eliminarCliente(c)}
                            className="text-red hover:text-red/70"
                            title="Eliminar"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {editando === c.id && (
                      <tr key={`${c.id}-editar`} className="bg-paper border-t border-borderLight">
                        <td colSpan={5} className="px-5 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                              <label className={labelCls}>Nombre</label>
                              <input
                                value={formEdicion.nombre}
                                onChange={(e) =>
                                  setFormEdicion((f) => ({ ...f, nombre: e.target.value }))
                                }
                                className={inputCls}
                              />
                            </div>
                            <div>
                              <label className={labelCls}>Email</label>
                              <input
                                value={formEdicion.email}
                                onChange={(e) =>
                                  setFormEdicion((f) => ({ ...f, email: e.target.value }))
                                }
                                className={inputCls}
                              />
                            </div>
                            <div>
                              <label className={labelCls}>Ciudad</label>
                              <input
                                value={formEdicion.ciudad}
                                onChange={(e) =>
                                  setFormEdicion((f) => ({ ...f, ciudad: e.target.value }))
                                }
                                className={inputCls}
                              />
                            </div>
                            <div>
                              <label className={labelCls}>Departamento</label>
                              <input
                                value={formEdicion.departamento}
                                onChange={(e) =>
                                  setFormEdicion((f) => ({ ...f, departamento: e.target.value }))
                                }
                                className={inputCls}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() => guardarEdicion(c.id)}
                              disabled={guardando}
                              className="bg-accent text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50"
                            >
                              {guardando ? "Guardando…" : "Guardar"}
                            </button>
                            <button
                              onClick={() => setEditando(null)}
                              className="border border-borderLight text-ink2 text-sm font-medium px-4 py-2 rounded-md hover:bg-white transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {expandido === c.id && (
                      <tr key={`${c.id}-pedidos`} className="bg-paper border-t border-borderLight">
                        <td colSpan={5} className="px-5 py-4">
                          {cargandoPedidos === c.id ? (
                            <p className="text-sm text-muted2">Cargando pedidos…</p>
                          ) : (pedidosPorTelefono[c.telefono] || []).length === 0 ? (
                            <p className="text-sm text-muted2">Este cliente no tiene pedidos.</p>
                          ) : (
                            <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-xs font-semibold text-muted2 uppercase tracking-wide">
                                  <th className="pb-2">Orden</th>
                                  <th className="pb-2">Fecha</th>
                                  <th className="pb-2">Estado</th>
                                  <th className="pb-2 text-right">Valor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(pedidosPorTelefono[c.telefono] || []).map((p) => (
                                  <tr key={p.id} className="border-t border-borderLight">
                                    <td className="py-2 text-ink2">
                                      {p.numeroOrden ? `#${p.numeroOrden}` : "—"}
                                    </td>
                                    <td className="py-2 text-muted2">{fmtFecha(p.creadoEn)}</td>
                                    <td className="py-2 text-muted2">
                                      {ESTADO_LABEL[p.estado] || p.estado}
                                    </td>
                                    <td className="py-2 text-right font-medium text-ink2">
                                      {fmt(p.valorTotal)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            </div>
          )}
          <Pagination
            page={pagina}
            totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
            total={total}
            onChange={setPagina}
          />
        </div>
      )}
    </main>
  );
}
