"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/productos": "Productos",
  "/admin/colecciones": "Colecciones",
  "/admin/personalizacion": "Personalización",
  "/admin/pagos": "Registros de ventas",
  "/admin/venta-presencial": "Venta Presencial",
  "/admin/usuarios": "Usuarios",
  "/admin/perfil": "Mi perfil",
  "/admin/configuracion": "Configuración",
  "/admin/crm":           "CRM",
  "/admin/landing-pages": "Landing Pages",
};

interface AdminHeaderProps {
  adminName: string;
  adminEmail: string;
}

export default function AdminHeader({ adminName, adminEmail }: AdminHeaderProps) {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Admin";
  const initial = adminName[0]?.toUpperCase() ?? "A";

  return (
    <header className="h-16 bg-[#F7F4F1] border-b border-[#D8BFAE] px-8 flex items-center justify-between shrink-0">
      <h1 className="font-heading text-xl text-[#5C4A3E]">{title}</h1>

      <div className="flex items-center gap-5">
        {/* Notifications */}
        <button className="relative text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors">
          <Bell size={18} strokeWidth={1.5} />
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#CDA78F] flex items-center justify-center text-white text-xs font-medium">
            {initial}
          </div>
          <div className="hidden md:block">
            <p className="text-[11px] text-[#5C4A3E] font-medium leading-tight">
              {adminName}
            </p>
            <p className="text-[10px] text-[#8E7A6B] leading-tight">
              {adminEmail}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
