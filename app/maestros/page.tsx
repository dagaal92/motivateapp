"use client";

import { useEffect, useState, useCallback } from "react";
import { ListChecks, Plus, Trash2 } from "lucide-react";
import { CATEGORIAS_MAESTRAS, type CategoriaMaestra } from "@/lib/categorias";

type Opcion = {
  id: string;
  categoria: string;
  valor: string;
};

export default function MaestrosPage() {
  const [categoriaActiva, setCategoriaActiva] = useState<CategoriaMaestra>(
    CATEGORIAS_MAESTRAS[0].key
  );
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevoValor, setNuevoValor] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (categoria: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/opciones?categoria=${encodeURIComponent(categoria)}`);
      if (!res.ok) throw new Error();
      setOpciones(await res.json());
      setError(null);
    } catch {
      setError("No se pudieron cargar las opciones.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar(categoriaActiva);
  }, [categoriaActiva, cargar]);

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoValor.trim()) return;
    setGuardando(true);
    try {
      const res = await fetch("/api/opciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoria: categoriaActiva, valor: nuevoValor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setNuevoValor("");
      await cargar(categoriaActiva);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo agregar");
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta opción?")) return;
    setOpciones((prev) => prev.filter((o) => o.id !== id));
    await fetch(`/api/opciones/${id}`, { method: "DELETE" });
  };

  const inputCls =
    "w-full bg-white border border-borderLight rounded-md px-3 py-2 text-sm text-ink2 placeholder:text-muted2 focus:outline-none focus:ring-1 focus:ring-accent";

  return (
    <main className="p-4 sm:p-6 max-w-[1000px] mx-auto space-y-5">
      <div className="bg-card border border-borderLight rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accentSoft text-accent flex items-center justify-center">
            <ListChecks size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink2">Listados maestros</h1>
            <p className="text-sm text-muted2">
              Administra las opciones que aparecen en los desplegables del formulario de pedidos
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-borderLight rounded-xl p-5">
        <div className="flex flex-wrap gap-2 border-b border-borderLight pb-4 mb-4">
          {CATEGORIAS_MAESTRAS.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategoriaActiva(c.key)}
              className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                categoriaActiva === c.key
                  ? "bg-accent text-white"
                  : "bg-paper text-ink2 hover:bg-borderLight"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <form onSubmit={agregar} className="flex gap-2 mb-5">
          <input
            value={nuevoValor}
            onChange={(e) => setNuevoValor(e.target.value)}
            className={inputCls}
            placeholder={`Agregar nueva opción de ${
              CATEGORIAS_MAESTRAS.find((c) => c.key === categoriaActiva)?.label
            }...`}
          />
          <button
            type="submit"
            disabled={guardando}
            className="flex items-center gap-2 bg-accent text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <Plus size={15} /> Agregar
          </button>
        </form>

        {error && (
          <div className="bg-redSoft text-red text-sm p-3 rounded-md mb-4">{error}</div>
        )}

        {loading ? (
          <p className="text-sm text-muted2">Cargando…</p>
        ) : opciones.length === 0 ? (
          <p className="text-sm text-muted2">
            Aún no hay opciones en esta categoría. Agrega la primera arriba.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {opciones.map((o) => (
              <span
                key={o.id}
                className="flex items-center gap-2 bg-paper border border-borderLight rounded-full pl-3 pr-1.5 py-1 text-sm text-ink2"
              >
                {o.valor}
                <button
                  onClick={() => eliminar(o.id)}
                  className="text-muted2 hover:text-red transition-colors w-5 h-5 flex items-center justify-center"
                  title="Eliminar"
                >
                  <Trash2 size={13} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
