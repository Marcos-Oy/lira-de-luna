"use client";

import { useState, useTransition, useRef } from "react";
import {
  Bell, Check, ChevronDown, Clock, History, Image as ImageIcon,
  Key, RefreshCw, Send, Settings, Smartphone, Users, X,
} from "lucide-react";
import {
  generateVapidKeys, savePushSettings, sendPushNotification,
  uploadPwaIcon,
} from "@/app/actions/admin/push";

interface PushSettings {
  pushEnabled: boolean;
  pushVapidPublicKey: string | null;
  pushNotifNewProduct: boolean;
  pushNotifLowStock: boolean;
  pushNotifOffers: boolean;
  pushNotifPromo: boolean;
  pushFrequencyPerWeek: number;
  pushHourStart: number;
  pushHourEnd: number;
  pushLastSentAt: string | null;
  pwaCustomerIconUrl: string | null;
  pwaAdminIconUrl: string | null;
}

interface LogItem {
  id: string; type: string; title: string; body: string;
  url: string | null; sentCount: number; createdAt: string;
}

interface Props {
  settings: PushSettings;
  history: LogItem[];
  subscriberCount: number;
}

type Tab = "config" | "send" | "history";

const TYPE_TEMPLATES: Record<string, { title: string; body: string; label: string }> = {
  new_product: { label: "Nuevo producto",      title: "✨ Nueva joya disponible",         body: "¡Llega lo nuevo a Lira de Luna! Descúbrela antes que nadie." },
  low_stock:   { label: "Stock bajo",          title: "⚡ Quedan pocas unidades",          body: "Esta pieza se está agotando. ¡No te quedes sin ella!" },
  offer:       { label: "Oferta / Descuento",  title: "🏷️ Oferta exclusiva para ti",      body: "Aprovecha esta oferta por tiempo limitado en piezas seleccionadas." },
  promo:       { label: "Publicitaria",        title: "🌙 Algo especial te espera",        body: "Tenemos algo especial para ti en Lira de Luna." },
};

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={enabled} onClick={() => onChange(!enabled)}
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${enabled ? "bg-emerald-500" : "bg-[#D8BFAE]"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${enabled ? "left-5" : "left-0.5"}`} />
    </button>
  );
}

export default function NotificacionesClient({ settings: init, history: initHistory, subscriberCount: initCount }: Props) {
  const [tab, setTab]         = useState<Tab>("config");
  const [settings, setSettings] = useState(init);
  const [history]             = useState(initHistory);
  const [count]               = useState(initCount);
  const [isPending, startTransition] = useTransition();

  // Config tab
  const [saved, setSaved]     = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState("");
  const iconCustomerRef = useRef<HTMLInputElement>(null);
  const iconAdminRef    = useRef<HTMLInputElement>(null);
  const [iconUploading, setIconUploading] = useState<"customer" | "admin" | null>(null);

  // Send tab
  const [sendType, setSendType]   = useState("new_product");
  const [sendTitle, setSendTitle] = useState(TYPE_TEMPLATES.new_product.title);
  const [sendBody, setSendBody]   = useState(TYPE_TEMPLATES.new_product.body);
  const [sendUrl, setSendUrl]     = useState("");
  const [sendImage, setSendImage] = useState("");
  const [sendResult, setSendResult] = useState<{ sent: number; expired: number } | null>(null);
  const [sendError, setSendError] = useState("");
  const [sending, setSending]     = useState(false);

  function handleTypeChange(t: string) {
    setSendType(t);
    setSendTitle(TYPE_TEMPLATES[t].title);
    setSendBody(TYPE_TEMPLATES[t].body);
  }

  function setField<K extends keyof PushSettings>(k: K, v: PushSettings[K]) {
    setSettings((s) => ({ ...s, [k]: v }));
  }

  async function handleGenerate() {
    setGenError("");
    setGenLoading(true);
    try {
      const r = await generateVapidKeys();
      setSettings((s) => ({ ...s, pushVapidPublicKey: r.publicKey }));
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Error generando claves");
    } finally {
      setGenLoading(false);
    }
  }

  function handleSaveConfig() {
    setSaved(false);
    startTransition(async () => {
      await savePushSettings({
        pushEnabled:          settings.pushEnabled,
        pushNotifNewProduct:  settings.pushNotifNewProduct,
        pushNotifLowStock:    settings.pushNotifLowStock,
        pushNotifOffers:      settings.pushNotifOffers,
        pushNotifPromo:       settings.pushNotifPromo,
        pushFrequencyPerWeek: settings.pushFrequencyPerWeek,
        pushHourStart:        settings.pushHourStart,
        pushHourEnd:          settings.pushHourEnd,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  async function handleUploadIcon(type: "customer" | "admin") {
    const input = type === "customer" ? iconCustomerRef.current : iconAdminRef.current;
    if (!input?.files?.[0]) return;
    const fd = new FormData();
    fd.append("icon", input.files[0]);
    setIconUploading(type);
    try {
      const r = await uploadPwaIcon(fd, type);
      if ("url" in r) {
        const newUrl: string = r.url!;
        if (type === "customer") {
          setSettings((s) => ({ ...s, pwaCustomerIconUrl: newUrl }));
        } else {
          setSettings((s) => ({ ...s, pwaAdminIconUrl: newUrl }));
        }
      }
    } finally {
      setIconUploading(null);
    }
  }

  async function handleSend() {
    if (!sendTitle.trim() || !sendBody.trim()) { setSendError("Completa el título y el mensaje"); return; }
    setSendError(""); setSendResult(null); setSending(true);
    try {
      const r = await sendPushNotification({ type: sendType, title: sendTitle, body: sendBody, url: sendUrl || undefined, image: sendImage || undefined });
      if ("error" in r && r.error) { setSendError(r.error); return; }
      if ("success" in r && r.success) setSendResult({ sent: r.sent ?? 0, expired: r.expired ?? 0 });
    } finally {
      setSending(false);
    }
  }

  const inp = "w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]";
  const lbl = "text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]";

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "config",  label: "Configuración", icon: Settings  },
    { id: "send",    label: "Enviar",         icon: Send      },
    { id: "history", label: "Historial",      icon: History   },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl text-[#5C4A3E]">Notificaciones Push</h1>
          <p className="text-xs text-[#8E7A6B] mt-1">
            Envía notificaciones al smartphone de tus clientes + gestiona las apps instalables (PWA).
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#EDE2D8] px-3 py-2 border border-[#D8BFAE]">
          <Users size={13} strokeWidth={1.5} className="text-[#8E7A6B]" />
          <span className="text-xs text-[#5C4A3E] font-medium">{count} suscriptores</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#D8BFAE] flex gap-0">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-3 text-[10px] tracking-[0.15em] uppercase transition-colors border-b-2 -mb-px ${tab === id ? "border-[#CDA78F] text-[#5C4A3E]" : "border-transparent text-[#8E7A6B] hover:text-[#5C4A3E]"}`}>
            <Icon size={12} strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Configuración ── */}
      {tab === "config" && (
        <div className="space-y-8">

          {/* Master toggle */}
          <div className="bg-white border border-[#D8BFAE] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#5C4A3E] font-medium">Activar notificaciones push para clientes</p>
                <p className="text-[11px] text-[#8E7A6B] mt-0.5">
                  Cuando está activo, la tienda solicita permiso al cliente en móviles.
                </p>
              </div>
              <Toggle enabled={settings.pushEnabled} onChange={(v) => setField("pushEnabled", v)} />
            </div>
          </div>

          {/* VAPID Keys */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Key size={13} strokeWidth={1.5} className="text-[#CDA78F]" />
              <span className={lbl}>Claves VAPID (requeridas para push)</span>
            </div>
            <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-4 space-y-3">
              {settings.pushVapidPublicKey ? (
                <div>
                  <p className={`${lbl} mb-1`}>Clave pública</p>
                  <p className="font-mono text-[10px] text-[#5C4A3E] break-all bg-white border border-[#D8BFAE] p-2">
                    {settings.pushVapidPublicKey}
                  </p>
                  <p className="text-[10px] text-emerald-600 mt-2 flex items-center gap-1">
                    <Check size={10} strokeWidth={2} /> Claves configuradas correctamente
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[#8E7A6B]">No hay claves VAPID configuradas. Genera unas nuevas para empezar.</p>
              )}
              {genError && <p className="text-[10px] text-red-500">{genError}</p>}
              <button onClick={handleGenerate} disabled={genLoading}
                className="flex items-center gap-2 text-[10px] tracking-[0.12em] uppercase bg-[#5C4A3E] hover:bg-[#3D2E28] text-white px-4 py-2 transition-colors disabled:opacity-50">
                <RefreshCw size={11} strokeWidth={1.5} className={genLoading ? "animate-spin" : ""} />
                {settings.pushVapidPublicKey ? "Regenerar claves" : "Generar claves VAPID"}
              </button>
              {settings.pushVapidPublicKey && (
                <p className="text-[10px] text-amber-600">
                  ⚠ Regenerar claves invalida todas las suscripciones existentes.
                </p>
              )}
            </div>
          </div>

          {/* Notification types */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Bell size={13} strokeWidth={1.5} className="text-[#CDA78F]" />
              <span className={lbl}>Tipos de notificación</span>
            </div>
            <div className="bg-white border border-[#D8BFAE] divide-y divide-[#EDE2D8]">
              {([
                { key: "pushNotifNewProduct" as const, label: "Nuevos productos",      desc: "Notifica cuando se agrega un producto nuevo" },
                { key: "pushNotifLowStock"   as const, label: "Stock bajo",            desc: "Avisa que una joya se está agotando" },
                { key: "pushNotifOffers"     as const, label: "Ofertas y descuentos",  desc: "Notifica cuando hay ofertas activas" },
                { key: "pushNotifPromo"      as const, label: "Publicitaria / Promo",  desc: "Mensajes promocionales libres" },
              ]).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-xs text-[#5C4A3E]">{label}</p>
                    <p className="text-[10px] text-[#8E7A6B]">{desc}</p>
                  </div>
                  <Toggle enabled={settings[key]} onChange={(v) => setField(key, v)} />
                </div>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock size={13} strokeWidth={1.5} className="text-[#CDA78F]" />
              <span className={lbl}>Frecuencia sugerida</span>
            </div>
            <div className="bg-white border border-[#D8BFAE] p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={lbl}>Máximo veces por semana</label>
                  <div className="relative">
                    <select value={settings.pushFrequencyPerWeek}
                      onChange={(e) => setField("pushFrequencyPerWeek", Number(e.target.value))}
                      className={`${inp} appearance-none pr-8`}>
                      {[1, 2, 3, 5, 7].map((n) => <option key={n} value={n}>{n} vez{n !== 1 ? "es" : ""} por semana</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={lbl}>Horario permitido</label>
                  <div className="flex items-center gap-2">
                    <select value={settings.pushHourStart}
                      onChange={(e) => setField("pushHourStart", Number(e.target.value))}
                      className={`${inp} appearance-none flex-1`}>
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                      ))}
                    </select>
                    <span className="text-[#8E7A6B] text-xs shrink-0">–</span>
                    <select value={settings.pushHourEnd}
                      onChange={(e) => setField("pushHourEnd", Number(e.target.value))}
                      className={`${inp} appearance-none flex-1`}>
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              {settings.pushLastSentAt && (
                <p className="text-[10px] text-[#8E7A6B]">
                  Último envío: {new Date(settings.pushLastSentAt).toLocaleString("es-CL")}
                </p>
              )}
              <p className="text-[10px] text-[#8E7A6B] bg-[#F7F4F1] px-3 py-2 border border-[#EDE2D8]">
                ℹ La frecuencia es una guía para ti. Los envíos siempre son manuales desde la pestaña "Enviar".
              </p>
            </div>
          </div>

          {/* PWA Icons */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone size={13} strokeWidth={1.5} className="text-[#CDA78F]" />
              <span className={lbl}>Iconos de la app (PWA)</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {([
                { type: "customer" as const, label: "App de clientes", ref: iconCustomerRef, url: settings.pwaCustomerIconUrl, fallback: "/icons/customer.svg" },
                { type: "admin"    as const, label: "App de admin",    ref: iconAdminRef,    url: settings.pwaAdminIconUrl,    fallback: "/icons/admin.svg"    },
              ]).map(({ type, label, ref, url, fallback }) => (
                <div key={type} className="bg-white border border-[#D8BFAE] p-4 space-y-3">
                  <p className="text-xs text-[#5C4A3E] font-medium">{label}</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url ?? fallback} alt={label} className="w-16 h-16 border border-[#EDE2D8] object-cover" />
                  <input ref={ref} type="file" accept="image/*" className="hidden"
                    onChange={() => handleUploadIcon(type)} />
                  <button onClick={() => ref.current?.click()} disabled={iconUploading === type}
                    className="flex items-center gap-1.5 text-[9px] tracking-[0.12em] uppercase text-[#CDA78F] hover:text-[#8E7A6B] border border-[#D8BFAE] px-3 py-1.5 transition-colors disabled:opacity-50">
                    <ImageIcon size={10} strokeWidth={1.5} />
                    {iconUploading === type ? "Subiendo..." : "Cambiar icono"}
                  </button>
                  <p className="text-[9px] text-[#8E7A6B]">PNG/SVG recomendado, 512×512 px</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={handleSaveConfig} disabled={isPending}
              className={`flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase px-6 py-2.5 transition-colors disabled:opacity-50 ${saved ? "bg-emerald-500 text-white" : "bg-[#CDA78F] hover:bg-[#8E7A6B] text-white"}`}>
              {saved && <Check size={12} strokeWidth={2} />}
              {isPending ? "Guardando…" : saved ? "Guardado" : "Guardar configuración"}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Enviar ── */}
      {tab === "send" && (
        <div className="space-y-6 max-w-xl">
          {!settings.pushEnabled && (
            <div className="bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-xs text-amber-700">Las notificaciones push están desactivadas. Actívalas en Configuración.</p>
            </div>
          )}
          {!settings.pushVapidPublicKey && (
            <div className="bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-xs text-amber-700">Genera las claves VAPID en Configuración antes de enviar.</p>
            </div>
          )}

          <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-3 flex items-center gap-3">
            <Users size={14} strokeWidth={1.5} className="text-[#CDA78F]" />
            <p className="text-xs text-[#5C4A3E]">
              Este mensaje se enviará a <strong>{count} dispositivos</strong> suscritos.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className={lbl}>Tipo de notificación</label>
              <div className="relative">
                <select value={sendType} onChange={(e) => handleTypeChange(e.target.value)}
                  className={`${inp} appearance-none pr-8`}>
                  {Object.entries(TYPE_TEMPLATES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={lbl}>Título *</label>
              <input value={sendTitle} onChange={(e) => setSendTitle(e.target.value)} className={inp} maxLength={100} />
            </div>

            <div className="space-y-1.5">
              <label className={lbl}>Mensaje *</label>
              <textarea value={sendBody} onChange={(e) => setSendBody(e.target.value)} rows={3}
                className={`${inp} resize-none`} maxLength={200} />
              <p className="text-[9px] text-[#8E7A6B] text-right">{sendBody.length}/200</p>
            </div>

            <div className="space-y-1.5">
              <label className={lbl}>URL de destino (opcional)</label>
              <input value={sendUrl} onChange={(e) => setSendUrl(e.target.value)}
                placeholder="/tienda o /producto/collar-luna" className={inp} />
              <p className="text-[9px] text-[#8E7A6B]">Al tocar la notificación, el cliente irá a esta URL</p>
            </div>

            <div className="space-y-1.5">
              <label className={lbl}>Imagen (URL, opcional)</label>
              <input value={sendImage} onChange={(e) => setSendImage(e.target.value)}
                placeholder="https://..." className={inp} />
            </div>

            {sendError && <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2">{sendError}</p>}

            {sendResult && (
              <div className="bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-start gap-2">
                <Check size={14} strokeWidth={2} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-emerald-700 font-medium">¡Enviado correctamente!</p>
                  <p className="text-[10px] text-emerald-600">
                    {sendResult.sent} dispositivos recibieron la notificación.
                    {sendResult.expired > 0 && ` (${sendResult.expired} suscripciones expiradas eliminadas)`}
                  </p>
                </div>
              </div>
            )}

            <button onClick={handleSend} disabled={sending || !settings.pushEnabled || !settings.pushVapidPublicKey}
              className="flex items-center gap-2 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[10px] tracking-[0.2em] uppercase px-6 py-3 transition-colors disabled:opacity-50">
              <Send size={13} strokeWidth={1.5} />
              {sending ? "Enviando…" : "Enviar a todos los suscriptores"}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Historial ── */}
      {tab === "history" && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="bg-[#F7F4F1] border border-[#D8BFAE] py-16 text-center">
              <Bell size={28} strokeWidth={1} className="text-[#D8BFAE] mx-auto mb-3" />
              <p className="text-xs text-[#8E7A6B]">Aún no se han enviado notificaciones</p>
            </div>
          ) : (
            <div className="bg-white border border-[#D8BFAE] divide-y divide-[#EDE2D8]">
              {history.map((item) => (
                <div key={item.id} className="px-5 py-4 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#EDE2D8] flex items-center justify-center shrink-0 mt-0.5">
                    <Bell size={13} strokeWidth={1.5} className="text-[#CDA78F]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className="text-xs font-medium text-[#5C4A3E]">{item.title}</p>
                      <span className="text-[9px] tracking-[0.1em] uppercase bg-[#EDE2D8] text-[#8E7A6B] px-1.5 py-0.5">
                        {TYPE_TEMPLATES[item.type]?.label ?? item.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8E7A6B] mt-0.5 truncate">{item.body}</p>
                    {item.url && (
                      <p className="text-[10px] text-[#CDA78F] mt-0.5 font-mono truncate">{item.url}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-[#5C4A3E]">{item.sentCount} envíos</p>
                    <p className="text-[10px] text-[#8E7A6B] mt-0.5">
                      {new Date(item.createdAt).toLocaleDateString("es-CL")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
