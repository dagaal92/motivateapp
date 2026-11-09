"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  DollarSign,
  CheckCircle2,
  PackageCheck,
  Clock,
  Truck,
  RotateCcw,
  AlertTriangle,
  Landmark,
  Receipt,
  ListChecks,
  TrendingDown,
} from "lucide-react";
import PedidosPorMesChart from "@/components/PedidosPorMesChart";
import DevolucionesPendientesModal from "@/components/DevolucionesPendientesModal";
import PorCobrarFinanciacionModal from "@/components/PorCobrarFinanciacionModal";
import GastosCategoriaModal from "@/components/GastosCategoriaModal";

type Datos = {
  anio: number;
  mes: number | null;
  totalPedidos: number;
  totalVentas: number;
  ventasEntregados: number;
  pedidosEntregados: number;
  pedidosPendientes: number;
  totalFletes: number;
  totalDevoluciones: number;
  devolucionesPendientes: number;
  totalPorCobrarFinanciacion: number;
  cantidadPorCobrarFinanciacion: number;
};

type GastoCategoria = { categoria: string; total: number; cantidad: number };

type GastosDatos = {
  totalGastos: number;
  cantidadMovimientos: number;
  categorias: GastoCategoria[];
};

type PuntoMes = { mes: number; totalPedidos: number };

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

const fmtNum = (n: number) => n.toLocaleString("es-CO");

