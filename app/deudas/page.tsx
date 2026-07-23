"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Landmark,
  Plus,
  Pencil,
  Trash2,
  History,
  CircleDollarSign,
  CalendarClock,
  AlertTriangle,
} from "lucide-react";

type Cuenta = { id: string; nombre: string };

type PagoDeuda = {
  id: string;
  monto: number;
  fecha: string;
  cuenta: { nombre: string };
};

type Deuda = {
  id: string;
  nombre: string;
  entidad: string | null;
  montoTotal: number;
  saldoPendiente: number;
  cuotaMensual: number | null;
  diaPago: number;
  estado: "ACTIVA" | "PAGADA";
  notas: string | null;
  cuenta: { id: string; nombre: string } | null;
  pagos: PagoDeuda[]; // pagos del mes en curso (filtrado por el backend)
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });

function diasHasta(diaPago: number, hoy: Date) {
  const objetivo = new Date(hoy.getFullYear(), hoy.getMonth(), diaPago);
  const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((objetivo.getTime() - hoySinHora.getTime()) / 86400000);
}

type Tono = "danger" | "warning" | "success" | "neutral";

function estadoCiclo(deuda: Deuda, hoy: Date) {
  if (deuda.estado === "PAGADA") {
    return { key: "liquidada", label: "Liquidada", tono: "success" as Tono, prioridad: 4, dias: 0 };
  }
  if (deuda.pagos.length > 0) {
    return { key: "pagada", label: "Pagada este mes", tono: "success" as Tono, prioridad: 3, dias: 0 };
  }
  const dias = diasHasta(deuda.diaPago, hoy);
  if (dias < 0) {
    const atraso = Math.abs(dias);
    return {
      key: "vencida",
      label: `Vencida · ${atraso} día${atraso === 1 ? "" : "s"}`,
      tono: "danger" as Tono,
      prioridad: 0,
      dias,
    };
  }
  if (dias <= 5) {
    return {
      key: "proxima",
      label: dias === 0 ? "Vence hoy" : `Próxima · en ${dias} día${dias === 1 ? "" : "s"}`,
      tono: "warning" as Tono,
      prioridad: 1,
      dias,
    };
  }
  return { key: "aldia", label: `En ${dias} días`, tono: "neutral" as Tono, prioridad: 2, dias };
}

const TONO_CLS: Record<Tono, string> = {
  danger: "bg-redSoft text-red",
  warning: "bg-amberSoft text-amber2",
  success: "bg-greenSoft text-green",
  neutral: "bg-accentSoft text-accent",
};

const FORM_VACIO = {
  nombre: "",
  entidad: "",
  montoTotal: "",
  saldoPendiente: "",
  cuotaMensual: "",
  diaPago: "",
  cuentaId: "",
  notas: "",
};

