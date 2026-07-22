"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Package, Plus, RefreshCw } from "lucide-react";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 25;

type Producto = {
  id: string;
  nombre: string;
  variante: string | null;
  stock: number;
  activo: boolean;
};

const inputCls =
  "w-full bg-white border border-borderLight rounded-md px-3 py-2 text-sm text-ink2 placeholder:text-muted2 focus:outline-none focus:ring-1 focus:ring-accent";
const labelCls = "text-xs font-medium text-muted2 mb-1 block";

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
  const [pagina, setPagina] = useState(1);

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

  const totalPaginas = Math.max(1, Math.ceil(productos.length / PAGE_SIZE));
  const productosPaginados = useMemo(
    () => productos.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE),
    [productos, pagina]
  );

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

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
    <main className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div className="bg-card border border-borderLight rounded-xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accentSoft text-accent flex items-center justify-center">
              <Package size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-ink2">Inventario</h1>
              <p className="text-sm text-muted2">
                Stock por producto/variante, se descuenta solo al crear un pedido
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
              {importando ? "Importando…" : "Importar catálogo de Shopify"}
            </button>
            <button
              onClick={() => setFormAbierto((v) => !v)}
              className="flex items-center gap-2 bg-accent text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-accent/90 transition-colors"
            >
              <Plus size={15} /> Agregar producto
            </button>
          </div>
        </div>

        {mensajeImport && (
          <p className="text-sm text-muted2 mt-3">{mensajeImport}</p>
        )}

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
      </div>

      {error && (
        <div className="bg-redSoft text-red text-sm p-4 rounded-md">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-muted2">Cargando inventario…</p>
      ) : (
        <div className="bg-card border border-borderLight rounded-xl overflow-hidden">
          {productos.length === 0 ? (
            <p className="text-sm text-muted2 p-5">
              Aún no hay productos. Importa el catálogo de Shopify o agrega uno manual.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-paper text-left text-xs font-semibold text-muted2 uppercase tracking-wide">
                  <th className="px-5 py-3">Producto</th>
                  <th className="px-5 py-3">Variante</th>
                  <th className="px-5 py-3">Stock</th>
                  <th className="px-5 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {productosPaginados.map((p) => (
                  <tr key={p.id} className="border-t border-borderLight">
                    <td className="px-5 py-3 text-ink2">{p.nombre}</td>
                    <td className="px-5 py-3 text-muted2">{p.variante || "—"}</td>
                    <td className="px-5 py-3">
                      <input
                        type="number"
                        value={nuevoStock[p.id] ?? String(p.stock)}
                        onChange={(e) =>
                          setNuevoStock((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        onBlur={() => guardarStock(p.id)}
                        className={`${inputCls} w-24 ${
                          p.stock <= 0 ? "border-red/40 text-red" : ""
                        }`}
                      />
                    </td>
                    <td className="px-5 py-3">
                      {p.activo ? (
                        <span className="text-xs font-medium text-green">Activo</span>
                      ) : (
                        <span className="text-xs font-medium text-muted2">Inactivo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Pagination
            page={pagina}
            totalPages={totalPaginas}
            total={productos.length}
            onChange={setPagina}
          />
        </div>
      )}
    </main>
  );
}
