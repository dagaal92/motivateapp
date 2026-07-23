"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Package, Plus, RefreshCw, Search, ChevronRight, Layers } from "lucide-react";

type Producto = {
  id: string;
  nombre: string;
  variante: string | null;
  stock: number;
  activo: boolean;
};

type Severidad = "ok" | "low" | "out";

const CAP = 15; // stock a partir del cual la barra se muestra llena
const FILTROS = [
  { key: "todos", label: "Todos" },
  { key: "bajo", label: "Stock bajo" },
  { key: "agotado", label: "Agotados" },
] as const;

const COLOR_DOTS: Record<string, string> = {
  negro: "#111827",
  blanco: "#f3f4f6",
  azul: "#2563eb",
  gris: "#9ca3af",
  rojo: "#dc2626",
  verde: "#16a34a",
  amarillo: "#eab308",
  beige: "#d6cbb5",
  cafe: "#7c4a2d",
  café: "#7c4a2d",
};

const inputCls =
  "w-full bg-white border border-borderLight rounded-md px-3 py-2 text-sm text-ink2 placeholder:text-muted2 focus:outline-none focus:ring-1 focus:ring-accent";
const labelCls = "text-xs font-medium text-muted2 mb-1 block";

function severidad(stock: number): Severidad {
  if (stock <= 0) return "out";
  if (stock <= 4) return "low";
  return "ok";
}

const SEVERIDAD_LABEL: Record<Severidad, string> = {
  ok: "Disponible",
  low: "Stock bajo",
  out: "Agotado",
};

const SEVERIDAD_PILL: Record<Severidad, string> = {
  ok: "bg-greenSoft text-green",
  low: "bg-amberSoft text-amber2",
  out: "bg-redSoft text-red",
};

const SEVERIDAD_BARRA: Record<Severidad, string> = {
  ok: "bg-green",
  low: "bg-amber2",
  out: "bg-red",
};

function colorPunto(variante: string | null): string {
  if (!variante) return "#d1d5db";
  const primera = variante.toLowerCase().split(" / ")[0].split(" ")[0];
  return COLOR_DOTS[primera] || "#d1d5db";
}

