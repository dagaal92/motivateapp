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

function colorPunto(color: string): string {
  const primera = color.toLowerCase().split(" ")[0];
  return COLOR_DOTS[primera] || "#d1d5db";
}

const TALLA_REGEX = /^(xxs|xs|s|m|l|xl|xxl|xxxl|único|unico|\d+([.,]\d+)?)$/i;
function esTalla(v: string): boolean {
  return TALLA_REGEX.test(v.trim());
}

/** Separa "Negro / S" o "S / Blanco" en { color, talla }; tolera cualquier orden. */
function extraerColorTalla(variante: string | null): { color: string; talla: string } {
  if (!variante) return { color: "Único", talla: "" };
  const partes = variante.split(" / ").map((p) => p.trim()).filter(Boolean);
  if (partes.length === 0) return { color: "Único", talla: "" };
  if (partes.length === 1) {
    return esTalla(partes[0]) ? { color: "Único", talla: partes[0] } : { color: partes[0], talla: "" };
  }
  const [a, b] = partes;
  if (esTalla(a) && !esTalla(b)) return { color: b, talla: a };
  return { color: a, talla: b };
}

const ORDEN_TALLA = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];
function compararTalla(a: string, b: string): number {
  const ia = ORDEN_TALLA.indexOf(a.toUpperCase());
  const ib = ORDEN_TALLA.indexOf(b.toUpperCase());
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  const na = parseFloat(a.replace(",", "."));
  const nb = parseFloat(b.replace(",", "."));
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return a.localeCompare(b);
}

