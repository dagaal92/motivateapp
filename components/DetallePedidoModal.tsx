"use client";

import {
  X,
  Package,
  Phone,
  MapPin,
  Truck,
  DollarSign,
  Calendar,
  AlertTriangle,
  CreditCard,
  Hash,
} from "lucide-react";

type ProductoLinea = { color: string | null; referencia: string | null; cantidad: number };
type FleteLinea = { valor: number; observacion: string | null };

export type PedidoDetalle = {
  id: string;
  numeroOrden: string | null;
  cliente: string | null;
  telefono: string;
  creadoEn: string;
  prioridad: string | null;
  general: string | null;
  numeroGuia: string | null;
  transportadora: string | null;
  envio: string | null;
  ingresoDinero: string | null;
  departamento: string | null;
  municipio: string | null;
  valorTotal: number;
  notas: string | null;
  productos: ProductoLinea[];
  fletes: FleteLinea[];
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });

function Dato({
  icon: Icon,
  label,
  valor,
}: {
  icon: any;
  label: string;
  valor: string;
}) {
  return (
    <div className="bg-paper rounded-lg border border-borderLight p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={13} className="text-muted2" />
        <span className="text-xs font-medium text-muted2">{label}</span>
      </div>
      <p className="text-sm font-semibold text-ink2 truncate">{valor || "—"}</p>
    </div>
  );
}

export default function DetallePedidoModal({
  pedido,
  onClose,
}: {
  pedido: PedidoDetalle | null;
  onClose: () => void;
}) {
  if (!pedido) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-borderLight px-6 py-4 flex items-center justify-between sticky top-0 bg-card rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accentSoft text-accent flex items-center justify-center">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink2">Detalle del pedido</h2>
              <p className="text-sm text-muted2">
                {pedido.numeroOrden ? `Orden #${pedido.numeroOrden}` : pedido.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-md text-muted2 hover:bg-paper hover:text-ink2 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Dato icon={Phone} label="Teléfono" valor={pedido.telefono} />
            <Dato icon={Calendar} label="Fecha de pedido" valor={fmtFecha(pedido.creadoEn)} />
            <Dato icon={Truck} label="Transportadora" valor={pedido.transportadora || "—"} />
            <Dato icon={AlertTriangle} label="Prioridad" valor={pedido.prioridad || "—"} />
            <Dato icon={Package} label="General" valor={pedido.general || "—"} />
            <Dato icon={Truck} label="Envío" valor={pedido.envio || "—"} />
            <Dato icon={MapPin} label="Departamento" valor={pedido.departamento || "—"} />
            <Dato icon={MapPin} label="Municipio" valor={pedido.municipio || "—"} />
            <Dato icon={Hash} label="Número de guía" valor={pedido.numeroGuia || "—"} />
            <Dato icon={DollarSign} label="Valor de venta" valor={fmt(pedido.valorTotal)} />
            <Dato icon={CreditCard} label="Ingreso dinero" valor={pedido.ingresoDinero || "—"} />
          </div>

          <div className="bg-white rounded-lg border border-borderLight p-4">
            <h3 className="text-sm font-semibold text-ink2 mb-3 flex items-center gap-2">
              <Package size={15} className="text-accent" />
              Productos ({pedido.productos.length})
            </h3>
            {pedido.productos.length === 0 ? (
              <p className="text-sm text-muted2">No hay productos agregados.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {pedido.productos.map((p, i) => (
                  <div
                    key={i}
                    className="bg-paper rounded-md border border-borderLight px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink2 truncate">
                        {p.referencia || "Producto"}
                      </p>
                      {p.color && <p className="text-xs text-muted2 truncate">{p.color}</p>}
                    </div>
                    <span className="text-xs font-medium bg-accentSoft text-accent px-2 py-0.5 rounded-full shrink-0">
                      {p.cantidad}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {pedido.fletes.length > 0 && (
            <div className="bg-white rounded-lg border border-borderLight p-4">
              <h3 className="text-sm font-semibold text-ink2 mb-3 flex items-center gap-2">
                <Truck size={15} className="text-purple" />
                Flete
              </h3>
              <div className="space-y-2">
                {pedido.fletes.map((f, i) => (
                  <div key={i} className="bg-paper rounded-md border border-borderLight px-3 py-2">
                    <p className="text-sm font-semibold text-ink2">{fmt(f.valor)}</p>
                    {f.observacion && <p className="text-xs text-muted2">{f.observacion}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {pedido.notas && (
            <div className="bg-white rounded-lg border border-borderLight p-4">
              <h3 className="text-sm font-semibold text-ink2 mb-2">Observación</h3>
              <p className="text-sm text-muted2 leading-relaxed">{pedido.notas}</p>
            </div>
          )}
        </div>

        <div className="border-t border-borderLight px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="bg-paper hover:bg-borderLight text-ink2 text-sm font-medium px-5 py-2 rounded-md transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
