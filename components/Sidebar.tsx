"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  DollarSign,
  Package,
  Users,
  ClipboardList,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Wallet,
  ListChecks,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "#", funcional: false },
  { label: "Pedido", icon: ShoppingCart, href: "/", funcional: true },
  { label: "Balance", icon: Wallet, href: "/balance", funcional: true },
  { label: "Listados", icon: ListChecks, href: "/maestros", funcional: true },
  { label: "Reportes", icon: DollarSign, href: "/reportes", funcional: true },
  { label: "Inventario", icon: Package, href: "/inventario", funcional: true },
  { label: "Clientes", icon: Users, href: "/clientes", funcional: true },
  { label: "Preparación pedidos", icon: ClipboardList, href: "#", funcional: false },
];

export default function Sidebar() {
  const [colapsado, setColapsado] = useState(false);
  const [abiertoMobile, setAbiertoMobile] = useState(false);
  const pathname = usePathname();

  // Cerrar el menú al cambiar de página en celular
  useEffect(() => {
    setAbiertoMobile(false);
  }, [pathname]);

  return (
    <>
      {/* Barra superior en celular */}
      <div className="md:hidden sticky top-0 z-30 w-full flex items-center justify-between bg-card border-b border-borderLight px-4 h-14">
        <span className="font-display font-semibold text-ink2">Motívate</span>
        <button
          onClick={() => setAbiertoMobile(true)}
          className="w-9 h-9 flex items-center justify-center rounded-md text-ink2 hover:bg-paper transition-colors"
          title="Abrir menú"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Fondo oscuro detrás del menú en celular */}
      {abiertoMobile && (
        <div
          onClick={() => setAbiertoMobile(false)}
          className="md:hidden fixed inset-0 bg-black/40 z-40"
        />
      )}

      <aside
        className={`w-64 ${
          colapsado ? "md:w-16" : "md:w-64"
        } shrink-0 bg-card border-r border-borderLight min-h-screen flex flex-col items-center transition-all duration-200 fixed md:relative inset-y-0 left-0 z-50 ${
          abiertoMobile ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Cerrar (solo celular) */}
        <div className="w-full flex md:hidden justify-between items-center px-4 py-3 border-b border-borderLight">
          <span className="font-display font-semibold text-ink2">Motívate</span>
          <button
            onClick={() => setAbiertoMobile(false)}
            className="w-9 h-9 flex items-center justify-center rounded-md text-muted2 hover:bg-paper hover:text-ink2 transition-colors"
            title="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/* Botón de colapsar (solo escritorio) */}
        <div className="w-full hidden md:flex justify-center py-3 border-b border-borderLight">
          <button
            onClick={() => setColapsado((c) => !c)}
            className="w-10 h-10 flex items-center justify-center rounded-md text-muted2 hover:bg-paper hover:text-ink2 transition-colors"
            title={colapsado ? "Expandir menú" : "Colapsar menú"}
          >
            {colapsado ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Ítems de navegación */}
        <nav className="w-full flex-1 flex flex-col items-center gap-1 py-2">
          {NAV_ITEMS.map(({ label, icon: Icon, href, funcional }) => {
            const activo = funcional && pathname === href;
            const clsBase = `${
              colapsado ? "md:w-10 md:h-10 md:justify-center" : "md:w-56"
            } w-56 px-3 gap-3 h-10 flex items-center rounded-md text-sm font-medium transition-colors`;

            return funcional ? (
              <Link
                key={label}
                href={href}
                title={label}
                className={`${clsBase} ${
                  activo
                    ? "bg-accentSoft text-accent"
                    : "text-ink2 hover:bg-paper"
                }`}
              >
                <Icon size={17} className="shrink-0" />
                <span className={colapsado ? "md:hidden" : ""}>{label}</span>
              </Link>
            ) : (
              <span
                key={label}
                title="Próximamente"
                className={`${clsBase} text-muted2/70 cursor-default select-none`}
              >
                <Icon size={17} className="shrink-0" />
                <span className={colapsado ? "md:hidden" : ""}>{label}</span>
              </span>
            );
          })}
        </nav>

        {/* Salir */}
        <div className="w-full flex justify-center py-3 border-t border-borderLight">
          <span
            title="Salir"
            className={`${
              colapsado ? "md:w-10 md:h-10 md:justify-center" : "md:w-56"
            } w-56 px-3 gap-3 h-10 flex items-center rounded-md text-sm text-red font-medium cursor-default`}
          >
            <LogOut size={17} className="shrink-0" />
            <span className={colapsado ? "md:hidden" : ""}>Salir</span>
          </span>
        </div>
      </aside>
    </>
  );
}
