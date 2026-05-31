"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Package, FolderOpen, SlidersHorizontal,
  CreditCard, ShoppingCart, Wand2, Mail, Globe, BellRing,
  Users, Users2, RotateCcw, TrendingDown, ShoppingBag,
  Settings, UserCircle, LogOut, ChevronDown,
  Store, Megaphone, HeartHandshake, BarChart3, TrendingUp,
  ShieldCheck, UserCog, Calendar, ShieldAlert, ClipboardList,
} from "lucide-react";
import { adminLogoutAction } from "@/app/actions/admin/auth";

type NavItem = {
  href:  string;
  label: string;
  icon:  React.ElementType;
  exact?: boolean;
};

type NavGroup = {
  id:    string;
  label: string;
  icon:  React.ElementType;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "tienda", label: "Tienda", icon: Store,
    items: [
      { href: "/admin",             label: "Dashboard",   icon: LayoutDashboard, exact: true },
      { href: "/admin/productos",   label: "Productos",   icon: Package },
      { href: "/admin/colecciones", label: "Colecciones", icon: FolderOpen },
      { href: "/admin/filtros",     label: "Filtros",     icon: SlidersHorizontal },
    ],
  },
  {
    id: "ventas", label: "Ventas", icon: CreditCard,
    items: [
      { href: "/admin/pagos",            label: "Registros",        icon: CreditCard },
      { href: "/admin/venta-presencial", label: "Venta presencial", icon: ShoppingCart },
      { href: "/admin/compras",          label: "Compras",          icon: ShoppingBag },
    ],
  },
  {
    id: "postventa", label: "Postventa", icon: HeartHandshake,
    items: [
      { href: "/admin/devoluciones", label: "Devoluciones", icon: RotateCcw },
      { href: "/admin/perdidas",     label: "Pérdidas",     icon: TrendingDown },
    ],
  },
  {
    id: "clientes", label: "Clientes", icon: Users,
    items: [
      { href: "/admin/usuarios", label: "Clientes",  icon: Users },
      { href: "/admin/crm",      label: "CRM",       icon: Users2 },
      { href: "/admin/eventos",  label: "Eventos",   icon: Calendar },
    ],
  },
  {
    id: "marketing", label: "Marketing", icon: Megaphone,
    items: [
      { href: "/admin/personalizacion", label: "Personalización", icon: Wand2 },
      { href: "/admin/campanas",        label: "Campañas",        icon: Mail },
      { href: "/admin/landing-pages",   label: "Landing pages",   icon: Globe },
      { href: "/admin/notificaciones",  label: "Notificaciones",  icon: BellRing },
    ],
  },
  {
    id: "finanzas", label: "Finanzas", icon: BarChart3,
    items: [
      { href: "/admin/finanzas", label: "Economía", icon: TrendingUp },
    ],
  },
  {
    id: "equipo", label: "Equipo", icon: ShieldCheck,
    items: [
      { href: "/admin/equipo", label: "Administradores", icon: UserCog },
    ],
  },
  {
    id: "seguridad", label: "Seguridad", icon: ShieldAlert,
    items: [
      { href: "/admin/seguridad", label: "Logs de seguridad", icon: ShieldAlert },
      { href: "/admin/seguridad/auditoria", label: "Auditoría admin",  icon: ClipboardList },
    ],
  },
];

const BOTTOM_ITEMS: NavItem[] = [
  { href: "/admin/perfil",        label: "Mi perfil",    icon: UserCircle },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

function useOpenGroups(groups: NavGroup[], pathname: string) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem("adminSidebarGroups") ?? "{}"); } catch { return {}; }
    })();
    const initial: Record<string, boolean> = {};
    for (const g of groups) {
      const isActive = g.items.some((i) => i.exact ? pathname === i.href : pathname.startsWith(i.href));
      initial[g.id] = stored[g.id] !== undefined ? stored[g.id] : isActive;
    }
    setOpen(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: string) {
    setOpen((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem("adminSidebarGroups", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  return { open, toggle };
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const { open, toggle } = useOpenGroups(NAV_GROUPS, pathname);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="w-56 shrink-0 bg-[#3D2E28] flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10 shrink-0">
        <Link href="/admin" className="block">
          <div className="text-[10px] tracking-[0.3em] uppercase text-white/40 mb-0.5">Panel de</div>
          <div className="font-heading text-xl tracking-[0.25em] uppercase text-[#EDE2D8]">Lira de Luna</div>
        </Link>
      </div>

      {/* Nav */}
      <nav
        className="admin-nav flex-1 px-3 py-4 overflow-y-auto"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(205,167,143,0.35) transparent",
        }}
      >
        <style>{`
          .admin-nav::-webkit-scrollbar { width: 4px; }
          .admin-nav::-webkit-scrollbar-track { background: transparent; }
          .admin-nav::-webkit-scrollbar-thumb { background: rgba(205,167,143,0.35); border-radius: 2px; }
          .admin-nav::-webkit-scrollbar-thumb:hover { background: rgba(205,167,143,0.6); }
        `}</style>

        <div className="space-y-1">
          {NAV_GROUPS.map((group) => {
            const groupActive = group.items.some((i) => isActive(i.href, i.exact));
            const isOpen = open[group.id] ?? groupActive;
            const GroupIcon = group.icon;

            return (
              <div key={group.id}>
                <button
                  onClick={() => toggle(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-[10px] tracking-[0.14em] uppercase rounded-sm transition-colors ${
                    groupActive
                      ? "text-[#CDA78F]"
                      : "text-white/35 hover:text-white/60"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <GroupIcon size={13} strokeWidth={1.5} />
                    {group.label}
                  </span>
                  <ChevronDown
                    size={11}
                    strokeWidth={1.5}
                    className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isOpen && (
                  <div className="ml-3 pl-3 border-l border-white/10 mt-0.5 mb-1 space-y-0.5">
                    {group.items.map(({ href, label, icon: Icon, exact }) => {
                      const active = isActive(href, exact);
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={`flex items-center gap-2.5 px-2.5 py-2 text-[10px] tracking-[0.1em] uppercase rounded-sm transition-colors ${
                            active
                              ? "bg-[#CDA78F]/20 text-[#EDE2D8]"
                              : "text-white/40 hover:text-white/70 hover:bg-white/5"
                          }`}
                        >
                          <Icon size={13} strokeWidth={active ? 1.75 : 1.5} />
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-white/10 space-y-0.5 shrink-0">
        {BOTTOM_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 px-3 py-2 text-[10px] tracking-[0.12em] uppercase rounded-sm transition-colors ${
              isActive(href)
                ? "bg-[#CDA78F]/20 text-[#EDE2D8]"
                : "text-white/40 hover:text-white/70 hover:bg-white/5"
            }`}
          >
            <Icon size={13} strokeWidth={1.5} />
            {label}
          </Link>
        ))}
        <form action={adminLogoutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[10px] tracking-[0.12em] uppercase text-white/40 hover:text-red-300/70 hover:bg-white/5 rounded-sm transition-colors"
          >
            <LogOut size={13} strokeWidth={1.5} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
