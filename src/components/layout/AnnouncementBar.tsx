"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useSiteConfig } from "@/context/SiteConfigContext";

export default function AnnouncementBar() {
  const { announcementBar } = useSiteConfig();
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="bg-brand-beige text-brand-dark text-xs tracking-[0.2em] uppercase flex items-center justify-center py-2.5 px-4 relative">
      <span>{announcementBar}</span>
      <button
        onClick={() => setVisible(false)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-taupe hover:text-brand-dark transition-colors"
        aria-label="Cerrar aviso"
      >
        <X size={14} />
      </button>
    </div>
  );
}
