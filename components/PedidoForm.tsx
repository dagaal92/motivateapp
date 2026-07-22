"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, Plus, Trash2 } from "lucide-react";
import { CATEGORIAS_MAESTRAS } from "@/lib/categorias";
import { BILLETERAS_FLETE } from "@/lib/billeterasFlete";

type Opcion = { id: string; categoria: string; valor: string };
type Cuenta = { id: string; nombre: string; saldo: number };
type ProductoCatalogo = { id: string; nombre: string; variante: string | null; activo: boolean };

type ProductoLinea = {
  productoId: string | null;
  color: string;
  referencia: string;
  cantidad: string;
};
type FleteLinea = { valor: string; observacion: string };

const ESTADOS = ["PENDIENTE", "CONFIRMADO", "EN_CAMINO", "ENTREGADO", "CANCELADO"];
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  EN_CAMINO: "En camino",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

export default function PedidoForm({ pedidoId }: { pedidoId?: string }) {
  const router = useRouter();
  const esEdicion = Boolean(pedidoId);

  const [opciones, setOpciones] = useState<Record<string, Opcion[]>>({});
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [productosCatalogo, setProductosCatalogo] = useState<ProductoCatalogo[]>([]);
  const [cargandoPedido, setCargandoPedido] = useState(esEdicion);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    numeroOrden: "",
    telefono: "",
    cliente: "",
    fechaPedido: new Date().toISOString().slice(0, 10),
    prioridad: "",
    general: "",
    numeroGuia: "",
    transportadora: "",
    envio: "",
    estado: "PENDIENTE",
    valorTotal: "",
    ingresoDinero: "",
    departamento: "",
    municipio: "",
    direccion: "",
    notas: "",
    cuentaFleteId: "",
  });

  const [productos, setProductos] = useState<ProductoLinea[]>([]);
  const [fletes, setFletes] = useState<FleteLinea[]>([]);

  // Cargar todas las categorías de opciones maestras
  useEffect(() => {
    (async () => {
      const entradas = await Promise.all(
        CATEGORIAS_MAESTRAS.map(async (c) => {
          const res = await fetch(`/api/opciones?categoria=${c.key}`);
          const data = res.ok ? await res.json() : [];
          return [c.key, data] as const;
        })
      );
      setOpciones(Object.fromEntries(entradas));
    })();
  }, []);

  // Cargar las billeteras disponibles para descontar el flete
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/cuentas");
      if (!res.ok) return;
      const data: Cuenta[] = await res.json();
      setCuentas(data.filter((c) => (BILLETERAS_FLETE as readonly string[]).includes(c.nombre)));
    })();
  }, []);

  // Cargar el catálogo de inventario para elegir producto/variante
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/inventario");
      if (!res.ok) return;
      const data: ProductoCatalogo[] = await res.json();
      setProductosCatalogo(data.filter((p) => p.activo));
    })();
  }, []);

  // Si es edición, cargar el pedido existente
  useEffect(() => {
    if (!pedidoId) return;
    (async () => {
      setCargandoPedido(true);
      try {
        const res = await fetch(`/api/pedidos/${pedidoId}`);
        if (!res.ok) throw new Error();
        const p = await res.json();
        setForm({
          numeroOrden: p.numeroOrden || "",
          telefono: p.telefono || "",
          cliente: p.cliente || "",
          fechaPedido: new Date(p.creadoEn).toISOString().slice(0, 10),
          prioridad: p.prioridad || "",
          general: p.general || "",
          numeroGuia: p.numeroGuia || "",
          transportadora: p.transportadora || "",
          envio: p.envio || "",
          estado: p.estado || "PENDIENTE",
          valorTotal: p.valorTotal ? String(p.valorTotal) : "",
          ingresoDinero: p.ingresoDinero || "",
          departamento: p.departamento || "",
          municipio: p.municipio || "",
          direccion: p.direccion || "",
          notas: p.notas || "",
          cuentaFleteId: p.cuentaFleteId || "",
        });
        setProductos(
          (p.productos || []).map((pr: any) => ({
            productoId: pr.productoId || null,
            color: pr.color || "",
            referencia: pr.referencia || "",
            cantidad: String(pr.cantidad || 1),
          }))
        );
        setFletes(
          (p.fletes || []).map((f: any) => ({
            valor: String(f.valor || ""),
            observacion: f.observacion || "",
          }))
        );
        setError(null);
      } catch {
        setError("No se pudo cargar el pedido.");
      } finally {
        setCargandoPedido(false);
      }
    })();
  }, [pedidoId]);

  const totalFlete = useMemo(
    () => fletes.reduce((sum, f) => sum + (Number(f.valor) || 0), 0),
    [fletes]
  );

  const catalogoPorNombre = useMemo(() => {
    const mapa = new Map<string, ProductoCatalogo[]>();
    for (const pc of productosCatalogo) {
      const lista = mapa.get(pc.nombre) || [];
      lista.push(pc);
      mapa.set(pc.nombre, lista);
    }
    return mapa;
  }, [productosCatalogo]);

  const nombresCatalogo = useMemo(
    () => Array.from(catalogoPorNombre.keys()).sort(),
    [catalogoPorNombre]
  );

  const campo = (key: keyof typeof form) => (e: React.ChangeEvent<any>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const agregarProducto = () =>
    setProductos((p) => [...p, { productoId: null, color: "", referencia: "", cantidad: "1" }]);
  const quitarProducto = (i: number) =>
    setProductos((p) => p.filter((_, idx) => idx !== i));
  const actualizarProducto = (i: number, campo: keyof ProductoLinea, valor: string) =>
    setProductos((p) => p.map((pr, idx) => (idx === i ? { ...pr, [campo]: valor } : pr)));

  const agregarFlete = () => setFletes((f) => [...f, { valor: "", observacion: "" }]);
  const quitarFlete = (i: number) => setFletes((f) => f.filter((_, idx) => idx !== i));
  const actualizarFlete = (i: number, campo: keyof FleteLinea, valor: string) =>
    setFletes((f) => f.map((fl, idx) => (idx === i ? { ...fl, [campo]: valor } : fl)));

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.telefono) {
      setError("El número de celular es obligatorio.");
      return;
    }
    if (totalFlete > 0 && !form.cuentaFleteId) {
      setError("Selecciona de qué billetera sale el flete.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const payload = {
        ...form,
        creadoEn: new Date(form.fechaPedido).toISOString(),
        productos,
        fletes,
      };

      const res = await fetch(
        esEdicion ? `/api/pedidos/${pedidoId}` : "/api/pedidos",
        {
          method: esEdicion ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setEnviando(false);
    }
  };

  const inputCls =
    "w-full bg-white border border-borderLight rounded-md px-3 py-2 text-sm text-ink2 placeholder:text-muted2 focus:outline-none focus:ring-1 focus:ring-accent";
  const labelCls = "text-xs font-medium text-muted2 mb-1 block";

  const opcionesDe = (categoria: string) => opciones[categoria] || [];

  if (cargandoPedido) {
    return <main className="p-4 sm:p-6 max-w-[1200px] mx-auto text-sm text-muted2">Cargando pedido…</main>;
  }

  return (
    <main className="p-4 sm:p-6 max-w-[1200px] mx-auto space-y-5">
      <form onSubmit={guardar} className="space-y-5">
        {/* Encabezado */}
        <div className="bg-card border border-borderLight rounded-xl p-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-greenSoft text-green flex items-center justify-center">
                <ShoppingCart size={20} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-ink2">
                  {esEdicion ? "Editar Pedido" : "Nuevo Pedido"}
                </h1>
                <p className="text-sm text-muted2">
                  {esEdicion
                    ? "Modifica los datos del pedido seleccionado"
                    : "Completa los datos para crear un pedido"}
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="border border-borderLight text-ink2 text-sm font-medium px-4 py-2 rounded-md hover:bg-paper transition-colors"
            >
              Volver
            </Link>
          </div>
        </div>

        {/* Datos del pedido */}
        <div className="bg-card border border-borderLight rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Número de Orden</label>
            <input value={form.numeroOrden} onChange={campo("numeroOrden")} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Número de celular</label>
            <input required value={form.telefono} onChange={campo("telefono")} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Nombre del Cliente (Opcional)</label>
            <input value={form.cliente} onChange={campo("cliente")} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Fecha de Pedido</label>
            <input type="date" value={form.fechaPedido} onChange={campo("fechaPedido")} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Prioridad</label>
            <select value={form.prioridad} onChange={campo("prioridad")} className={inputCls}>
              <option value="">Seleccionar...</option>
              {opcionesDe("PRIORIDAD").map((o) => (
                <option key={o.id} value={o.valor}>{o.valor}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>General</label>
            <select value={form.general} onChange={campo("general")} className={inputCls}>
              <option value="">Seleccionar...</option>
              {opcionesDe("GENERAL").map((o) => (
                <option key={o.id} value={o.valor}>{o.valor}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Número de Guía</label>
            <input
              value={form.numeroGuia}
              onChange={campo("numeroGuia")}
              className={inputCls}
              placeholder="Ej: 034569874"
            />
          </div>
          <div>
            <label className={labelCls}>Transportadora</label>
            <select value={form.transportadora} onChange={campo("transportadora")} className={inputCls}>
              <option value="">Seleccionar...</option>
              {opcionesDe("TRANSPORTADORA").map((o) => (
                <option key={o.id} value={o.valor}>{o.valor}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Envío</label>
            <select value={form.envio} onChange={campo("envio")} className={inputCls}>
              <option value="">Seleccionar...</option>
              {opcionesDe("ENVIO").map((o) => (
                <option key={o.id} value={o.valor}>{o.valor}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Estado</label>
            <select value={form.estado} onChange={campo("estado")} className={inputCls}>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>{ESTADO_LABEL[e]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Valor Venta</label>
            <input
              type="number"
              min="0"
              value={form.valorTotal}
              onChange={campo("valorTotal")}
              className={inputCls}
              placeholder="0"
            />
          </div>
          <div>
            <label className={labelCls}>Ingreso Dinero</label>
            <select value={form.ingresoDinero} onChange={campo("ingresoDinero")} className={inputCls}>
              <option value="">Seleccionar...</option>
              {opcionesDe("INGRESO_DINERO").map((o) => (
                <option key={o.id} value={o.valor}>{o.valor}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Departamento</label>
            <select value={form.departamento} onChange={campo("departamento")} className={inputCls}>
              <option value="">Seleccionar...</option>
              {opcionesDe("DEPARTAMENTO").map((o) => (
                <option key={o.id} value={o.valor}>{o.valor}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Municipio</label>
            <select value={form.municipio} onChange={campo("municipio")} className={inputCls}>
              <option value="">Seleccionar...</option>
              {opcionesDe("MUNICIPIO").map((o) => (
                <option key={o.id} value={o.valor}>{o.valor}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Dirección</label>
            <input value={form.direccion} onChange={campo("direccion")} className={inputCls} />
          </div>
        </div>

        {/* Productos */}
        <div className="bg-card border border-borderLight rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-ink2">
              Productos{" "}
              <span className="text-xs font-normal text-muted2">
                (Opcional - para cancelaciones/devoluciones no agregar productos)
              </span>
            </p>
            <button
              type="button"
              onClick={agregarProducto}
              className="flex items-center gap-2 bg-accent text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-accent/90 transition-colors"
            >
              <Plus size={15} /> Agregar Producto
            </button>
          </div>

          {productos.length === 0 ? (
            <p className="text-sm text-muted2">No hay productos agregados.</p>
          ) : (
            <div className="space-y-3">
              {productos.map((p, i) => {
                // Se deriva de `referencia` (no de productoId): al elegir el
                // producto, productoId queda en null hasta que se elige la
                // variante, así que no puede ser la fuente de este valor.
                const nombreActual = nombresCatalogo.includes(p.referencia)
                  ? p.referencia
                  : "";
                const variantesDisponibles = nombreActual
                  ? catalogoPorNombre.get(nombreActual) || []
                  : [];

                return (
                  <div
                    key={i}
                    className="flex flex-wrap gap-3 items-end border-b border-borderLight pb-3 last:border-0 last:pb-0"
                  >
                    <div className="w-52">
                      <label className={labelCls}>Producto</label>
                      <select
                        value={nombreActual}
                        onChange={(e) => {
                          const nombre = e.target.value;
                          setProductos((prev) =>
                            prev.map((pr, idx) =>
                              idx === i
                                ? { ...pr, productoId: null, referencia: nombre, color: "" }
                                : pr
                            )
                          );
                        }}
                        className={inputCls}
                      >
                        <option value="">Otro (no está en el catálogo)</option>
                        {nombresCatalogo.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>

                    {nombreActual ? (
                      <div className="w-48">
                        <label className={labelCls}>Variante</label>
                        <select
                          value={p.productoId || ""}
                          onChange={(e) => {
                            const id = e.target.value;
                            const variante = variantesDisponibles.find((v) => v.id === id);
                            setProductos((prev) =>
                              prev.map((pr, idx) =>
                                idx === i
                                  ? { ...pr, productoId: id || null, color: variante?.variante || "" }
                                  : pr
                              )
                            );
                          }}
                          className={inputCls}
                        >
                          <option value="">Seleccionar...</option>
                          {variantesDisponibles.map((v) => (
                            <option key={v.id} value={v.id}>{v.variante || "Único"}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <>
                        <div className="w-40">
                          <label className={labelCls}>Color</label>
                          <input
                            value={p.color}
                            onChange={(e) => actualizarProducto(i, "color", e.target.value)}
                            className={inputCls}
                            placeholder="Color"
                          />
                        </div>
                        <div className="w-40">
                          <label className={labelCls}>Referencia</label>
                          <input
                            value={p.referencia}
                            onChange={(e) => actualizarProducto(i, "referencia", e.target.value)}
                            className={inputCls}
                            placeholder="Referencia"
                          />
                        </div>
                      </>
                    )}

                    <div className="w-24">
                      <label className={labelCls}>Cant.</label>
                      <input
                        type="number"
                        min="1"
                        value={p.cantidad}
                        onChange={(e) => actualizarProducto(i, "cantidad", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => quitarProducto(i)}
                      className="text-red hover:text-red/70 h-10 flex items-center justify-center"
                      title="Quitar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Flete */}
        <div className="bg-card border border-borderLight rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-ink2">Flete</p>
            <button
              type="button"
              onClick={agregarFlete}
              className="flex items-center gap-2 bg-accent text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-accent/90 transition-colors"
            >
              <Plus size={15} /> Agregar Flete
            </button>
          </div>

          {fletes.length > 0 && (
            <div className="space-y-3 mb-4">
              {fletes.map((f, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_40px] gap-3 items-end">
                  <div>
                    <label className={labelCls}>Valor Flete {i + 1}</label>
                    <input
                      type="number"
                      min="0"
                      value={f.valor}
                      onChange={(e) => actualizarFlete(i, "valor", e.target.value)}
                      className={inputCls}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Observación</label>
                    <input
                      value={f.observacion}
                      onChange={(e) => actualizarFlete(i, "observacion", e.target.value)}
                      className={inputCls}
                      placeholder="Observación del flete"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => quitarFlete(i)}
                    className="text-red hover:text-red/70 h-10 flex items-center justify-center"
                    title="Quitar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-accentSoft rounded-lg px-4 py-3 flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-ink2">Total Flete:</p>
            <p className="text-sm font-semibold text-accent">{fmt(totalFlete)}</p>
          </div>

          {totalFlete > 0 && (
            <div className="mb-4">
              <label className={labelCls}>¿De qué billetera sale el flete?</label>
              <select
                required
                value={form.cuentaFleteId}
                onChange={campo("cuentaFleteId")}
                className={inputCls}
              >
                <option value="">Seleccionar billetera...</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({fmt(c.saldo)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={labelCls}>Observación</label>
            <textarea
              value={form.notas}
              onChange={campo("notas")}
              className={inputCls}
              rows={3}
              placeholder="Observaciones adicionales del pedido..."
            />
          </div>
        </div>

        {error && (
          <div className="bg-redSoft text-red text-sm p-3 rounded-md">{error}</div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Link
            href="/"
            className="border border-borderLight text-ink2 text-sm font-medium px-5 py-2.5 rounded-md hover:bg-paper transition-colors"
          >
            Volver
          </Link>
          <button
            type="submit"
            disabled={enviando}
            className="bg-accent text-white text-sm font-medium px-6 py-2.5 rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {enviando ? "Guardando…" : esEdicion ? "Actualizar Pedido" : "Guardar Pedido"}
          </button>
        </div>
      </form>
    </main>
  );
}
