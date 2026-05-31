"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaAdminInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("ldl-admin-pwa-dismissed")) return;
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (standalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    localStorage.setItem("ldl-admin-pwa-dismissed", "1");
    setShow(false);
  }

  function dismiss() {
    localStorage.setItem("ldl-admin-pwa-dismissed", "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72">
      <div className="bg-[#3D2E28] border border-[#CDA78F]/30 shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-[#CDA78F]/20 flex items-center justify-center shrink-0">
            <Download size={15} strokeWidth={1.5} className="text-[#CDA78F]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-[#EDE2D8] mb-1">Instala el panel de admin</p>
            <p className="text-[10px] text-white/50 leading-relaxed mb-3">
              Accede al panel de administración directamente desde tu pantalla de inicio.
            </p>
            <div className="flex gap-2">
              <button onClick={handleInstall}
                className="text-[9px] tracking-[0.15em] uppercase bg-[#CDA78F] text-white px-3 py-1.5 hover:bg-[#8E7A6B] transition-colors">
                Instalar
              </button>
              <button onClick={dismiss}
                className="text-[9px] tracking-[0.15em] uppercase text-white/40 hover:text-white/70 transition-colors">
                No gracias
              </button>
            </div>
          </div>
          <button onClick={dismiss} className="text-white/30 hover:text-white/60 shrink-0">
            <X size={13} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