export default function InventarioPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [mensajeImport, setMensajeImport] = useState<string | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [guardandoAlta, setGuardandoAlta] = useState(false);
  const [nuevoStock, setNuevoStock] = useState<Record<string, string>>({});
  const [alta, setAlta] = useState({ nombre: "", variante: "", stock: "" });
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["key"]>("todos");
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [expandidoInicializado, setExpandidoInicializado] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventario");
      if (!res.ok) throw new Error();
      const data: Producto[] = await res.json();
      setProductos(data);
      const inputs: Record<string, string> = {};
      data.forEach((p) => (inputs[p.id] = String(p.stock)));
      setNuevoStock(inputs);
      setError(null);
    } catch {
      setError("No se pudo cargar el inventario.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, Producto[]>();
    for (const p of productos) {
      const lista = mapa.get(p.nombre) || [];
      lista.push(p);
      mapa.set(p.nombre, lista);
    }
    return Array.from(mapa.entries())
      .map(([nombre, variantes]) => ({ nombre, variantes }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productos]);

  // Al cargar, expande automáticamente los productos que tienen algo por
  // atender (bajo/agotado) y deja colapsados los que están sanos.
  useEffect(() => {
    if (expandidoInicializado || grupos.length === 0) return;
    const conAlerta = grupos
      .filter((g) => g.variantes.some((v) => severidad(v.stock) !== "ok"))
      .map((g) => g.nombre);
    setAbiertos(new Set(conAlerta));
    setExpandidoInicializado(true);
  }, [grupos, expandidoInicializado]);

  const stats = useMemo(() => {
    let ok = 0,
      low = 0,
      out = 0;
    for (const p of productos) {
      const s = severidad(p.stock);
      if (s === "ok") ok++;
      else if (s === "low") low++;
      else out++;
    }
    return { productos: grupos.length, ok, low, out };
  }, [productos, grupos]);

  const gruposVisibles = useMemo(() => {
    return grupos
      .map((g) => {
        const variantes =
          filtro === "todos"
            ? g.variantes
            : g.variantes.filter((v) => severidad(v.stock) === (filtro === "bajo" ? "low" : "out"));
        return { ...g, variantesFiltradas: variantes };
      })
      .filter((g) => {
        if (busqueda && !g.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
        if (filtro !== "todos" && g.variantesFiltradas.length === 0) return false;
        return true;
      });
  }, [grupos, busqueda, filtro]);

  const toggleAbierto = (nombre: string) => {
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(nombre)) next.delete(nombre);
      else next.add(nombre);
      return next;
    });
  };

  const importarShopify = async () => {
    setImportando(true);
    setMensajeImport(null);
    try {
      const res = await fetch("/api/inventario/importar-shopify", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al importar");
      setMensajeImport(
        `Listo: ${data.creados} nuevos, ${data.actualizados} actualizados, ${data.desactivados} desactivados.`
      );
      await cargar();
    } catch (err) {
      setMensajeImport(err instanceof Error ? err.message : "No se pudo importar el catálogo");
    } finally {
      setImportando(false);
    }
  };

  const guardarStock = async (id: string) => {
    const stock = Number(nuevoStock[id] ?? 0);
    try {
      const res = await fetch(`/api/inventario/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock }),
      });
      if (!res.ok) throw new Error();
      setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, stock } : p)));
    } catch {
      alert("No se pudo actualizar el stock");
    }
  };

  const agregarManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alta.nombre) return;
    setGuardandoAlta(true);
    try {
      const res = await fetch("/api/inventario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alta),
      });
      if (!res.ok) throw new Error();
      setAlta({ nombre: "", variante: "", stock: "" });
      setFormAbierto(false);
      await cargar();
    } catch {
      alert("No se pudo crear el producto");
    } finally {
      setGuardandoAlta(false);
    }
  };

  return (
    <main className="p-4 sm:p-6 max-w-[1200px] mx-auto space-y-5">
      <div className="bg-card border border-borderLight rounded-xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accentSoft text-accent flex items-center justify-center">
              <Package size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-ink2">Inventario</h1>
              <p className="text-sm text-muted2">
                Agrupado por producto — stock por color y talla
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={importarShopify}
              disabled={importando}
              className="flex items-center gap-2 border border-borderLight text-ink2 text-sm font-medium px-4 py-2 rounded-md hover:bg-paper transition-colors disabled:opacity-50"
            >
              <RefreshCw size={15} className={importando ? "animate-spin" : ""} />
              {importando ? "Importando…" : "Importar de Shopify"}
            </button>
            <button
              onClick={() => setFormAbierto((v) => !v)}
              className="flex items-center gap-2 bg-accent text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-accent/90 transition-colors"
            >
              <Plus size={15} /> Agregar producto
            </button>
          </div>
        </div>

        {mensajeImport && <p className="text-sm text-muted2 mt-3">{mensajeImport}</p>}

        {formAbierto && (
          <form
            onSubmit={agregarManual}
            className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 border-t border-borderLight pt-4"
          >
            <div>
              <label className={labelCls}>Nombre</label>
              <input
                required
                value={alta.nombre}
                onChange={(e) => setAlta((a) => ({ ...a, nombre: e.target.value }))}
                className={inputCls}
                placeholder="Ej: Gorra Motívate"
              />
            </div>
            <div>
              <label className={labelCls}>Variante (opcional)</label>
              <input
                value={alta.variante}
                onChange={(e) => setAlta((a) => ({ ...a, variante: e.target.value }))}
                className={inputCls}
                placeholder="Ej: Negro / Único"
              />
            </div>
            <div>
              <label className={labelCls}>Stock inicial</label>
              <input
                type="number"
                min="0"
                value={alta.stock}
                onChange={(e) => setAlta((a) => ({ ...a, stock: e.target.value }))}
                className={inputCls}
                placeholder="0"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={guardandoAlta}
                className="bg-accent text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50 w-full"
              >
                {guardandoAlta ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-accentSoft/60 border border-accent/20 rounded-lg p-3">
            <p className="text-xs font-medium text-accent">Productos</p>
            <p className="text-xl font-semibold text-ink2 mt-0.5">{stats.productos}</p>
          </div>
          <div className="bg-greenSoft/60 border border-green/20 rounded-lg p-3">
            <p className="text-xs font-medium text-green">Con stock sano</p>
            <p className="text-xl font-semibold text-ink2 mt-0.5">{stats.ok}</p>
          </div>
          <div className="bg-amberSoft/60 border border-amber2/20 rounded-lg p-3">
            <p className="text-xs font-medium text-amber2">Stock bajo</p>
            <p className="text-xl font-semibold text-ink2 mt-0.5">{stats.low}</p>
          </div>
          <div className="bg-redSoft/60 border border-red/20 rounded-lg p-3">
            <p className="text-xs font-medium text-red">Agotados</p>
            <p className="text-xl font-semibold text-ink2 mt-0.5">{stats.out}</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-borderLight rounded-xl p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted2" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className={`${inputCls} pl-8`}
            placeholder="Buscar producto..."
          />
        </div>
        <div className="flex items-center gap-2">
          {FILTROS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                filtro === f.key
                  ? "bg-ink2 text-white border-ink2"
                  : "bg-white text-ink2 border-borderLight hover:bg-paper"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-redSoft text-red text-sm p-4 rounded-md">{error}</div>}

      {loading ? (
        <p className="text-sm text-muted2">Cargando inventario…</p>
      ) : productos.length === 0 ? (
        <div className="bg-card border border-borderLight rounded-xl p-10 text-center">
          <p className="text-sm text-muted2">
            Aún no hay productos. Importa el catálogo de Shopify o agrega uno manual.
          </p>
        </div>
      ) : gruposVisibles.length === 0 ? (
        <div className="bg-card border border-borderLight rounded-xl p-10 text-center">
          <p className="text-sm text-muted2">Ningún producto coincide con el filtro.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {gruposVisibles.map((g) => {
            const abierto = abiertos.has(g.nombre);
            const total = g.variantes.reduce((s, v) => s + v.stock, 0);
            const peor = g.variantes.reduce<Severidad>((peorActual, v) => {
              const s = severidad(v.stock);
              const rango: Record<Severidad, number> = { ok: 2, low: 1, out: 0 };
              return rango[s] < rango[peorActual] ? s : peorActual;
            }, "ok");
            const pct = Math.min(100, Math.round((total / (CAP * g.variantes.length)) * 100));
            const lista = filtro === "todos" ? g.variantes : g.variantesFiltradas;

            return (
              <div key={g.nombre} className="bg-card border border-borderLight rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleAbierto(g.nombre)}
                  className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 hover:bg-paper transition-colors text-left"
                >
                  <ChevronRight
                    size={16}
                    className={`text-muted2 shrink-0 transition-transform ${abierto ? "rotate-90" : ""}`}
                  />
                  <div className="w-9 h-9 rounded-lg bg-purpleSoft text-purple flex items-center justify-center shrink-0">
                    <Layers size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink2 truncate">{g.nombre}</p>
                    <p className="text-xs text-muted2">
                      {g.variantes.length} variante{g.variantes.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className={`hidden sm:inline-block text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${SEVERIDAD_PILL[peor]}`}>
                    {peor === "out"
                      ? "Agotados en la mezcla"
                      : peor === "low"
                      ? "Stock bajo en la mezcla"
                      : "Todo sano"}
                  </span>
                  <div className="hidden md:block w-28 shrink-0">
                    <div className="h-1.5 rounded-full bg-paper overflow-hidden">
                      <div className={`h-full ${SEVERIDAD_BARRA[peor]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0 w-16">
                    <p className="font-semibold text-ink2 tabular-nums">{total}</p>
                    <p className="text-[11px] text-muted2">unidades</p>
                  </div>
                </button>

                {abierto && (
                  <div className="border-t border-borderLight">
                    {lista.map((p) => {
                      const sev = severidad(p.stock);
                      const pctV = Math.min(100, Math.round((p.stock / CAP) * 100));
                      return (
                        <div
                          key={p.id}
                          className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.3fr)_minmax(140px,1fr)_90px_80px] gap-2 sm:gap-4 items-center px-4 sm:px-5 sm:pl-16 py-3 border-t border-borderLight first:border-t-0"
                        >
                          <p className="text-sm font-medium text-ink2 flex items-center">
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full mr-2 border border-black/10 shrink-0"
                              style={{ backgroundColor: colorPunto(p.variante) }}
                            />
                            {p.variante || "Único"}
                          </p>
                          <div className="flex items-center gap-2.5">
                            <div className="flex-1 h-2 rounded-full bg-paper overflow-hidden">
                              <div
                                className={`h-full ${SEVERIDAD_BARRA[sev]}`}
                                style={{ width: `${pctV}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${SEVERIDAD_PILL[sev]}`}>
                              {SEVERIDAD_LABEL[sev]}
                            </span>
                          </div>
                          <input
                            type="number"
                            value={nuevoStock[p.id] ?? String(p.stock)}
                            onChange={(e) =>
                              setNuevoStock((prev) => ({ ...prev, [p.id]: e.target.value }))
                            }
                            onBlur={() => guardarStock(p.id)}
                            className={`${inputCls} w-20 text-center tabular-nums`}
                          />
                          <div className="text-left sm:text-right">
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                p.activo ? "bg-greenSoft text-green" : "bg-paper text-muted2"
                              }`}
                            >
                              {p.activo ? "Activo" : "Inactivo"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
