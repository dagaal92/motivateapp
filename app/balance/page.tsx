"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Pagination from "@/components/Pagination";
import {
  Wallet,
  Landmark,
  Smartphone,
  CreditCard,
  Package,
  Truck,
  Leaf,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";

type Cuenta = {
  id: string;
  nombre: string;
  saldo: number;
};

type Movimiento = {
  id: string;
  tipo: "INGRESO" | "EGRESO";
  monto: number;
  descripcion: string | null;
  categoria: string | null;
  creadoEn: string;
  cuenta: { nombre: string };
};

type Opcion = { id: string; categoria: string; valor: string };

const ICONO_CUENTA: Record<
  string,
  { icon: any; bg: string; fg: string; logo: string }
> = {
  Bancolombia: {
    icon: Landmark,
    bg: "bg-amberSoft",
    fg: "text-amber2",
    logo: "/logos/bancolombia.png",
  },
  Nequi: {
    icon: Smartphone,
    bg: "bg-purpleSoft",
    fg: "text-purple",
    logo: "/logos/nequi.png",
  },
  Daviplata: {
    icon: Smartphone,
    bg: "bg-redSoft",
    fg: "text-red",
    logo: "/logos/daviplata.png",
  },
  "Mercado Pago": {
    icon: CreditCard,
    bg: "bg-accentSoft",
    fg: "text-accent",
    logo: "/logos/mercadopago.png",
  },
  Dropi: {
    icon: Package,
    bg: "bg-orangeSoft",
    fg: "text-orange",
    logo: "/logos/dropi.png",
  },
  Envia: {
    icon: Truck,
    bg: "bg-tealSoft",
    fg: "text-teal",
    logo: "/logos/envia.png",
  },
  Lulo: {
    icon: Leaf,
    bg: "bg-greenSoft",
    fg: "text-green",
    logo: "/logos/lulo.png",
  },
};

const PAGE_SIZE = 25;

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

const fmtFechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function BalancePage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [logoFallido, setLogoFallido] = useState<Record<string, boolean>>({});
  const [categoriasGasto, setCategoriasGasto] = useState<Opcion[]>([]);
  const [categoriasIngreso, setCategoriasIngreso] = useState<Opcion[]>([]);
  const [soloSinCategoria, setSoloSinCategoria] = useState(false);
  const [pagina, setPagina] = useState(1);

  const [form, setForm] = useState({
    cuentaId: "",
    tipo: "INGRESO" as "INGRESO" | "EGRESO",
    monto: "",
    descripcion: "",
    categoria: "",
  });

  const cargarMovimientos = useCallback(async (sinCategoria: boolean) => {
    const res = await fetch(
      sinCategoria ? "/api/movimientos?sinCategoria=1" : "/api/movimientos"
    );
    if (!res.ok) throw new Error();
    setMovimientos(await res.json());
  }, []);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [resCuentas, resGasto, resIngreso] = await Promise.all([
        fetch("/api/cuentas"),
        fetch("/api/opciones?categoria=CATEGORIA_GASTO"),
        fetch("/api/opciones?categoria=CATEGORIA_INGRESO"),
      ]);
      if (!resCuentas.ok || !resGasto.ok || !resIngreso.ok) throw new Error();
      setCuentas(await resCuentas.json());
      setCategoriasGasto(await resGasto.json());
      setCategoriasIngreso(await resIngreso.json());
      await cargarMovimientos(soloSinCategoria);
      setError(null);
    } catch {
      setError("No se pudo cargar el balance. Revisa tu conexión a la base de datos.");
    } finally {
      setLoading(false);
    }
  }, [cargarMovimientos, soloSinCategoria]);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cargarMovimientos(soloSinCategoria).catch(() => {});
    setPagina(1);
  }, [soloSinCategoria, cargarMovimientos]);

  const totalPaginasMovimientos = Math.max(1, Math.ceil(movimientos.length / PAGE_SIZE));
  const movimientosPaginados = useMemo(
    () => movimientos.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE),
    [movimientos, pagina]
  );

  const opcionesCategoria = form.tipo === "EGRESO" ? categoriasGasto : categoriasIngreso;

  const cambiarCategoriaMovimiento = async (id: string, categoria: string) => {
    setMovimientos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, categoria: categoria || null } : m))
    );
    try {
      const res = await fetch(`/api/movimientos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoria: categoria || null }),
      });
      if (!res.ok) throw new Error();
    } catch {
      alert("No se pudo actualizar la categoría");
      cargarMovimientos(soloSinCategoria);
    }
  };

  const saldoDe = (nombre: string) =>
    cuentas.find((c) => c.nombre === nombre)?.saldo || 0;

  const totalGeneral = cuentas.reduce((sum, c) => sum + c.saldo, 0);

  const inmediato =
    saldoDe("Bancolombia") + saldoDe("Nequi") + saldoDe("Daviplata");
  const parcial = saldoDe("Mercado Pago") + saldoDe("Dropi") + saldoDe("Envia");
  const noDisponible = saldoDe("Lulo");

  const registrarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cuentaId || !form.monto || !form.categoria) return;
    setEnviando(true);
    try {
      const res = await fetch("/api/movimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setForm({ cuentaId: "", tipo: "INGRESO", monto: "", descripcion: "", categoria: "" });
      setFormAbierto(false);
      await cargar();
    } catch {
      alert("No se pudo registrar el movimiento");
    } finally {
      setEnviando(false);
    }
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
              <Wallet size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-ink2">Balance</h1>
              <p className="text-sm text-muted2">
                Saldo disponible por cada bolsillo del negocio
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted2">Saldo total</p>
            <p className="text-2xl font-semibold text-ink2">{fmt(totalGeneral)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="bg-greenSoft/60 border border-green/20 rounded-lg p-3">
            <p className="text-xs font-medium text-green">
              Saldo disponible <span className="text-green/70">(Inmediato)</span>
            </p>
            <p className="text-lg font-semibold text-ink2 mt-0.5">{fmt(inmediato)}</p>
          </div>
          <div className="bg-amberSoft/60 border border-amber2/20 rounded-lg p-3">
            <p className="text-xs font-medium text-amber2">
              Disponible parcial <span className="text-amber2/70">(1-2 días)</span>
            </p>
            <p className="text-lg font-semibold text-ink2 mt-0.5">{fmt(parcial)}</p>
          </div>
          <div className="bg-redSoft/60 border border-red/20 rounded-lg p-3">
            <p className="text-xs font-medium text-red">
              No disponible <span className="text-red/70">(Inversiones)</span>
            </p>
            <p className="text-lg font-semibold text-ink2 mt-0.5">{fmt(noDisponible)}</p>
          </div>
        </div>
        <button
          onClick={() => setFormAbierto((v) => !v)}
          className="flex items-center gap-2 bg-accent text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-accent/90 transition-colors mt-4"
        >
          <Plus size={16} /> Registrar ingreso / egreso
        </button>

        {formAbierto && (
          <form
            onSubmit={registrarMovimiento}
            className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4 border-t border-borderLight pt-4"
          >
            <div>
              <label className={labelCls}>Bolsillo</label>
              <select
                required
                value={form.cuentaId}
                onChange={(e) => setForm((f) => ({ ...f, cuentaId: e.target.value }))}
                className={inputCls}
              >
                <option value="">Selecciona...</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    tipo: e.target.value as "INGRESO" | "EGRESO",
                    categoria: "",
                  }))
                }
                className={inputCls}
              >
                <option value="INGRESO">Ingreso</option>
                <option value="EGRESO">Egreso</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Categoría</label>
              <select
                required
                value={form.categoria}
                onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                className={inputCls}
              >
                <option value="">Selecciona...</option>
                {opcionesCategoria.map((c) => (
                  <option key={c.id} value={c.valor}>
                    {c.valor}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Valor</label>
              <input
                required
                type="number"
                min="1"
                value={form.monto}
                onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
                className={inputCls}
                placeholder="100000"
              />
            </div>
            <div>
              <label className={labelCls}>Descripción (opcional)</label>
              <input
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                className={inputCls}
                placeholder="Motivo del movimiento"
              />
            </div>
            <div className="md:col-span-5">
              <button
                type="submit"
                disabled={enviando}
                className="bg-accent text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {enviando ? "Guardando…" : "Guardar movimiento"}
              </button>
            </div>
          </form>
        )}
      </div>

      {error && (
        <div className="bg-redSoft text-red text-sm p-4 rounded-md">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-muted2">Cargando balance…</p>
      ) : (
        <>
          {/* Bolsillos */}
          <div className="grid grid-cols-7 gap-2">
            {cuentas.map((c) => {
              const meta = ICONO_CUENTA[c.nombre] || {
                icon: Wallet,
                bg: "bg-accentSoft",
                fg: "text-accent",
                logo: "",
              };
              const Icon = meta.icon;
              const mostrarLogo = meta.logo && !logoFallido[c.nombre];
              return (
                <div
                  key={c.id}
                  className="bg-card border border-borderLight rounded-xl p-3 flex flex-col items-center text-center gap-1.5"
                >
                  <div
                    className={`w-8 h-8 rounded-lg ${
                      mostrarLogo ? "bg-paper" : `${meta.bg} ${meta.fg}`
                    } flex items-center justify-center shrink-0 overflow-hidden`}
                  >
                    {mostrarLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={meta.logo}
                        alt={c.nombre}
                        className="w-full h-full object-contain p-1"
                        onError={() =>
                          setLogoFallido((prev) => ({ ...prev, [c.nombre]: true }))
                        }
                      />
                    ) : (
                      <Icon size={16} />
                    )}
                  </div>
                  <div className="min-w-0 w-full">
                    <p className="text-[11px] font-medium text-ink2 truncate leading-tight">
                      {c.nombre}
                    </p>
                    <p className="text-xs font-semibold text-ink2 leading-tight">
                      {fmt(c.saldo)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Movimientos recientes */}
          <div className="bg-card border border-borderLight rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-borderLight flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-semibold text-ink2">Movimientos recientes</p>
              <button
                onClick={() => setSoloSinCategoria((v) => !v)}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                  soloSinCategoria
                    ? "bg-accent text-white"
                    : "bg-paper text-ink2 hover:bg-borderLight"
                }`}
              >
                {soloSinCategoria ? "Viendo solo sin categorizar" : "Ver sin categorizar"}
              </button>
            </div>
            {movimientos.length === 0 ? (
              <p className="text-sm text-muted2 p-5">
                {soloSinCategoria
                  ? "No hay movimientos sin categorizar."
                  : "Aún no hay movimientos registrados."}
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-paper text-left text-xs font-semibold text-muted2 uppercase tracking-wide">
                    <th className="px-5 py-3">Fecha</th>
                    <th className="px-5 py-3">Bolsillo</th>
                    <th className="px-5 py-3">Tipo</th>
                    <th className="px-5 py-3">Categoría</th>
                    <th className="px-5 py-3">Descripción</th>
                    <th className="px-5 py-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientosPaginados.map((m) => (
                    <tr key={m.id} className="border-t border-borderLight">
                      <td className="px-5 py-3 text-muted2">{fmtFechaHora(m.creadoEn)}</td>
                      <td className="px-5 py-3 text-ink2">{m.cuenta.nombre}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`flex items-center gap-1 text-xs font-medium ${
                            m.tipo === "INGRESO" ? "text-green" : "text-red"
                          }`}
                        >
                          {m.tipo === "INGRESO" ? (
                            <ArrowUpCircle size={14} />
                          ) : (
                            <ArrowDownCircle size={14} />
                          )}
                          {m.tipo === "INGRESO" ? "Ingreso" : "Egreso"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={m.categoria || ""}
                          onChange={(e) => cambiarCategoriaMovimiento(m.id, e.target.value)}
                          className={`text-sm rounded-md px-3 py-2 border bg-white text-ink2 focus:outline-none focus:ring-1 focus:ring-accent ${
                            m.categoria
                              ? "border-borderLight"
                              : "border-red/30 bg-redSoft text-red"
                          }`}
                        >
                          <option value="">Sin categorizar</option>
                          {(m.tipo === "EGRESO" ? categoriasGasto : categoriasIngreso).map(
                            (c) => (
                              <option key={c.id} value={c.valor}>
                                {c.valor}
                              </option>
                            )
                          )}
                        </select>
                      </td>
                      <td className="px-5 py-3 text-muted2">
                        {m.descripcion || "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-ink2">
                        {m.tipo === "EGRESO" ? "-" : ""}
                        {fmt(m.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Pagination
              page={pagina}
              totalPages={totalPaginasMovimientos}
              total={movimientos.length}
              onChange={setPagina}
            />
          </div>
        </>
      )}
    </main>
  );
}
