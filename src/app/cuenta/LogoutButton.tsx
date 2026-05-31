"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

export default function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="w-full flex items-center gap-3 px-4 py-3 text-xs tracking-[0.12em] uppercase text-brand-taupe hover:text-red-400 transition-colors text-left mt-4"
      >
        <LogOut size={14} strokeWidth={1.5} />
        Cerrar sesión
      </button>
    </form>
  );
}
