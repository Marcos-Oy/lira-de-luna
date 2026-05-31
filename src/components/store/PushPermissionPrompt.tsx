"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { useSiteConfig } from "@/context/SiteConfigContext";

function urlBase64ToUint8Array(b64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

export default function PushPermissionPrompt() {
  const { pushEnabled, pushVapidPublicKey } = useSiteConfig();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pushEnabled || !pushVapidPublicKey) return;
    if (!("PushManager" in window)) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem("ldl-push-decided")) return;

    const t = setTimeout(() => setShow(true), 12000);
    return () => clearTimeout(t);
  }, [pushEnabled, pushVapidPublicKey]);

  async function handleAccept() {
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { dismiss(); return; }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(pushVapidPublicKey!),
        });
      }

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });

      localStorage.setItem("ldl-push-decided", "1");
      setShow(false);
    } catch {
      dismiss();
    } finally {
      setLoading(false);
    }
  }

  function dismiss() {
    localStorage.setItem("ldl-push-decided", "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white border border-brand-beige shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-cream border border-brand-beige flex items-center justify-center shrink-0">
            <Bell size={16} strokeWidth={1.5} className="text-brand-sand" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-brand-dark mb-1">
              ¿Quieres ser la primera en enterarse?
            </p>
            <p className="text-[11px] text-brand-taupe leading-relaxed">
              Activa las notificaciones y recibe alertas de nuevas piezas, ofertas y stock limitado.
            </p>
            <div className="flex gap-3 mt-3">
              <button onClick={handleAccept} disabled={loading}
                className="text-[10px] tracking-[0.15em] uppercase bg-brand-sand text-white px-4 py-1.5 hover:bg-brand-taupe transition-colors disabled:opacity-50">
                {loading ? "…" : "Activar"}
              </button>
              <button onClick={dismiss}
                className="text-[10px] tracking-[0.15em] uppercase text-brand-taupe hover:text-brand-dark transition-colors">
                Ahora no
              </button>
            </div>
          </div>
          <button onClick={dismiss} className="text-brand-taupe hover:text-brand-dark shrink-0 mt-0.5">
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
