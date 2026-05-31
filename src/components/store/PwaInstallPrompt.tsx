"use client";

import { useState, useEffect } from "react";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("ldl-pwa-dismissed")) return;

    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    if (ios) {
      if (!/Safari/.test(navigator.userAgent)) return;
      setIsIOS(true);
      setTimeout(() => setShow(true), 8000);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShow(true), 8000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") localStorage.setItem("ldl-pwa-dismissed", "1");
    setDeferredPrompt(null);
    setShow(false);
  }

  function dismiss() {
    localStorage.setItem("ldl-pwa-dismissed", "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-40 md:left-auto md:right-6 md:max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white border border-brand-beige shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-brand-cream border border-brand-beige flex items-center justify-center shrink-0">
            <Download size={16} strokeWidth={1.5} className="text-brand-sand" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-brand-dark mb-1">Instala Lira de Luna</p>
            {isIOS ? (
              <>
                <p className="text-[11px] text-brand-taupe leading-relaxed">
                  Toca <Share size={11} className="inline mx-0.5 align-middle" /> y luego{" "}
                  <strong className="text-brand-dark">"Agregar a inicio"</strong> para acceso rápido desde tu pantalla.
                </p>
                <button onClick={dismiss}
                  className="mt-3 text-[10px] tracking-[0.15em] uppercase text-brand-taupe hover:text-brand-dark transition-colors">
                  Entendido
                </button>
              </>
            ) : (
              <>
                <p className="text-[11px] text-brand-taupe leading-relaxed mb-3">
                  Accede más rápido sin abrir el navegador.
                </p>
                <div className="flex gap-3">
                  <button onClick={handleInstall}
                    className="text-[10px] tracking-[0.15em] uppercase bg-brand-sand text-white px-4 py-1.5 hover:bg-brand-taupe transition-colors">
                    Instalar
                  </button>
                  <button onClick={dismiss}
                    className="text-[10px] tracking-[0.15em] uppercase text-brand-taupe hover:text-brand-dark transition-colors">
                    Ahora no
                  </button>
                </div>
              </>
            )}
          </div>
          <button onClick={dismiss} className="text-brand-taupe hover:text-brand-dark shrink-0">
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
