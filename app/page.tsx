"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Pagination from "@/components/Pagination";
import {
  ShoppingCart,
  Upload,
  RefreshCw,
  Plus,
  Filter,
  Search,
  Download,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type EstadoPedido =
  | "PENDIENTE"
  | "CONFIRMADO"
  | "EN_CAMINO"
  | "ENTREGADO"
  | "CANCELADO";

type Pedido = {
  id: string;
  numeroOrden: string | null;
  cliente: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  producto: string;
  cantidad: number;
  valorTotal: number;
  general: string | null;
  envio: string | null;
  estado: EstadoPedido;
  origen: string;
  creadoEn: string;
};

const PAGE_SIZE = 25;

const ESTADOS: EstadoPedido[] = [
  "PENDIENTE",
  "CONFIRMADO",
  "EN_CAMINO",
  "ENTREGADO",
  "CANCELADO",
];

const ESTADO_LABEL: Record<EstadoPedido, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  EN_CAMINO: "En camino",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

const ESTADO_PILL: Record<EstadoPedido, string> = {
  PENDIENTE: "bg-accentSoft text-accent",
  CONFIRMADO: "bg-accentSoft text-accent",
  EN_CAMINO: "bg-amberSoft text-amber2",
  ENTREGADO: "bg-greenSoft text-green",
  CANCELADO: "bg-redSoft text-red",
};

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

export default function Home() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [mensajeSync, setMensajeSync] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  const [filtros, setFiltros] = useState({
    pedido: "",
    guia: "",
    celular: "",
    desde: "",
    hasta: "",
    estadoGeneral: "",
    estadoEnvio: "",
    estadoPedido: "",
    tipoPago: "",
  });
  const [filtrosAplicados, setFiltrosAplicados] = useState(filtros);
  const [pagina, setPagina] = useState(1);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pedidos");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPedidos(data);
      setError(null);
    } catch {
      setError("No se pudieron cargar los pedidos. Revisa tu conexión a la base de datos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const sincronizarShopify = async () => {
    setSincronizando(true);
    setMensajeSync(null);
    try {
      const res = await fetch("/api/shopify/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al sincronizar");
      setMensajeSync(
        `Listo: ${data.creados} pedidos nuevos, ${data.actualizados} actualizados.`
      );
      await cargar();
    } catch (err) {
      setMensajeSync(
        err instanceof Error ? err.message : "No se pudo sincronizar con Shopify"
      );
    } finally {
      setSincronizando(false);
    }
  };

  const cambiarEstado = async (id: string, estado: EstadoPedido) => {
    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, estado } : p)));
    await fetch(`/api/pedidos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
  };

  const eliminarPedido = async (id: string) => {
    if (!confirm("¿Eliminar este pedido? Esta acción no se puede deshacer.")) return;
    setPedidos((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/pedidos/${id}`, { method: "DELETE" });
  };

  const aplicarFiltros = () => {
    setFiltrosAplicados(filtros);
    setPagina(1);
  };
  const limpiarFiltros = () => {
    const vacio = {
      pedido: "",
      guia: "",
      celular: "",
      desde: "",
      hasta: "",
      estadoGeneral: "",
      estadoEnvio: "",
      estadoPedido: "",
      tipoPago: "",
    };
    setFiltros(vacio);
    setFiltrosAplicados(vacio);
    setPagina(1);
  };

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      const f = filtrosAplicados;
      if (
        f.pedido &&
        !(p.cliente || "").toLowerCase().includes(f.pedido.toLowerCase()) &&
        !(p.numeroOrden || "").toLowerCase().includes(f.pedido.toLowerCase()) &&
        !p.id.toLowerCase().includes(f.pedido.toLowerCase()) &&
        !(p.producto || "").toLowerCase().includes(f.pedido.toLowerCase())
      )
        return false;
      if (f.celular && !p.telefono.includes(f.celular)) return false;
      if (f.desde && new Date(p.creadoEn) < new Date(f.desde)) return false;
      if (f.hasta && new Date(p.creadoEn) > new Date(f.hasta + "T23:59:59"))
        return false;
      if (f.estadoGeneral && (p.general || "") !== f.estadoGeneral) return false;
      if (f.estadoEnvio && (p.envio || "") !== f.estadoEnvio) return false;
      if (f.estadoPedido && p.estado !== f.estadoPedido) return false;
      return true;
    });
  }, [pedidos, filtrosAplicados]);

  const totalPaginas = Math.max(1, Math.ceil(pedidosFiltrados.length / PAGE_SIZE));
  const pedidosPaginados = useMemo(
    () => pedidosFiltrados.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE),
    [pedidosFiltrados, pagina]
  );

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  const opcionesGeneral = useMemo(
    () => Array.from(new Set(pedidos.map((p) => p.general).filter(Boolean))) as string[],
    [pedidos]
  );
  const opcionesEnvio = useMemo(
    () => Array.from(new Set(pedidos.map((p) => p.envio).filter(Boolean))) as string[],
    [pedidos]
  );

  const exportarExcel = () => {
    const encabezados = [
      "Numero de orden",
      "Cliente",
      "Telefono",
      "Fecha de pedido",
      "General",
      "Envio",
      "Estado",
      "Valor",
    ];
    const filas = pedidosFiltrados.map((p) => [
      p.numeroOrden || p.id,
      p.cliente,
      p.telefono,
      fmtFecha(p.creadoEn),
      p.general || "",
      p.envio || "",
      ESTADO_LABEL[p.estado],
      p.valorTotal,
    ]);
    const csv = [encabezados, ...filas]
      .map((fila) => fila.map((v) => `"${v}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedidos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputCls =
    "w-full bg-white border border-borderLight rounded-md px-3 py-2 text-sm text-ink2 placeholder:text-muted2 focus:outline-none focus:ring-1 focus:ring-accent";
  const labelCls = "text-xs font-medium text-muted2 mb-1 block";

  return (
    <main className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* Encabezado */}
      <div className="bg-card border border-borderLight rounded-xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-greenSoft text-green flex items-center justify-center">
              <ShoppingCart size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-ink2">Pedidos</h1>
              <p className="text-sm text-muted2">
                Gestiona todos los pedidos de tu negocio
              </p>
            </div>
          </div>
          <Link
            href="/pedidos/nuevo"
            className="flex items-center gap-2 bg-accent text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-accent/90 transition-colors"
          >
            <Plus size={16} /> Nuevo Pedido
          </Link>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={sincronizarShopify}
            disabled={sincronizando}
            className="flex items-center gap-2 border border-borderLight text-ink2 text-sm font-medium px-3 py-2 rounded-md hover:bg-paper transition-colors disabled:opacity-50"
          >
            <Upload size={15} /> Importar Nuevos
          </button>
          <button
            onClick={sincronizarShopify}
            disabled={sincronizando}
            className="flex items-center gap-2 border border-borderLight text-ink2 text-sm font-medium px-3 py-2 rounded-md hover:bg-paper transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={sincronizando ? "animate-spin" : ""} />
            {sincronizando ? "Sincronizando…" : "Sincronizar Completo"}
          </button>
        </div>
        {mensajeSync && (
          <p className="text-xs text-muted2 mt-3">{mensajeSync}</p>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-card border border-borderLight rounded-xl p-5">
        <button
          onClick={() => setFiltrosAbiertos((v) => !v)}
          className="w-full flex items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-accentSoft text-accent flex items-center justify-center">
              <Filter size={15} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink2">Filtros y Búsqueda</p>
              <p className="text-xs text-muted2">
                Filtra y busca pedidos por diferentes criterios
              </p>
            </div>
          </div>
          {filtrosAbiertos ? (
            <ChevronUp size={18} className="text-muted2" />
          ) : (
            <ChevronDown size={18} className="text-muted2" />
          )}
        </button>

        {filtrosAbiertos && (
        <>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4">
          <div>
            <label className={labelCls}>Buscar pedido</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted2" />
              <input
                value={filtros.pedido}
                onChange={(e) => setFiltros((f) => ({ ...f, pedido: e.target.value }))}
                className={`${inputCls} pl-8`}
                placeholder="Cliente, producto o #..."
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Buscar por guía</label>
            <input
              value={filtros.guia}
              onChange={(e) => setFiltros((f) => ({ ...f, guia: e.target.value }))}
              className={inputCls}
              placeholder="Número de guía..."
            />
          </div>
          <div>
            <label className={labelCls}>Buscar por celular</label>
            <input
              value={filtros.celular}
              onChange={(e) => setFiltros((f) => ({ ...f, celular: e.target.value }))}
              className={inputCls}
              placeholder="Celular del cliente..."
            />
          </div>
          <div>
            <label className={labelCls}>Fecha desde</label>
            <input
              type="date"
              value={filtros.desde}
              onChange={(e) => setFiltros((f) => ({ ...f, desde: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Fecha hasta</label>
            <input
              type="date"
              value={filtros.hasta}
              onChange={(e) => setFiltros((f) => ({ ...f, hasta: e.target.value }))}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
          <div>
            <label className={labelCls}>Estado General</label>
            <select
              value={filtros.estadoGeneral}
              onChange={(e) => setFiltros((f) => ({ ...f, estadoGeneral: e.target.value }))}
              className={inputCls}
            >
              <option value="">Seleccionar estados...</option>
              {opcionesGeneral.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Estado de Envío</label>
            <select
              value={filtros.estadoEnvio}
              onChange={(e) => setFiltros((f) => ({ ...f, estadoEnvio: e.target.value }))}
              className={inputCls}
            >
              <option value="">Seleccionar envíos...</option>
              {opcionesEnvio.map((en) => (
                <option key={en} value={en}>
                  {en}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Estado del Pedido</label>
            <select
              value={filtros.estadoPedido}
              onChange={(e) => setFiltros((f) => ({ ...f, estadoPedido: e.target.value }))}
              className={inputCls}
            >
              <option value="">Seleccionar estados...</option>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {ESTADO_LABEL[e]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Tipo de Pago</label>
            <select
              value={filtros.tipoPago}
              onChange={(e) => setFiltros((f) => ({ ...f, tipoPago: e.target.value }))}
              className={inputCls}
            >
              <option value="">Seleccionar métodos...</option>
              <option value="COD">Contraentrega</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            onClick={aplicarFiltros}
            className="flex items-center gap-2 bg-accent text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-accent/90 transition-colors"
          >
            <Filter size={14} /> Aplicar Filtros
          </button>
          <button
            onClick={limpiarFiltros}
            className="border border-borderLight text-ink2 text-sm font-medium px-4 py-2 rounded-md hover:bg-paper transition-colors"
          >
            Limpiar
          </button>
          <button
            onClick={exportarExcel}
            className="flex items-center gap-2 border border-green/40 text-green text-sm font-medium px-4 py-2 rounded-md hover:bg-greenSoft transition-colors"
          >
            <Download size={14} /> Reporte Excel
          </button>
        </div>
        </>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-card border border-borderLight rounded-xl overflow-hidden">
        {loading && <p className="text-sm text-muted2 p-5">Cargando pedidos…</p>}

        {error && (
          <div className="bg-redSoft text-red text-sm p-4 m-5 rounded-md">{error}</div>
        )}

        {!loading && !error && pedidosFiltrados.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-ink2 font-medium">No hay pedidos que coincidan</p>
            <p className="text-muted2 text-sm mt-1">
              Ajusta los filtros o crea un nuevo pedido.
            </p>
          </div>
        )}

        {!loading && !error && pedidosFiltrados.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper text-left text-xs font-semibold text-muted2 uppercase tracking-wide">
                <th className="px-5 py-3">Número de orden</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Fecha de pedido</th>
                <th className="px-5 py-3 text-right">Valor</th>
                <th className="px-5 py-3">General</th>
                <th className="px-5 py-3">Envío</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pedidosPaginados.map((p) => {
                return (
                  <tr key={p.id} className="border-t border-borderLight hover:bg-paper/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-ink2">
                      {p.numeroOrden ? `# ${p.numeroOrden}` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-ink2">{p.cliente}</p>
                      <p className="text-xs text-muted2">{p.telefono}</p>
                    </td>
                    <td className="px-5 py-3 text-muted2">{fmtFecha(p.creadoEn)}</td>
                    <td className="px-5 py-3 text-right font-medium text-ink2">
                      {fmtMoney(p.valorTotal)}
                    </td>
                    <td className="px-5 py-3 text-muted2">{p.general || "—"}</td>
                    <td className="px-5 py-3 text-muted2">{p.envio || "—"}</td>
                    <td className="px-5 py-3">
                      {editandoId === p.id ? (
                        <select
                          autoFocus
                          value={p.estado}
                          onChange={(e) => {
                            cambiarEstado(p.id, e.target.value as EstadoPedido);
                            setEditandoId(null);
                          }}
                          onBlur={() => setEditandoId(null)}
                          className="text-xs border border-borderLight rounded-md px-2 py-1"
                        >
                          {ESTADOS.map((e) => (
                            <option key={e} value={e}>
                              {ESTADO_LABEL[e]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${ESTADO_PILL[p.estado]}`}
                        >
                          {ESTADO_LABEL[p.estado]}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-3">
                        <Link
                          href={`/pedidos/${p.id}/editar`}
                          className="text-accent hover:text-accent/70"
                          title="Editar pedido"
                        >
                          <Pencil size={15} />
                        </Link>
                        <button
                          onClick={() => eliminarPedido(p.id)}
                          className="text-red hover:text-red/70"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && !error && pedidosFiltrados.length > 0 && (
          <Pagination
            page={pagina}
            totalPages={totalPaginas}
            total={pedidosFiltrados.length}
            onChange={setPagina}
          />
        )}
      </div>
    </main>
  );
}
