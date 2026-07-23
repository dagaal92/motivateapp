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
} from "lucide-react";
import PedidosPorMesChart from "@/components/PedidosPorMesChart";

type Datos = {
  anio: number;
  mes: number | null;
  totalPedidos: number;
  totalVentas: number;
  ventasEntregados: number;
  pedidosEntregados: number;
  pedidosPendientes: number;
  totalFletes: number;
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tarjetas.map((t) => (
              <div
                key={t.label}
                className="bg-card border border-borderLight rounded-xl p-5"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg ${t.bg} ${t.fg} flex items-center justify-center shrink-0`}
                  >
                    <t.icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted2">{t.label}</p>
                    <p className="text-2xl font-semibold text-ink2 mt-0.5 truncate">
                      {t.valor}
                    </p>
                    {t.sub && <p className="text-[11px] text-muted2 mt-0.5">{t.sub}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {serieError && (
        <div className="bg-redSoft text-red text-sm p-4 rounded-md">{serieError}</div>
      )}
      {serie && <PedidosPorMesChart datos={serie} mesSeleccionado={mes} />}
    </main>
  );
}
