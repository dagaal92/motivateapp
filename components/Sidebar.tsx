"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import Logo, { LogoMark } from "@/components/Logo";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", funcional: true },
  { label: "Pedido", icon: ShoppingCart, href: "/", funcional: true },
  { label: "Balance", icon: Wallet, href: "/balance", funcional: true },
  { label: "Listados", icon: ListChecks, href: "/maestros", funcional: true },
  { label: "Reportes", icon: DollarSign, href: "/reportes", funcional: true },
  { label: "Inventario", icon: Package, href: "/inventario", funcional: true },
  { label: "Clientes", icon: Users, href: "/clientes", funcional: true },
  { label: "Preparación pedidos", icon: ClipboardList, href: "/preparacion", funcional: true },
];

export default function Sidebar() {
  const [colapsado, setColapsado] = useState(false);
  const [abiertoMobile, setAbiertoMobile] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Cerrar el menú al cambiar de página en celular
  useEffect(() => {
    setAbiertoMobile(false);
  }, [pathname]);

  // La pantalla de login no lleva menú alrededor.
  if (pathname === "/login") return null;

  const salir = async () => {
    setSaliendo(true);
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <>
      {/* Barra superior en celular */}
      <div className="md:hidden sticky top-0 z-30 w-full grid grid-cols-[auto_1fr_auto] items-center gap-2 bg-card border-b border-borderLight px-3 h-14">
        <button
          onClick={() => setAbiertoMobile(true)}
          className="w-9 h-9 flex items-center justify-center rounded-md text-ink2 hover:bg-paper transition-colors"
          title="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <div className="flex justify-center">
          <Logo compact />
        </div>
        <div className="w-9 h-9" />
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
          <Logo compact />
          <button
            onClick={() => setAbiertoMobile(false)}
            className="w-9 h-9 flex items-center justify-center rounded-md text-muted2 hover:bg-paper hover:text-ink2 transition-colors"
            title="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/* Logo (solo escritorio, expandido) */}
        {!colapsado && (
          <div className="w-full hidden md:flex items-center px-4 py-3 border-b border-borderLight">
            <Logo compact />
          </div>
        )}

        {/* Botón de colapsar (solo escritorio) */}
        <div className="w-full hidden md:flex flex-col items-center gap-2 py-3 border-b border-borderLight">
          {colapsado && <LogoMark size={26} />}
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
          <button
            onClick={salir}
            disabled={saliendo}
            title="Salir"
            className={`${
              colapsado ? "md:w-10 md:h-10 md:justify-center" : "md:w-56"
            } w-56 px-3 gap-3 h-10 flex items-center rounded-md text-sm text-red font-medium hover:bg-redSoft transition-colors disabled:opacity-50`}
          >
            <LogOut size={17} className="shrink-0" />
            <span className={colapsado ? "md:hidden" : ""}>
              {saliendo ? "Saliendo…" : "Salir"}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
