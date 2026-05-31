"use client";

import { useState, useTransition } from "react";
import { toggleWholesale } from "@/app/actions/admin/settings";

export default function WholesaleToggle({ enabled }: { enabled: boolean }) {
  const [active, setActive] = useState(enabled);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !active;
    setActive(next);
    startTransition(() => { void toggleWholesale(next); });
  }

  return (
    <div className="flex items-center gap-3">
      <span className={`text-[10px] tracking-[0.1em] uppercase font-medium ${active ? "text-emerald-600" : "text-[#8E7A6B]"}`}>
        {active ? "Activo" : "Inactivo"}
      </span>
      <button
        role="switch"
        aria-checked={active}
        onClick={handleToggle}
        disabled={isPending}
        className={`relative inline-flex w-11 h-6 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 ${active ? "bg-emerald-400" : "bg-[#D8BFAE]"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200 ${active ? "left-5" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}
