"use client";

import { useState, useTransition } from "react";
import { Check, Bell, BellOff, Monitor } from "lucide-react";
import { updateNotifications } from "@/app/actions/admin/settings";

interface Props {
  notifyNewOrder: boolean;
  notifyPaymentFail: boolean;
  notifyLowStock: boolean;
  notifyWeeklySummary: boolean;
  notifyBrowserEnabled: boolean;
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${enabled ? "bg-emerald-500" : "bg-[#D8BFAE]"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${enabled ? "left-5" : "left-0.5"}`} />
    </button>
  );
}

export default function NotificationsClient(initial: Props) {
  const [form, setForm]     = useState(initial);
  const [browserStatus, setBrowserStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [saved, setSaved]   = useState(false);
  const [isPending, startTransition] = useTransition();

  function toggleField(field: keyof Props) {
    setForm((f) => ({ ...f, [field]: !f[field] }));
  }

  function handleBrowserToggle(val: boolean) {
    if (val) {
      if (!("Notification" in window)) {
        setBrowserStatus("denied");
        return;
      }
      if (Notification.permission === "granted") {
        setForm((f) => ({ ...f, notifyBrowserEnabled: true }));
        setBrowserStatus("granted");
      } else if (Notification.permission === "denied") {
        setBrowserStatus("denied");
      } else {
        setBrowserStatus("requesting");
        void Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            setForm((f) => ({ ...f, notifyBrowserEnabled: true }));
            setBrowserStatus("granted");
            // Show test notification
            new Notification("Lira de Luna — Panel", {
              body: "Las notificaciones del navegador están activas.",
              icon: "/favicon.ico",
            });
          } else {
            setBrowserStatus("denied");
          }
        });
      }
    } else {
      setForm((f) => ({ ...f, notifyBrowserEnabled: false }));
      setBrowserStatus("idle");
    }
  }

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      await updateNotifications(form);
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    });
  }

  const emailItems: { label: string; field: keyof Props }[] = [
    { label: "Email al recibir un nuevo pedido",  field: "notifyNewOrder"      },
    { label: "Email cuando un pago falla",        field: "notifyPaymentFail"   },
    { label: "Alerta de stock bajo (menos de 3)", field: "notifyLowStock"      },
    { label: "Resumen semanal de ventas",         field: "notifyWeeklySummary" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Email */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Bell size={13} strokeWidth={1.5} className="text-[#CDA78F]" />
          <span className="text-[10px] tracking-[0.15em] uppercase text-[#5C4A3E] font-medium">Notificaciones por email</span>
        </div>
        <div className="space-y-4">
          {emailItems.map(({ label, field }) => (
            <div key={field} className="flex items-center justify-between">
              <span className="text-xs text-[#5C4A3E]">{label}</span>
              <Toggle enabled={form[field] as boolean} onChange={() => toggleField(field)} />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[#EDE2D8]" />

      {/* Browser */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Monitor size={13} strokeWidth={1.5} className="text-[#CDA78F]" />
          <span className="text-[10px] tracking-[0.15em] uppercase text-[#5C4A3E] font-medium">Notificaciones del navegador</span>
        </div>
        <p className="text-[10px] text-[#8E7A6B] mb-4">
          Solo aplica al panel de administración. La tienda pública nunca solicitará permisos de notificación a los clientes.
        </p>

        <div className="flex items-center justify-between p-4 bg-[#EDE2D8]/50 border border-[#D8BFAE]">
          <div>
            <p className="text-xs text-[#5C4A3E]">Habilitar notificaciones del navegador</p>
            <p className="text-[10px] text-[#8E7A6B] mt-0.5">
              Recibe alertas en tiempo real mientras el panel está abierto
            </p>
          </div>
          <Toggle enabled={form.notifyBrowserEnabled} onChange={handleBrowserToggle} />
        </div>

        {browserStatus === "requesting" && (
          <p className="text-[10px] text-[#8E7A6B] mt-2 flex items-center gap-1.5">
            <Bell size={11} strokeWidth={1.5} className="animate-pulse" />
            Esperando permiso del navegador…
          </p>
        )}
        {browserStatus === "granted" && (
          <p className="text-[10px] text-emerald-600 mt-2 flex items-center gap-1.5">
            <Check size={11} strokeWidth={2} /> Permiso concedido — las notificaciones están activas
          </p>
        )}
        {browserStatus === "denied" && (
          <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1.5">
            <BellOff size={11} strokeWidth={1.5} />
            Permiso denegado. Habilita las notificaciones en la configuración de tu navegador.
          </p>
        )}

        {form.notifyBrowserEnabled && browserStatus === "idle" && (
          <p className="text-[10px] text-[#8E7A6B] mt-2">
            Activo — el navegador solicitará permiso al cargar el panel.
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isPending}
          className={`flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase px-5 py-2.5 transition-colors disabled:opacity-50 ${saved ? "bg-emerald-500 text-white" : "bg-[#CDA78F] hover:bg-[#8E7A6B] text-white"}`}
        >
          {saved && <Check size={12} strokeWidth={2} />}
          {isPending ? "Guardando…" : saved ? "Guardado" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