function severidadGrupo(items: { stock: number }[]): Severidad {
  return items.reduce<Severidad>((peorActual, v) => {
    const s = severidad(v.stock);
    const rango: Record<Severidad, number> = { ok: 2, low: 1, out: 0 };
    return rango[s] < rango[peorActual] ? s : peorActual;
  }, "ok");
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
  const [coloresAbiertos, setColoresAbiertos] = useState<Set<string>>(new Set());

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
    const mapaProductos = new Map<string, Producto[]>();
    for (const p of productos) {
      const lista = mapaProductos.get(p.nombre) || [];
      lista.push(p);
      mapaProductos.set(p.nombre, lista);
    }
    return Array.from(mapaProductos.entries())
      .map(([nombre, variantes]) => {
        const mapaColores = new Map<string, (Producto & { talla: string })[]>();
        for (const v of variantes) {
          const { color, talla } = extraerColorTalla(v.variante);
          const lista = mapaColores.get(color) || [];
          lista.push({ ...v, talla });
          mapaColores.set(color, lista);
        }
        const colores = Array.from(mapaColores.entries())
          .map(([color, tallas]) => ({
            color,
            tallas: tallas.sort((a, b) => compararTalla(a.talla, b.talla)),
          }))
          .sort((a, b) => a.color.localeCompare(b.color));
        return { nombre, variantes, colores };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productos]);

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
        const colores = g.colores
          .map((c) => {
            const tallas =
              filtro === "todos"
                ? c.tallas
                : c.tallas.filter((v) => severidad(v.stock) === (filtro === "bajo" ? "low" : "out"));
            return { ...c, tallasFiltradas: tallas };
          })
          .filter((c) => filtro === "todos" || c.tallasFiltradas.length > 0);
        return { ...g, coloresFiltrados: colores };
      })
      .filter((g) => {
        if (busqueda && !g.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
        if (filtro !== "todos" && g.coloresFiltrados.length === 0) return false;
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

  const toggleColorAbierto = (clave: string) => {
    setColoresAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave);
      else next.add(clave);
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
            const peor = severidadGrupo(g.variantes);
            const pct = Math.min(100, Math.round((total / (CAP * g.variantes.length)) * 100));
            const colores = g.coloresFiltrados;

            return (
              <div key={g.nombre} className="bg-card border border-borderLight rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleAbierto(g.nombre)}
                  className="w-full flex items-start gap-3 sm:gap-4 px-4 sm:px-5 py-4 hover:bg-paper transition-colors text-left"
                >
                  <ChevronRight
                    size={16}
                    className={`text-muted2 shrink-0 transition-transform mt-1 ${abierto ? "rotate-90" : ""}`}
                  />
                  <div className="w-9 h-9 rounded-lg bg-purpleSoft text-purple flex items-center justify-center shrink-0">
                    <Layers size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink2 break-words">{g.nombre}</p>
                    <p className="text-xs text-muted2">
                      {g.colores.length} color{g.colores.length > 1 ? "es" : ""} · {g.variantes.length} variante
                      {g.variantes.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className={`hidden sm:inline-block self-center text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${SEVERIDAD_PILL[peor]}`}>
                    {peor === "out"
                      ? "Agotados en la mezcla"
                      : peor === "low"
                      ? "Stock bajo en la mezcla"
                      : "Todo sano"}
                  </span>
                  <div className="hidden md:block self-center w-28 shrink-0">
                    <div className="h-1.5 rounded-full bg-paper overflow-hidden">
                      <div className={`h-full ${SEVERIDAD_BARRA[peor]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right self-center shrink-0 w-16">
                    <p className="font-semibold text-ink2 tabular-nums">{total}</p>
                    <p className="text-[11px] text-muted2">unidades</p>
                  </div>
                </button>

                {abierto && (
                  <div className="border-t border-borderLight">
                    {colores.map((c) => {
                      const claveColor = `${g.nombre}__${c.color}`;
                      const colorAbierto = coloresAbiertos.has(claveColor);
                      const totalColor = c.tallas.reduce((s, v) => s + v.stock, 0);
                      const peorColor = severidadGrupo(c.tallas);
                      const pctColor = Math.min(100, Math.round((totalColor / (CAP * c.tallas.length)) * 100));
                      const tallas = c.tallasFiltradas;

                      return (
                        <div key={c.color} className="border-t border-borderLight first:border-t-0">
                          <button
                            onClick={() => toggleColorAbierto(claveColor)}
                            className="w-full flex items-center gap-3 pl-8 pr-4 sm:pl-12 sm:pr-5 py-3 hover:bg-paper transition-colors text-left"
                          >
                            <ChevronRight
                              size={14}
                              className={`text-muted2 shrink-0 transition-transform ${colorAbierto ? "rotate-90" : ""}`}
                            />
                            <span
                              className="inline-block w-3 h-3 rounded-full border border-black/10 shrink-0"
                              style={{ backgroundColor: colorPunto(c.color) }}
                            />
                            <p className="text-sm font-medium text-ink2 flex-1 min-w-0 truncate">{c.color}</p>
                            <span className={`hidden sm:inline-block text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${SEVERIDAD_PILL[peorColor]}`}>
                              {SEVERIDAD_LABEL[peorColor]}
                            </span>
                            <div className="hidden sm:block w-16 sm:w-20 shrink-0">
                              <div className="h-1.5 rounded-full bg-paper overflow-hidden">
                                <div className={`h-full ${SEVERIDAD_BARRA[peorColor]}`} style={{ width: `${pctColor}%` }} />
                              </div>
                            </div>
                            <div className="text-right shrink-0 w-14">
                              <p className="font-semibold text-ink2 text-sm tabular-nums">{totalColor}</p>
                              <p className="text-[10px] text-muted2">unidades</p>
                            </div>
                          </button>

                          {colorAbierto && (
                            <div className="flex flex-wrap gap-2 border-t border-borderLight bg-paper px-4 sm:pl-12 sm:pr-5 py-3">
                              {tallas.map((p) => {
                                const sev = severidad(p.stock);
                                const pctV = Math.min(100, Math.round((p.stock / CAP) * 100));
                                return (
                                  <div
                                    key={p.id}
                                    className="flex items-center gap-2 bg-white border border-borderLight rounded-lg px-2.5 py-2 min-w-[150px]"
                                  >
                                    <span className="text-xs font-bold text-muted2 w-6 text-center shrink-0">
                                      {p.talla || "Único"}
                                    </span>
                                    <div className="w-9 h-1.5 rounded-full bg-paper overflow-hidden shrink-0">
                                      <div className={`h-full ${SEVERIDAD_BARRA[sev]}`} style={{ width: `${pctV}%` }} />
                                    </div>
                                    <input
                                      type="number"
                                      value={nuevoStock[p.id] ?? String(p.stock)}
                                      onChange={(e) =>
                                        setNuevoStock((prev) => ({ ...prev, [p.id]: e.target.value }))
                                      }
                                      onBlur={() => guardarStock(p.id)}
                                      className="w-14 text-center text-sm tabular-nums bg-white border border-borderLight rounded-md px-1 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                                    />
                                    {!p.activo && (
                                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-paper text-muted2 shrink-0">
                                        Inactivo
                                      </span>
                                    )}
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
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