export default function DeudasPage() {
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formAbierto, setFormAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  const [pagoDeuda, setPagoDeuda] = useState<Deuda | null>(null);
  const [pagoForm, setPagoForm] = useState({ cuentaId: "", monto: "" });
  const [registrandoPago, setRegistrandoPago] = useState(false);

  const [historialDeuda, setHistorialDeuda] = useState<Deuda | null>(null);
  const [historial, setHistorial] = useState<PagoDeuda[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const hoy = useMemo(() => new Date(), []);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [resDeudas, resCuentas] = await Promise.all([
        fetch("/api/deudas"),
        fetch("/api/cuentas"),
      ]);
      if (!resDeudas.ok || !resCuentas.ok) throw new Error();
      setDeudas(await resDeudas.json());
      setCuentas(await resCuentas.json());
      setError(null);
    } catch {
      setError("No se pudieron cargar las deudas. Revisa tu conexión a la base de datos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const activas = useMemo(() => deudas.filter((d) => d.estado === "ACTIVA"), [deudas]);

  const totalDeuda = activas.reduce((sum, d) => sum + d.saldoPendiente, 0);

  const cuotasDelMes = activas.filter((d) => d.cuotaMensual !== null);
  const totalCuotasMes = cuotasDelMes.reduce((sum, d) => sum + (d.cuotaMensual || 0), 0);
  const pagadoEsteMes = cuotasDelMes
    .filter((d) => d.pagos.length > 0)
    .reduce((sum, d) => sum + (d.cuotaMensual || 0), 0);
  const faltaEsteMes = totalCuotasMes - pagadoEsteMes;
  const sinCuotaDefinida = activas.length - cuotasDelMes.length;

  const timeline = useMemo(() => {
    return activas
      .map((d) => ({ deuda: d, ciclo: estadoCiclo(d, hoy) }))
      .sort((a, b) => a.ciclo.prioridad - b.ciclo.prioridad || a.ciclo.dias - b.ciclo.dias);
  }, [activas, hoy]);

  const vencidas = timeline.filter((t) => t.ciclo.key === "vencida").length;
  const proximas = timeline.filter((t) => t.ciclo.key === "proxima").length;
  const proximoSinAtraso = timeline.find((t) => t.ciclo.key === "proxima" || t.ciclo.key === "aldia");

  const inputCls =
    "w-full bg-white border border-borderLight rounded-md px-3 py-2 text-sm text-ink2 placeholder:text-muted2 focus:outline-none focus:ring-1 focus:ring-accent";
  const labelCls = "text-xs font-medium text-muted2 mb-1 block";

  const abrirNueva = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setFormAbierto(true);
  };

  const abrirEditar = (d: Deuda) => {
    setEditandoId(d.id);
    setForm({
      nombre: d.nombre,
      entidad: d.entidad || "",
      montoTotal: String(d.montoTotal),
      saldoPendiente: String(d.saldoPendiente),
      cuotaMensual: d.cuotaMensual !== null ? String(d.cuotaMensual) : "",
      diaPago: String(d.diaPago),
      cuentaId: d.cuenta?.id || "",
      notas: d.notas || "",
    });
    setFormAbierto(true);
  };

  const guardarDeuda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.montoTotal || !form.diaPago) return;
    setGuardando(true);
    try {
      const url = editandoId ? `/api/deudas/${editandoId}` : "/api/deudas";
      const res = await fetch(url, {
        method: editandoId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setForm(FORM_VACIO);
      setFormAbierto(false);
      setEditandoId(null);
      await cargar();
    } catch {
      alert("No se pudo guardar la deuda");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarDeuda = async (d: Deuda) => {
    if (!confirm(`¿Eliminar "${d.nombre}"? Esto no afecta los movimientos ya registrados en las billeteras.`))
      return;
    setDeudas((prev) => prev.filter((x) => x.id !== d.id));
    await fetch(`/api/deudas/${d.id}`, { method: "DELETE" });
  };

  const abrirPago = (d: Deuda) => {
    setPagoDeuda(d);
    setPagoForm({
      cuentaId: d.cuenta?.id || "",
      monto: d.cuotaMensual !== null ? String(d.cuotaMensual) : "",
    });
  };

  const registrarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pagoDeuda || !pagoForm.cuentaId || !pagoForm.monto) return;
    setRegistrandoPago(true);
    try {
      const res = await fetch(`/api/deudas/${pagoDeuda.id}/pagos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pagoForm),
      });
      if (!res.ok) throw new Error();
      setPagoDeuda(null);
      await cargar();
    } catch {
      alert("No se pudo registrar el pago");
    } finally {
      setRegistrandoPago(false);
    }
  };

  const abrirHistorial = async (d: Deuda) => {
    setHistorialDeuda(d);
    setCargandoHistorial(true);
    try {
      const res = await fetch(`/api/deudas/${d.id}/pagos`);
      setHistorial(res.ok ? await res.json() : []);
    } finally {
      setCargandoHistorial(false);
    }
  };

  return (
    <main className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5">
      {/* Encabezado */}
      <div className="bg-card border border-borderLight rounded-xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amberSoft text-amber2 flex items-center justify-center">
              <Landmark size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-ink2">Deudas</h1>
              <p className="text-sm text-muted2">
                Seguimiento de créditos y su relación con las billeteras al pagar cada cuota
              </p>
            </div>
          </div>
          <button
            onClick={abrirNueva}
            className="flex items-center gap-2 bg-accent text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-accent/90 transition-colors"
          >
            <Plus size={16} /> Nueva deuda
          </button>
        </div>

        {formAbierto && (
          <form
            onSubmit={guardarDeuda}
            className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 border-t border-borderLight pt-4"
          >
            <div>
              <label className={labelCls}>Nombre</label>
              <input
                required
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                className={inputCls}
                placeholder="Tarjeta Bancolombia"
              />
            </div>
            <div>
              <label className={labelCls}>Entidad (opcional)</label>
              <input
                value={form.entidad}
                onChange={(e) => setForm((f) => ({ ...f, entidad: e.target.value }))}
                className={inputCls}
                placeholder="Bancolombia"
              />
            </div>
            <div>
              <label className={labelCls}>Billetera asociada (opcional)</label>
              <select
                value={form.cuentaId}
                onChange={(e) => setForm((f) => ({ ...f, cuentaId: e.target.value }))}
                className={inputCls}
              >
                <option value="">Sin asignar</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Día de pago</label>
              <input
                required
                type="number"
                min="1"
                max="31"
                value={form.diaPago}
                onChange={(e) => setForm((f) => ({ ...f, diaPago: e.target.value }))}
                className={inputCls}
                placeholder="22"
              />
            </div>
            <div>
              <label className={labelCls}>Valor total a pagar</label>
              <input
                required
                type="number"
                min="0"
                value={form.montoTotal}
                onChange={(e) => setForm((f) => ({ ...f, montoTotal: e.target.value }))}
                className={inputCls}
                placeholder="1258940"
              />
            </div>
            <div>
              <label className={labelCls}>Saldo pendiente</label>
              <input
                type="number"
                min="0"
                value={form.saldoPendiente}
                onChange={(e) => setForm((f) => ({ ...f, saldoPendiente: e.target.value }))}
                className={inputCls}
                placeholder="Igual al total si está vacío"
              />
            </div>
            <div>
              <label className={labelCls}>Cuota mensual (opcional)</label>
              <input
                type="number"
                min="0"
                value={form.cuotaMensual}
                onChange={(e) => setForm((f) => ({ ...f, cuotaMensual: e.target.value }))}
                className={inputCls}
                placeholder="255147"
              />
            </div>
            <div>
              <label className={labelCls}>Notas (opcional)</label>
              <input
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                className={inputCls}
                placeholder="Tasa, plazo, seguros..."
              />
            </div>
            <div className="md:col-span-4 flex gap-2">
              <button
                type="submit"
                disabled={guardando}
                className="bg-accent text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {guardando ? "Guardando…" : editandoId ? "Guardar cambios" : "Guardar deuda"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormAbierto(false);
                  setEditandoId(null);
                }}
                className="bg-paper text-ink2 text-sm font-medium px-5 py-2 rounded-md hover:bg-borderLight transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {error && <div className="bg-redSoft text-red text-sm p-4 rounded-md">{error}</div>}

      {loading ? (
        <p className="text-sm text-muted2">Cargando deudas…</p>
      ) : (
        <>
          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-card border border-borderLight rounded-xl p-4">
              <p className="text-xs font-medium text-muted2 uppercase tracking-wide">Total en deudas</p>
              <p className="text-2xl font-semibold text-ink2 mt-1">{fmt(totalDeuda)}</p>
              <p className="text-xs text-muted2 mt-1.5">
                {activas.length} deuda{activas.length === 1 ? "" : "s"} activa
                {activas.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="bg-card border border-borderLight rounded-xl p-4">
              <p className="text-xs font-medium text-muted2 uppercase tracking-wide">
                Falta por pagar este mes
              </p>
              <p className="text-2xl font-semibold text-ink2 mt-1">{fmt(faltaEsteMes)}</p>
              <p className="text-xs text-muted2 mt-1.5">
                de {fmt(totalCuotasMes)} en cuotas
                {pagadoEsteMes > 0 && <> · {fmt(pagadoEsteMes)} ya pagados</>}
                {sinCuotaDefinida > 0 && (
                  <> · {sinCuotaDefinida} sin cuota definida</>
                )}
              </p>
            </div>
            <div className="bg-card border border-borderLight rounded-xl p-4">
              <p className="text-xs font-medium text-muted2 uppercase tracking-wide">Alertas</p>
              <div className="flex gap-2 mt-1.5">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TONO_CLS.danger}`}>
                  {vencidas} vencida{vencidas === 1 ? "" : "s"}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TONO_CLS.warning}`}>
                  {proximas} próxima{proximas === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-xs text-muted2 mt-1.5">
                {proximoSinAtraso
                  ? `Próximo vencimiento: día ${proximoSinAtraso.deuda.diaPago} · ${proximoSinAtraso.deuda.nombre}`
                  : "Sin vencimientos próximos"}
              </p>
            </div>
          </div>

          {/* Línea de tiempo */}
          {timeline.length > 0 && (
            <div className="bg-card border border-borderLight rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-borderLight flex items-center gap-2">
                <CalendarClock size={16} className="text-muted2" />
                <p className="text-sm font-semibold text-ink2">Línea de tiempo de pagos</p>
              </div>
              <div>
                {timeline.map(({ deuda: d, ciclo }) => (
                  <div
                    key={d.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-3 border-t border-borderLight first:border-t-0"
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        ciclo.tono === "danger"
                          ? "bg-red"
                          : ciclo.tono === "warning"
                          ? "bg-amber2"
                          : ciclo.tono === "success"
                          ? "bg-green"
                          : "bg-accent"
                      }`}
                    />
                    <div className="flex-1 min-w-[160px]">
                      <p className="text-sm font-medium text-ink2">{d.nombre}</p>
                      <p className="text-xs text-muted2">
                        Día {d.diaPago} {d.cuenta ? `· ${d.cuenta.nombre}` : ""}
                      </p>
                    </div>
                    {d.cuotaMensual !== null && (
                      <span className="text-sm font-semibold text-ink2">{fmt(d.cuotaMensual)}</span>
                    )}
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TONO_CLS[ciclo.tono]}`}>
                      {ciclo.label}
                    </span>
                    {ciclo.key !== "pagada" && ciclo.key !== "liquidada" && (
                      <button
                        onClick={() => abrirPago(d)}
                        className="text-xs font-semibold text-accent hover:underline"
                      >
                        Registrar pago
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabla de deudas */}
          <div className="bg-card border border-borderLight rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-borderLight">
              <p className="text-sm font-semibold text-ink2">Todas las deudas</p>
            </div>
            {deudas.length === 0 ? (
              <p className="text-sm text-muted2 p-5">
                Aún no hay deudas registradas. Agrega la primera con &quot;Nueva deuda&quot;.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-paper text-left text-xs font-semibold text-muted2 uppercase tracking-wide">
                      <th className="px-5 py-3">Deuda</th>
                      <th className="px-5 py-3">Billetera</th>
                      <th className="px-5 py-3">Progreso pagado</th>
                      <th className="px-5 py-3 text-right">Pendiente</th>
                      <th className="px-5 py-3 text-right">Cuota</th>
                      <th className="px-5 py-3">Día</th>
                      <th className="px-5 py-3">Estado</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {deudas.map((d) => {
                      const pct =
                        d.montoTotal > 0
                          ? Math.min(100, Math.max(0, Math.round(((d.montoTotal - d.saldoPendiente) / d.montoTotal) * 100)))
                          : 0;
                      const ciclo = estadoCiclo(d, hoy);
                      return (
                        <tr key={d.id} className="border-t border-borderLight">
                          <td className="px-5 py-3">
                            <p className="font-medium text-ink2">{d.nombre}</p>
                            {d.entidad && <p className="text-xs text-muted2">{d.entidad}</p>}
                          </td>
                          <td className="px-5 py-3 text-ink2">{d.cuenta?.nombre || "—"}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-28 h-1.5 rounded-full bg-paper overflow-hidden">
                                <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-muted2 w-9">{pct}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right font-medium text-ink2">
                            {fmt(d.saldoPendiente)}
                          </td>
                          <td className="px-5 py-3 text-right text-ink2">
                            {d.cuotaMensual !== null ? fmt(d.cuotaMensual) : "—"}
                          </td>
                          <td className="px-5 py-3 text-ink2">{d.diaPago}</td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TONO_CLS[ciclo.tono]}`}>
                              {ciclo.label}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {d.estado === "ACTIVA" && (
                                <button
                                  onClick={() => abrirPago(d)}
                                  title="Registrar pago"
                                  className="w-8 h-8 flex items-center justify-center rounded-md text-muted2 hover:bg-greenSoft hover:text-green transition-colors"
                                >
                                  <CircleDollarSign size={15} />
                                </button>
                              )}
                              <button
                                onClick={() => abrirHistorial(d)}
                                title="Ver pagos"
                                className="w-8 h-8 flex items-center justify-center rounded-md text-muted2 hover:bg-accentSoft hover:text-accent transition-colors"
                              >
                                <History size={15} />
                              </button>
                              <button
                                onClick={() => abrirEditar(d)}
                                title="Editar"
                                className="w-8 h-8 flex items-center justify-center rounded-md text-muted2 hover:bg-paper hover:text-ink2 transition-colors"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => eliminarDeuda(d)}
                                title="Eliminar"
                                className="w-8 h-8 flex items-center justify-center rounded-md text-muted2 hover:bg-redSoft hover:text-red transition-colors"
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
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal: registrar pago */}
      {pagoDeuda && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setPagoDeuda(null)}
        >
          <div
            className="bg-white rounded-xl p-5 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-ink2 mb-1">Registrar pago</h2>
            <p className="text-sm text-muted2 mb-4">{pagoDeuda.nombre}</p>
            <form onSubmit={registrarPago} className="space-y-3">
              <div>
                <label className={labelCls}>Billetera de la que sale el pago</label>
                <select
                  required
                  value={pagoForm.cuentaId}
                  onChange={(e) => setPagoForm((f) => ({ ...f, cuentaId: e.target.value }))}
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
                <label className={labelCls}>Valor del pago</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={pagoForm.monto}
                  onChange={(e) => setPagoForm((f) => ({ ...f, monto: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <p className="text-xs text-muted2">
                Saldo pendiente actual: {fmt(pagoDeuda.saldoPendiente)}
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={registrandoPago}
                  className="flex-1 bg-accent text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {registrandoPago ? "Registrando…" : "Registrar pago"}
                </button>
                <button
                  type="button"
                  onClick={() => setPagoDeuda(null)}
                  className="bg-paper text-ink2 text-sm font-medium px-4 py-2 rounded-md hover:bg-borderLight transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: historial de pagos */}
      {historialDeuda && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setHistorialDeuda(null)}
        >
          <div
            className="bg-white rounded-xl p-5 w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-ink2 mb-1">Historial de pagos</h2>
            <p className="text-sm text-muted2 mb-4">{historialDeuda.nombre}</p>
            {cargandoHistorial ? (
              <p className="text-sm text-muted2">Cargando…</p>
            ) : historial.length === 0 ? (
              <p className="text-sm text-muted2 flex items-center gap-2">
                <AlertTriangle size={14} /> Todavía no hay pagos registrados para esta deuda.
              </p>
            ) : (
              <div className="space-y-2">
                {historial.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-paper rounded-md px-3 py-2"
                  >
                    <div>
                      <p className="text-sm text-ink2">{fmtFecha(p.fecha)}</p>
                      <p className="text-xs text-muted2">{p.cuenta.nombre}</p>
                    </div>
                    <p className="text-sm font-semibold text-ink2">{fmt(p.monto)}</p>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setHistorialDeuda(null)}
              className="mt-4 w-full bg-paper text-ink2 text-sm font-medium px-4 py-2 rounded-md hover:bg-borderLight transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