export default function DashboardPage() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState<number | null>(hoy.getMonth() + 1);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serie, setSerie] = useState<PuntoMes[] | null>(null);
  const [serieError, setSerieError] = useState<string | null>(null);
  const [mostrarDevolucionesPendientes, setMostrarDevolucionesPendientes] = useState(false);
  const [mostrarPorCobrarFinanciacion, setMostrarPorCobrarFinanciacion] = useState(false);
  const [gastos, setGastos] = useState<GastosDatos | null>(null);
  const [gastosError, setGastosError] = useState<string | null>(null);
  const [categoriaGastoSeleccionada, setCategoriaGastoSeleccionada] = useState<string | null>(
    null
  );

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ anio: String(anio) });
      if (mes) params.set("mes", String(mes));
      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (!res.ok) throw new Error();
      setDatos(await res.json());
      setError(null);
    } catch {
      setError("No se pudo cargar el dashboard. Revisa tu conexión a la base de datos.");
    } finally {
      setLoading(false);
    }
  }, [anio, mes]);

  const cargarGastos = useCallback(async () => {
    try {
      const params = new URLSearchParams({ anio: String(anio) });
      if (mes) params.set("mes", String(mes));
      const res = await fetch(`/api/dashboard/gastos?${params.toString()}`);
      if (!res.ok) throw new Error();
      setGastos(await res.json());
      setGastosError(null);
    } catch {
      setGastosError("No se pudieron cargar los gastos del periodo.");
    }
  }, [anio, mes]);

  const cargarSerie = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/serie?anio=${anio}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSerie(data.meses);
      setSerieError(null);
    } catch {
      setSerieError("No se pudo cargar el gráfico mensual.");
    }
  }, [anio]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    cargarGastos();
  }, [cargarGastos]);

  useEffect(() => {
    cargarSerie();
  }, [cargarSerie]);

  const cambiarMes = (delta: number) => {
    if (mes === null) return;
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

  const tarjetas = datos
    ? [
        {
          label: "Total pedidos",
          valor: fmtNum(datos.totalPedidos),
          icon: ShoppingCart,
          bg: "bg-accentSoft",
          fg: "text-accent",
        },
        {
          label: "Total ventas",
          valor: fmt(datos.totalVentas),
          sub: "No incluye cancelados",
          icon: DollarSign,
          bg: "bg-greenSoft",
          fg: "text-green",
        },
        {
          label: "Ventas de pedidos entregados",
          valor: fmt(datos.ventasEntregados),
          icon: CheckCircle2,
          bg: "bg-tealSoft",
          fg: "text-teal",
        },
        {
          label: "Pedidos entregados",
          valor: fmtNum(datos.pedidosEntregados),
          icon: PackageCheck,
          bg: "bg-purpleSoft",
          fg: "text-purple",
        },
        {
          label: "Pedidos pendientes",
          valor: fmtNum(datos.pedidosPendientes),
          sub: "Pendiente + Confirmado + En camino",
          icon: Clock,
          bg: "bg-amberSoft",
          fg: "text-amber2",
        },
        {
          label: "Valor total de fletes",
          valor: fmt(datos.totalFletes),
          icon: Truck,
          bg: "bg-orangeSoft",
          fg: "text-orange",
        },
      ]
    : [];

  const tarjetasDevoluciones = datos
    ? [
        {
          label: "Total devoluciones",
          valor: fmtNum(datos.totalDevoluciones),
          sub: "Pedidos con estado \"Devuelto\" en el periodo",
          icon: RotateCcw,
          bg: "bg-redSoft",
          fg: "text-red",
        },
        {
          label: "Pendientes por llegar",
          valor: fmtNum(datos.devolucionesPendientes),
          sub: "De cualquier mes — clic para ver el detalle",
          icon: AlertTriangle,
          bg: "bg-amberSoft",
          fg: "text-amber2",
          onClick: () => setMostrarDevolucionesPendientes(true),
        },
      ]
    : [];

  const tarjetasFinanciacion = datos
    ? [
        {
          label: "Por cobrar (financiación)",
          valor: fmt(datos.totalPorCobrarFinanciacion),
          sub: `${fmtNum(datos.cantidadPorCobrarFinanciacion)} pedido(s) con Addi/Sistecrédito — clic para ver el detalle`,
          icon: Landmark,
          bg: "bg-purpleSoft",
          fg: "text-purple",
          onClick: () => setMostrarPorCobrarFinanciacion(true),
        },
      ]
    : [];

  const categoriaTop = gastos && gastos.categorias.length > 0 ? gastos.categorias[0] : null;

  const tarjetasGastos = gastos
    ? [
        {
          label: "Total gastado",
          valor: fmt(gastos.totalGastos),
          sub: "No incluye transferencias entre cuentas",
          icon: Receipt,
          bg: "bg-orangeSoft",
          fg: "text-orange",
        },
        {
          label: "Movimientos de gasto",
          valor: fmtNum(gastos.cantidadMovimientos),
          icon: ListChecks,
          bg: "bg-accentSoft",
          fg: "text-accent",
        },
        {
          label: "Categoría más alta",
          valor: categoriaTop ? categoriaTop.categoria : "—",
          sub: categoriaTop
            ? `${fmt(categoriaTop.total)} · ${Math.round(
                (categoriaTop.total / gastos.totalGastos) * 100
              )}% del total`
            : undefined,
          icon: TrendingDown,
          bg: "bg-orangeSoft",
          fg: "text-orange",
        },
      ]
    : [];

  const maxGasto = gastos && gastos.categorias.length > 0 ? gastos.categorias[0].total : 0;

  return (
    <main className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="bg-card border border-borderLight rounded-xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accentSoft text-accent flex items-center justify-center">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-ink2">Dashboard</h1>
              <p className="text-sm text-muted2">
                Resumen de pedidos y ventas del periodo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center bg-paper rounded-md p-1">
              <button
                onClick={() => setMes(hoy.getMonth() + 1)}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                  mes !== null ? "bg-accent text-white" : "text-ink2 hover:bg-borderLight"
                }`}
              >
                Por mes
              </button>
              <button
                onClick={() => setMes(null)}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                  mes === null ? "bg-accent text-white" : "text-ink2 hover:bg-borderLight"
                }`}
              >
                Todo el año
              </button>
            </div>

            {mes !== null ? (
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
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAnio((a) => a - 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-paper text-ink2"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-medium text-ink2 w-20 text-center">{anio}</span>
                <button
                  onClick={() => setAnio((a) => a + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-paper text-ink2"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-redSoft text-red text-sm p-4 rounded-md">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-muted2">Cargando dashboard…</p>
      ) : (
        datos && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {tarjetas.map((t) => (
                <div
                  key={t.label}
                  className="bg-card border border-borderLight rounded-xl p-3 sm:p-5"
                >
                  <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${t.bg} ${t.fg} flex items-center justify-center shrink-0`}
                    >
                      <t.icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] sm:text-xs font-medium text-muted2 leading-tight">
                        {t.label}
                      </p>
                      <p className="text-lg sm:text-2xl font-semibold text-ink2 mt-0.5 truncate">
                        {t.valor}
                      </p>
                      {t.sub && (
                        <p className="text-[10px] sm:text-[11px] text-muted2 mt-0.5 leading-tight">
                          {t.sub}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted2">
                Devoluciones
              </span>
              <div className="flex-1 h-px bg-borderLight" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {tarjetasDevoluciones.map((t) => (
                <div
                  key={t.label}
                  onClick={t.onClick}
                  role={t.onClick ? "button" : undefined}
                  tabIndex={t.onClick ? 0 : undefined}
                  className={`bg-card border border-borderLight rounded-xl p-3 sm:p-5 ${
                    t.onClick ? "cursor-pointer hover:border-amber2 transition-colors" : ""
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${t.bg} ${t.fg} flex items-center justify-center shrink-0`}
                    >
                      <t.icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] sm:text-xs font-medium text-muted2 leading-tight">
                        {t.label}
                      </p>
                      <p className="text-lg sm:text-2xl font-semibold text-ink2 mt-0.5 truncate">
                        {t.valor}
                      </p>
                      {t.sub && (
                        <p className="text-[10px] sm:text-[11px] text-muted2 mt-0.5 leading-tight">
                          {t.sub}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted2">
                Financiación diferida
              </span>
              <div className="flex-1 h-px bg-borderLight" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {tarjetasFinanciacion.map((t) => (
                <div
                  key={t.label}
                  onClick={t.onClick}
                  role="button"
                  tabIndex={0}
                  className="bg-card border border-borderLight rounded-xl p-3 sm:p-5 cursor-pointer hover:border-purple transition-colors"
                >
                  <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${t.bg} ${t.fg} flex items-center justify-center shrink-0`}
                    >
                      <t.icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] sm:text-xs font-medium text-muted2 leading-tight">
                        {t.label}
                      </p>
                      <p className="text-lg sm:text-2xl font-semibold text-ink2 mt-0.5 truncate">
                        {t.valor}
                      </p>
                      {t.sub && (
                        <p className="text-[10px] sm:text-[11px] text-muted2 mt-0.5 leading-tight">
                          {t.sub}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )
      )}

      {gastosError && (
        <div className="bg-redSoft text-red text-sm p-4 rounded-md">{gastosError}</div>
      )}

      {gastos && (
        <>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted2">
              Gastos
            </span>
            <div className="flex-1 h-px bg-borderLight" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {tarjetasGastos.map((t) => (
              <div
                key={t.label}
                className="bg-card border border-borderLight rounded-xl p-3 sm:p-5"
              >
                <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${t.bg} ${t.fg} flex items-center justify-center shrink-0`}
                  >
                    <t.icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] sm:text-xs font-medium text-muted2 leading-tight">
                      {t.label}
                    </p>
                    <p className="text-lg sm:text-2xl font-semibold text-ink2 mt-0.5 truncate">
                      {t.valor}
                    </p>
                    {t.sub && (
                      <p className="text-[10px] sm:text-[11px] text-muted2 mt-0.5 leading-tight">
                        {t.sub}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card border border-borderLight rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-borderLight">
              <p className="text-sm font-semibold text-ink2">Gastos por categoría</p>
              <p className="text-xs text-muted2">
                Clic en una categoría para ver los movimientos que la componen
              </p>
            </div>
            {gastos.categorias.length === 0 ? (
              <p className="text-sm text-muted2 p-5">
                No hay gastos registrados en este periodo.
              </p>
            ) : (
              <div>
                {gastos.categorias.map((cat) => {
                  const pct = maxGasto > 0 ? Math.round((cat.total / maxGasto) * 100) : 0;
                  const pctTotal =
                    gastos.totalGastos > 0
                      ? Math.round((cat.total / gastos.totalGastos) * 100)
                      : 0;
                  return (
                    <button
                      key={cat.categoria}
                      onClick={() => setCategoriaGastoSeleccionada(cat.categoria)}
                      className="w-full flex items-center gap-4 px-5 py-3.5 border-t border-borderLight first:border-t-0 hover:bg-paper transition-colors text-left"
                    >
                      <div className="w-32 sm:w-44 shrink-0 text-xs sm:text-sm font-medium text-ink2 truncate">
                        {cat.categoria}
                      </div>
                      <div className="flex-1 min-w-0 h-2 bg-paper rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-orange"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-10 shrink-0 text-right text-xs text-muted2">
                        {pctTotal}%
                      </div>
                      <div className="w-24 sm:w-28 shrink-0 text-right text-xs sm:text-sm font-semibold text-ink2">
                        {fmt(cat.total)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {serieError && (
        <div className="bg-redSoft text-red text-sm p-4 rounded-md">{serieError}</div>
      )}
      {serie && <PedidosPorMesChart datos={serie} mesSeleccionado={mes} />}

      <DevolucionesPendientesModal
        abierto={mostrarDevolucionesPendientes}
        onClose={() => setMostrarDevolucionesPendientes(false)}
      />
      <PorCobrarFinanciacionModal
        abierto={mostrarPorCobrarFinanciacion}
        onClose={() => setMostrarPorCobrarFinanciacion(false)}
      />
      <GastosCategoriaModal
        categoria={categoriaGastoSeleccionada}
        anio={anio}
        mes={mes}
        onClose={() => setCategoriaGastoSeleccionada(null)}
      />
    </main>
  );
}
