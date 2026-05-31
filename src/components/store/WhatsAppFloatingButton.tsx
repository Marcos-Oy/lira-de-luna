"use client";

import { usePathname } from "next/navigation";
import { useSiteConfig } from "@/context/SiteConfigContext";

export default function WhatsAppFloatingButton() {
  const pathname = usePathname();
  const { whatsappButtonEnabled, whatsappContactNumber } = useSiteConfig();

  if (pathname.startsWith("/admin")) return null;
  if (!whatsappButtonEnabled || !whatsappContactNumber) return null;

  const clean = whatsappContactNumber.replace(/\D/g, "");
  const href  = `https://wa.me/${clean}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chatea con nosotros por WhatsApp"
      className="fixed bottom-6 right-6 z-50 group flex items-center gap-2"
    >
      {/* Tooltip */}
      <span className="hidden group-hover:flex items-center bg-white text-[#5C4A3E] text-[10px] tracking-[0.12em] uppercase px-3 py-2 shadow-md border border-[#D8BFAE] whitespace-nowrap translate-y-0 transition-all">
        Chatea con nosotros
      </span>

      {/* Button */}
      <span className="w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20b858] shadow-lg flex items-center justify-center transition-colors">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="white"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.106.548 4.083 1.502 5.8L.057 23.1a.75.75 0 0 0 .921.919l5.37-1.44A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.65-.52-5.163-1.426l-.37-.22-3.827 1.026 1.034-3.75-.24-.383A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
        </svg>
      </span>
    </a>
  );
}
