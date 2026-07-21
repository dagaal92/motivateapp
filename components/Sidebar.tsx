"use client";

import { useState } from "react";
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
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "#", funcional: false },
  { label: "Pedido", icon: ShoppingCart, href: "/", funcional: true },
  { label: "Balance", icon: Wallet, href: "/balance", funcional: true },
  { label: "Listados", icon: ListChecks, href: "/maestros", funcional: true },
  { label: "Gastos", icon: DollarSign, href: "#", funcional: false },
  { label: "Inventario", icon: Package, href: "#", funcional: false },
  { label: "Clientes", icon: Users, href: "#", funcional: false },
  { label: "Preparación pedidos", icon: ClipboardList, href: "#", funcional: false },
];

export default function Sidebar() {
  const [colapsado, setColapsado] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`${
        colapsado ? "w-16" : "w-64"
      } shrink-0 bg-card border-r border-borderLight min-h-screen flex flex-col items-center transition-all duration-200`}
    >
      {/* Botón de colapsar */}
      <div className="w-full flex justify-center py-3 border-b border-borderLight">
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
            colapsado ? "w-10 h-10 justify-center" : "w-56 px-3 gap-3"
          } h-10 flex items-center rounded-md text-sm font-medium transition-colors`;

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
              {!colapsado && label}
            </Link>
          ) : (
            <span
              key={label}
              title="Próximamente"
              className={`${clsBase} text-muted2/70 cursor-default select-none`}
            >
              <Icon size={17} className="shrink-0" />
              {!colapsado && label}
            </span>
          );
        })}
      </nav>

      {/* Salir */}
      <div className="w-full flex justify-center py-3 border-t border-borderLight">
        <span
          title="Salir"
          className={`${
            colapsado ? "w-10 h-10 justify-center" : "w-56 px-3 gap-3"
          } h-10 flex items-center rounded-md text-sm text-red font-medium cursor-default`}
        >
          <LogOut size={17} className="shrink-0" />
          {!colapsado && "Salir"}
        </span>
      </div>
    </aside>
  );
}
