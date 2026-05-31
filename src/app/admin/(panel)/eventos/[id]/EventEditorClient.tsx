"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Save, Eye, EyeOff, ArrowLeft, Plus, Trash2, Upload,
  Calendar, MapPin, Ticket, Link2, Users,
  Video, Wand2, Code2, ChevronDown, GripVertical,
  ToggleLeft, ToggleRight, Globe, Loader2, AlignLeft,
} from "lucide-react";
import { createEventLP, updateEventLP } from "@/app/actions/admin/events";
import type { EventConfig } from "@/lib/crm";
import DevicePreviewShell from "@/components/admin/DevicePreviewShell";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { sanitizeHtml } from "@/lib/sanitize";

// ── Types ──────────────────────────────────────────────────────

type StoreSettings = {
  mercadoPagoEnabled:    boolean;
  flowPayEnabled:        boolean;
  transferEnabled:       boolean;
  transferBankName:      string | null;
  transferAccountName:   string | null;
  transferAccountNumber: string | null;
  transferAccountType:   string | null;
  transferRut:           string | null;
  transferInstructions:  string | null;
};

interface Props {
  mode:           "create" | "edit";
  id?:            string;
  initialTitle?:  string;
  initialConfig:  EventConfig;
  initialIsActive?: boolean;
  storeSettings:  StoreSettings;
}

type EditorTab = "evento" | "diseno" | "entradas" | "whatsapp" | "formulario" | "contenido" | "avanzado";

const TABS: { key: EditorTab; label: string; icon: React.ReactNode }[] = [
  { key: "evento",     label: "Evento",     icon: <Calendar    size={13} strokeWidth={1.5} /> },
  { key: "diseno",     label: "Diseño",     icon: <Wand2       size={13} strokeWidth={1.5} /> },
  { key: "entradas",   label: "Entradas",   icon: <Ticket      size={13} strokeWidth={1.5} /> },
  { key: "whatsapp",   label: "Comunidad",  icon: <Link2         size={13} strokeWidth={1.5} /> },
  { key: "formulario", label: "Formulario", icon: <Users       size={13} strokeWidth={1.5} /> },
  { key: "contenido",  label: "Contenido",  icon: <Video       size={13} strokeWidth={1.5} /> },
  { key: "avanzado",   label: "Avanzado",   icon: <Code2       size={13} strokeWidth={1.5} /> },
];

// ── Date helpers ─────────────────────────────────────────────

function datesInRange(start: string, end: string): string[] {
  if (!start || !end) return [];
  const s = new Date(start + "T12:00:00");
  const e = new Date(end   + "T12:00:00");
  if (e < s) return [];
  const out: string[] = [];
  const d = new Date(s);
  while (d <= e) { out.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }
  return out;
}

function fmtShortDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" });
}

// ── Section ordering ─────────────────────────────────────────

const DEFAULT_SECTION_ORDER = ["video", "description", "community", "map", "features", "gallery", "socialProof"];

const SECTION_META: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "video",       label: "Video",           icon: <Video     size={11} strokeWidth={1.5} /> },
  { key: "description", label: "Descripción",     icon: <AlignLeft size={11} strokeWidth={1.5} /> },
  { key: "community",   label: "Botón comunidad", icon: <Link2     size={11} strokeWidth={1.5} /> },
  { key: "map",         label: "Mapa",            icon: <MapPin    size={11} strokeWidth={1.5} /> },
  { key: "features",    label: "Beneficios",      icon: <Ticket    size={11} strokeWidth={1.5} /> },
  { key: "gallery",     label: "Galería",         icon: <Video     size={11} strokeWidth={1.5} /> },
  { key: "socialProof", label: "Prueba social",   icon: <Users     size={11} strokeWidth={1.5} /> },
];

// ── Field helpers ─────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] block mb-1.5">{children}</label>;
}

function Input({ value, onChange, type = "text", placeholder = "", disabled = false }: {
  value: string; onChange: (v: string) => void; type?: string;
  placeholder?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] disabled:opacity-50"
    />
  );
}

function Textarea({ value, onChange, rows = 3, placeholder = "" }: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] resize-none"
    />
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="shrink-0"
      >
        {checked
          ? <ToggleRight size={20} className="text-[#CDA78F]" strokeWidth={1.5} />
          : <ToggleLeft  size={20} className="text-[#8E7A6B]" strokeWidth={1.5} />}
      </button>
      <span className="text-xs text-[#5C4A3E]">{label}</span>
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[9px] tracking-[0.2em] uppercase text-[#CDA78F] font-medium border-b border-[#EDE2D8] pb-1">
        {title}
      </p>
      {children}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

export default function EventEditorClient({
  mode, id, initialTitle = "", initialConfig, initialIsActive = false, storeSettings,
}: Props) {
  const router = useRouter();
  const [tab, setTab]           = useState<EditorTab>("evento");
  const [title, setTitle]       = useState(initialTitle);
  const [cfg, setCfg]           = useState<EventConfig>(initialConfig);
  const [isActive, setIsActive] = useState(initialIsActive);
  const [showPreview, setShowPreview] = useState(true);
  const [error, setError]       = useState("");
  const [saved, setSaved]       = useState(false);
  const [isPending, start]      = useTransition();
  const [heroUploading, setHeroUploading]   = useState(false);
  const [heroUploadError, setHeroUploadError] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const [galleryUploading, setGalleryUploading] = useState<Record<number, boolean>>({});
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  async function handleHeroUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setHeroUploading(true); setHeroUploadError(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) update("heroImage", data.url);
      else setHeroUploadError(data.error ?? "Error al subir");
    } finally { setHeroUploading(false); e.target.value = ""; }
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setVideoUploading(true); setVideoUploadError(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) update("videoUrl", data.url);
      else setVideoUploadError(data.error ?? "Error al subir");
    } finally { setVideoUploading(false); e.target.value = ""; }
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>, idx: number) {
    const file = e.target.files?.[0]; if (!file) return;
    setGalleryUploading((prev) => ({ ...prev, [idx]: true }));
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        const g = [...cfg.gallery]; g[idx] = data.url; update("gallery", g);
      }
    } finally {
      setGalleryUploading((prev) => ({ ...prev, [idx]: false }));
      e.target.value = "";
    }
  }

  const update = useCallback(<K extends keyof EventConfig>(key: K, value: EventConfig[K]) => {
    setCfg((c) => ({ ...c, [key]: value }));
  }, []);

  function handleSave() {
    setError("");
    if (!title.trim()) { setError("El título del evento es requerido"); return; }
    if (!cfg.eventDate) { setError("La fecha del evento es requerida"); return; }

    start(async () => {
      let res;
      if (mode === "create") {
        res = await createEventLP({ title, config: { ...cfg } });
        if ("success" in res && res.success) {
          router.push(`/admin/eventos/${res.id}`);
          return;
        }
      } else {
        res = await updateEventLP(id!, { title, config: { ...cfg }, isActive });
        if ("success" in res && res.success) {
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
          return;
        }
      }
      if ("error" in res) setError(res.error ?? "Error desconocido");
    });
  }

  // Available payment methods based on store settings
  const availablePayments = [
    storeSettings.transferEnabled    && { key: "transfer",    label: "Transferencia bancaria" },
    storeSettings.mercadoPagoEnabled && { key: "mercadoPago", label: "MercadoPago" },
    storeSettings.flowPayEnabled     && { key: "flowPay",     label: "Flow Pay" },
  ].filter(Boolean) as { key: string; label: string }[];

  function togglePayment(key: string) {
    const list = cfg.enabledPayments.includes(key)
      ? cfg.enabledPayments.filter((k) => k !== key)
      : [...cfg.enabledPayments, key];
    update("enabledPayments", list);
  }

  // ── Preview ─────────────────────────────────────────────────

  const previewBg = cfg.bgColor || "#F7F4F1";
  const previewAccent = cfg.accentColor || "#CDA78F";

  const sectionOrder = cfg.sectionOrder ?? DEFAULT_SECTION_ORDER;

  function renderPreviewSection(key: string) {
    switch (key) {
      case "video":
        if (!cfg.showVideo || !cfg.videoUrl) return null;
        return (
          <div key="video" className={`mx-3 my-2 ${cfg.videoOrientation === "vertical" ? "flex justify-center" : ""}`}>
            <div
              className="bg-[#1a1a1a] rounded flex flex-col items-center justify-center gap-1.5 text-white/60"
              style={cfg.videoOrientation === "vertical"
                ? { width: "55%", aspectRatio: "9/16" }
                : { width: "100%", aspectRatio: "16/9" }
              }
            >
              <div className="w-7 h-7 rounded-full border border-white/40 flex items-center justify-center">
                <svg width="8" height="9" viewBox="0 0 9 10" fill="currentColor"><polygon points="1,0.5 8.5,5 1,9.5"/></svg>
              </div>
              {cfg.videoTitle && <span className="text-[8px] px-2 text-center">{cfg.videoTitle}</span>}
            </div>
          </div>
        );

      case "description":
        if (!cfg.bodyText) return null;
        return (
          <div
            key="description"
            className="px-4 py-3 event-prose text-[#5C4A3E] leading-relaxed"
            style={{ fontSize: "10px" }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(cfg.bodyText) }}
          />
        );

      case "community":
        if (!cfg.showWhatsappButton || cfg.whatsappAccess !== "always" || !cfg.whatsappUrl) return null;
        return (
          <div key="community" className="mx-3 my-2">
            <button
              className="w-full py-2 text-[10px] text-white flex items-center justify-center gap-1.5"
              style={{ backgroundColor: previewAccent }}
            >
              <Link2 size={11} />
              {cfg.whatsappButtonLabel || "Únete a la comunidad"}
            </button>
          </div>
        );

      case "map":
        if (cfg.eventType === "ONLINE" || !cfg.eventLocation) return null;
        return (
          <div key="map" className="mx-3 my-2 h-14 bg-[#EDE2D8] border border-[#D8BFAE] flex items-center justify-center gap-1.5 text-[#8E7A6B]">
            <MapPin size={11} />
            <span className="text-[9px]">Mapa — {cfg.eventLocation}</span>
          </div>
        );

      case "features":
        if (!cfg.showFeatures || cfg.features.filter((f) => f.title).length === 0) return null;
        return (
          <div key="features" className="px-3 py-2 space-y-1.5">
            {cfg.features.filter((f) => f.title).map((f, i) => (
              <div key={i} className="bg-white border-l-2 p-2" style={{ borderColor: previewAccent }}>
                <p className="text-[10px] font-medium" style={{ color: previewAccent, fontFamily: "Georgia, serif" }}>{f.title}</p>
                {f.text && <p className="text-[9px] text-[#8E7A6B] mt-0.5">{f.text}</p>}
              </div>
            ))}
          </div>
        );

      case "gallery": {
        const imgs = cfg.gallery.filter(Boolean);
        if (imgs.length === 0) return null;
        if (imgs.length === 1) {
          return (
            <div key="gallery" className="mx-3 my-2">
              <img src={imgs[0]} alt="" className="w-full aspect-video object-cover" />
            </div>
          );
        }
        return (
          <div key="gallery" className="mx-3 my-2">
            <div className="relative">
              <img src={imgs[0]} alt="" className="w-full aspect-video object-cover" />
              <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[8px] px-1.5 py-0.5 rounded-sm">
                1 / {imgs.length}
              </div>
            </div>
            <div className="flex gap-1 mt-1">
              {imgs.slice(0, 5).map((url, i) => (
                <img key={i} src={url} alt="" className="w-8 h-8 shrink-0 object-cover opacity-70" />
              ))}
              {imgs.length > 5 && <span className="text-[8px] text-[#8E7A6B] flex items-center pl-1">+{imgs.length - 5}</span>}
            </div>
          </div>
        );
      }

      case "socialProof":
        if (!cfg.showSocialProof) return null;
        return (
          <div key="socialProof" className="py-3 text-center">
            <p className="text-lg font-bold" style={{ color: previewAccent }}>{cfg.socialProofCount}</p>
            <p className="text-[9px] text-[#8E7A6B]">{cfg.socialProofText}</p>
          </div>
        );

      default:
        return null;
    }
  }

  const eventPreview = (
    <div style={{ backgroundColor: previewBg, minHeight: "100%", fontFamily: "Georgia, serif", fontSize: "11px" }}>
      {/* Hero — always first */}
      <div className="relative" style={{ backgroundColor: previewAccent, minHeight: 160 }}>
        {cfg.heroImage && (
          <img src={cfg.heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 to-black/50" />
        <div className="relative z-10 p-5 text-white">
          {cfg.headline && <h1 className="text-base font-bold leading-tight mb-1">{cfg.headline}</h1>}
          {cfg.subheadline && <p className="opacity-90 text-[11px]">{cfg.subheadline}</p>}
          {cfg.eventDate && (
            <div className="inline-flex items-center gap-1.5 bg-white/20 px-2 py-1 text-[9px] mt-2">
              <Calendar size={9} />
              <span>
                {cfg.eventDate}
                {cfg.eventEndDate ? ` — ${cfg.eventEndDate}` : cfg.eventTime ? ` · ${cfg.eventTime}` : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Info card — always second */}
      <div className="mx-3 -mt-4 relative z-10 bg-white border border-[#EDE2D8] shadow p-3 space-y-2">
        {cfg.eventDate && (
          <div className="flex items-center gap-2" style={{ color: previewAccent }}>
            <Calendar size={11} />
            <span className="text-[10px] font-medium">
              {cfg.eventDate}
              {cfg.eventEndDate
                ? ` — ${cfg.eventEndDate}`
                : <>
                    {cfg.eventTime && ` · ${cfg.eventTime}`}
                    {cfg.eventEndTime && ` — ${cfg.eventEndTime}`}
                  </>
              }
            </span>
          </div>
        )}
        {cfg.eventLocation && (
          <div className="flex items-start gap-2 text-[#5C4A3E]">
            <MapPin size={11} className="shrink-0 mt-0.5" style={{ color: previewAccent }} />
            <span className="text-[10px] leading-tight">{cfg.eventLocation}</span>
          </div>
        )}
        <div className="flex items-center gap-3 text-[#8E7A6B] border-t border-[#F0EBE6] pt-2">
          <span className="flex items-center gap-1 text-[9px]">
            <Globe size={10} />
            {cfg.eventType === "IN_PERSON" ? "Presencial" : cfg.eventType === "ONLINE" ? "Online" : "Híbrido"}
          </span>
          <span className="flex items-center gap-1 text-[9px]" style={{ color: previewAccent }}>
            <Ticket size={10} />
            {cfg.ticketMode === "FREE"
              ? "Gratuito"
              : cfg.ticketMode === "PAID_BY_DAY"
              ? cfg.dayTickets.length > 0
                ? `Desde $${Math.min(...cfg.dayTickets.map((d) => d.price)).toLocaleString("es-CL")}`
                : "Por día"
              : `$${cfg.ticketPrice.toLocaleString("es-CL")}`
            }
          </span>
        </div>
      </div>

      {/* Dynamic sections in configured order */}
      <div className="mt-3">
        {sectionOrder.map((key) => renderPreviewSection(key))}
      </div>

      {/* Form / CTA — always last */}
      <div className="mx-3 my-3 bg-white border border-[#EDE2D8] p-3 space-y-2">
        {cfg.formTitle && <p className="text-[11px] font-bold" style={{ color: previewAccent, fontFamily: "Georgia, serif" }}>{cfg.formTitle}</p>}
        {cfg.formSubtitle && <p className="text-[9px] text-[#8E7A6B]">{cfg.formSubtitle}</p>}
        {cfg.collectName  && <div className="h-5 bg-[#F7F4F1] border border-[#D8BFAE] px-2 text-[8px] text-[#8E7A6B] flex items-center">Nombre</div>}
        {cfg.collectEmail && <div className="h-5 bg-[#F7F4F1] border border-[#D8BFAE] px-2 text-[8px] text-[#8E7A6B] flex items-center">Email</div>}
        {cfg.collectPhone && <div className="h-5 bg-[#F7F4F1] border border-[#D8BFAE] px-2 text-[8px] text-[#8E7A6B] flex items-center">Teléfono</div>}
        {cfg.ticketMode === "PAID" && cfg.enabledPayments.length > 0 && (
          <div className="pt-1 border-t border-[#EDE2D8] flex items-center justify-between">
            <span className="text-[9px] text-[#8E7A6B]">{cfg.ticketName || "Entrada"}</span>
            <span className="text-[10px] font-bold" style={{ color: previewAccent }}>${cfg.ticketPrice.toLocaleString("es-CL")}</span>
          </div>
        )}
        {cfg.ticketMode === "PAID_BY_DAY" && cfg.dayTickets.length > 0 && (
          <div className="pt-1 border-t border-[#EDE2D8] space-y-1">
            {cfg.dayTickets.slice(0, 3).map((d, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 border border-[#D8BFAE] rounded-sm shrink-0" />
                <span className="text-[8px] text-[#8E7A6B] flex-1 truncate">{d.label || d.date}</span>
                <span className="text-[8px] font-medium" style={{ color: previewAccent }}>${d.price.toLocaleString("es-CL")}</span>
              </div>
            ))}
            {cfg.dayTickets.length > 3 && <span className="text-[8px] text-[#8E7A6B]">+{cfg.dayTickets.length - 3} más</span>}
          </div>
        )}
        <button
          className="w-full py-2 text-[10px] text-white mt-1"
          style={{ backgroundColor: previewAccent }}
        >
          {cfg.ctaLabel || "Reservar entrada"}
        </button>
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-[#F7F4F1]">
      {/* Topbar */}
      <div className="bg-white border-b border-[#D8BFAE] px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => router.push("/admin/landing-pages")} className="text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors">
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título del evento…"
          className="flex-1 bg-transparent text-sm text-[#5C4A3E] font-medium outline-none placeholder:text-[#8E7A6B]"
        />
        {mode === "edit" && (
          <button
            onClick={() => { update("enabledPayments", cfg.enabledPayments); setIsActive(!isActive); start(async () => {
              await updateEventLP(id!, { isActive: !isActive });
              setIsActive((v) => !v);
            }); }}
            className="flex items-center gap-1.5 text-[10px] shrink-0"
          >
            {isActive
              ? <><ToggleRight size={16} className="text-emerald-500" /><span className="text-emerald-600">Activo</span></>
              : <><ToggleLeft  size={16} className="text-[#8E7A6B]"  /><span className="text-[#8E7A6B]">Inactivo</span></>}
          </button>
        )}
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-1.5 border border-[#D8BFAE] text-[10px] tracking-[0.1em] uppercase text-[#8E7A6B] px-3 py-1.5 hover:border-[#CDA78F] transition-colors"
        >
          {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
          Preview
        </button>
        <button
          onClick={handleSave}
          disabled={isPending}
          className={`flex items-center gap-1.5 text-white text-[10px] tracking-[0.15em] uppercase px-4 py-1.5 transition-colors ${
            saved ? "bg-emerald-500" : "bg-[#CDA78F] hover:bg-[#8E7A6B]"
          } disabled:opacity-50`}
        >
          <Save size={12} strokeWidth={2} />
          {isPending ? "Guardando…" : saved ? "¡Guardado!" : mode === "create" ? "Crear evento" : "Guardar"}
        </button>
      </div>

      {error && (
        <p className="px-4 py-2 text-[10px] text-red-500 bg-red-50 border-b border-red-200">{error}</p>
      )}

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor panel */}
        <div className="w-72 shrink-0 flex flex-col border-r border-[#D8BFAE] bg-white overflow-hidden">
          {/* Tabs */}
          <div className="flex overflow-x-auto scrollbar-none border-b border-[#EDE2D8]">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex flex-col items-center gap-0.5 px-3 py-2.5 text-[8px] tracking-[0.1em] uppercase shrink-0 transition-colors border-b-2 ${
                  tab === t.key
                    ? "border-[#CDA78F] text-[#5C4A3E]"
                    : "border-transparent text-[#8E7A6B] hover:text-[#5C4A3E]"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">

            {/* ── EVENTO ── */}
            {tab === "evento" && (
              <>
                <Section title="Información básica">
                  <div>
                    <Label>Titular del evento</Label>
                    <Input value={cfg.headline} onChange={(v) => update("headline", v)} placeholder="Nombre del evento" />
                  </div>
                  <div>
                    <Label>Subtítulo</Label>
                    <Input value={cfg.subheadline} onChange={(v) => update("subheadline", v)} placeholder="Tagline o descripción breve" />
                  </div>
                  <div>
                    <Label>Descripción</Label>
                    <RichTextEditor
                      value={cfg.bodyText}
                      onChange={(v) => update("bodyText", v)}
                      placeholder="Describe el evento…"
                      minHeight={90}
                    />
                  </div>
                </Section>

                <Section title="Fecha y hora">
                  <Toggle
                    checked={!!cfg.eventEndDate}
                    onChange={(v) => update("eventEndDate", v ? cfg.eventDate : "")}
                    label="Evento de varios días"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>{cfg.eventEndDate ? "Fecha inicio *" : "Fecha *"}</Label>
                      <Input type="date" value={cfg.eventDate} onChange={(v) => update("eventDate", v)} />
                    </div>
                    {cfg.eventEndDate ? (
                      <div>
                        <Label>Fecha fin *</Label>
                        <Input type="date" value={cfg.eventEndDate} onChange={(v) => update("eventEndDate", v)} />
                      </div>
                    ) : (
                      <div>
                        <Label>Hora inicio</Label>
                        <Input type="time" value={cfg.eventTime} onChange={(v) => update("eventTime", v)} />
                      </div>
                    )}
                  </div>
                  {!cfg.eventEndDate && (
                    <div>
                      <Label>Hora término</Label>
                      <Input type="time" value={cfg.eventEndTime} onChange={(v) => update("eventEndTime", v)} />
                    </div>
                  )}
                  {cfg.eventEndDate && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Hora inicio</Label>
                        <Input type="time" value={cfg.eventTime} onChange={(v) => update("eventTime", v)} />
                      </div>
                      <div>
                        <Label>Hora término</Label>
                        <Input type="time" value={cfg.eventEndTime} onChange={(v) => update("eventEndTime", v)} />
                      </div>
                    </div>
                  )}
                </Section>

                <Section title="Lugar">
                  <div>
                    <Label>Tipo de evento</Label>
                    <select
                      value={cfg.eventType}
                      onChange={(e) => update("eventType", e.target.value as EventConfig["eventType"])}
                      className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                    >
                      <option value="IN_PERSON">Presencial</option>
                      <option value="ONLINE">Online</option>
                      <option value="HYBRID">Híbrido (presencial + online)</option>
                    </select>
                  </div>
                  <div>
                    <Label>
                      {cfg.eventType === "ONLINE" ? "Plataforma / descripción" : "Dirección"}
                    </Label>
                    <Input
                      value={cfg.eventLocation}
                      onChange={(v) => update("eventLocation", v)}
                      placeholder={cfg.eventType === "ONLINE" ? "Zoom, Google Meet, presencial…" : "Av. Ejemplo 123, Ciudad"}
                    />
                  </div>
                  <div>
                    <Label>URL de ubicación</Label>
                    <Input
                      value={cfg.eventLocationUrl}
                      onChange={(v) => update("eventLocationUrl", v)}
                      placeholder={cfg.eventType === "ONLINE" ? "https://meet.google.com/..." : "https://maps.google.com/..."}
                    />
                    <p className="text-[9px] text-[#8E7A6B] mt-1">Se mostrará como enlace en la landing.</p>
                  </div>
                </Section>

                <Section title="Capacidad">
                  <div>
                    <Label>Cupos disponibles</Label>
                    <Input
                      type="number"
                      value={String(cfg.eventCapacity)}
                      onChange={(v) => update("eventCapacity", Math.max(0, parseInt(v) || 0))}
                      placeholder="0 = ilimitado"
                    />
                    <p className="text-[9px] text-[#8E7A6B] mt-1">0 = sin límite de cupos</p>
                  </div>
                </Section>
              </>
            )}

            {/* ── DISEÑO ── */}
            {tab === "diseno" && (
              <>
                <Section title="Orden de secciones">
                  <p className="text-[9px] text-[#8E7A6B] mb-2">Arrastra para reordenar los bloques de la landing.</p>
                  <div className="space-y-1">
                    {sectionOrder.map((key, idx) => {
                      const meta = SECTION_META.find((m) => m.key === key);
                      if (!meta) return null;
                      return (
                        <div
                          key={key}
                          draggable
                          onDragStart={() => setDraggingIdx(idx)}
                          onDragOver={(e) => e.preventDefault()}
                          onDragEnter={(e) => {
                            e.preventDefault();
                            if (draggingIdx === null || draggingIdx === idx) return;
                            const newOrder = [...sectionOrder];
                            const [item] = newOrder.splice(draggingIdx, 1);
                            newOrder.splice(idx, 0, item);
                            update("sectionOrder", newOrder);
                            setDraggingIdx(idx);
                          }}
                          onDrop={(e) => e.preventDefault()}
                          onDragEnd={() => { setDraggingIdx(null); setDragOverIdx(null); }}
                          className={`flex items-center gap-2 px-2 py-1.5 bg-white border cursor-grab select-none transition-colors ${
                            dragOverIdx === idx && draggingIdx !== idx
                              ? "border-[#CDA78F] bg-[#FDF8F4]"
                              : "border-[#EDE2D8]"
                          } ${draggingIdx === idx ? "opacity-40" : ""}`}
                        >
                          <GripVertical size={12} className="text-[#C4AD9E] shrink-0" strokeWidth={1.5} />
                          <span className="text-[#8E7A6B]">{meta.icon}</span>
                          <span className="text-[10px] text-[#5C4A3E]">{meta.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </Section>

                <Section title="Imagen principal">
                  {cfg.heroImage && (
                    <div className="relative">
                      <img src={cfg.heroImage} alt="" className="w-full h-24 object-cover rounded" />
                      <button
                        onClick={() => update("heroImage", null)}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70"
                      >
                        <ChevronDown size={10} className="rotate-45" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <label className={`flex items-center gap-1.5 border border-[#D8BFAE] px-3 py-2 text-[10px] text-[#8E7A6B] cursor-pointer hover:border-[#CDA78F] transition-colors shrink-0 ${heroUploading ? "opacity-50 pointer-events-none" : ""}`}>
                      {heroUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                      Subir
                      <input type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} />
                    </label>
                    <Input value={cfg.heroImage ?? ""} onChange={(v) => update("heroImage", v || null)} placeholder="O pegar URL de imagen…" />
                  </div>
                  {heroUploadError && <p className="text-[10px] text-red-500">{heroUploadError}</p>}
                </Section>

                <Section title="Video">
                  <Toggle checked={cfg.showVideo} onChange={(v) => update("showVideo", v)} label="Mostrar video" />
                  {cfg.showVideo && (
                    <>
                      <div>
                        <Label>Subir o pegar URL</Label>
                        <div className="flex gap-2">
                          <label className={`flex items-center gap-1.5 border border-[#D8BFAE] px-3 py-2 text-[10px] text-[#8E7A6B] cursor-pointer hover:border-[#CDA78F] transition-colors shrink-0 ${videoUploading ? "opacity-50 pointer-events-none" : ""}`}>
                            {videoUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                            Subir
                            <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                          </label>
                          <Input value={cfg.videoUrl ?? ""} onChange={(v) => update("videoUrl", v || null)} placeholder="YouTube, Vimeo, enlace directo…" />
                        </div>
                        {videoUploadError && <p className="text-[10px] text-red-500 mt-1">{videoUploadError}</p>}
                      </div>
                      <div>
                        <Label>Título del video</Label>
                        <Input value={cfg.videoTitle} onChange={(v) => update("videoTitle", v)} />
                      </div>
                      <div>
                        <Label>Orientación</Label>
                        <div className="flex gap-2">
                          {(["horizontal", "vertical"] as const).map((o) => (
                            <button
                              key={o}
                              onClick={() => update("videoOrientation", o)}
                              className={`flex-1 py-1.5 text-[10px] uppercase tracking-wide transition-colors ${
                                cfg.videoOrientation === o
                                  ? "bg-[#CDA78F] text-white"
                                  : "bg-[#F7F4F1] border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F]"
                              }`}
                            >
                              {o}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </Section>

                <Section title="Galería de imágenes">
                  {cfg.gallery.map((url, i) => (
                    <div key={i} className="space-y-1">
                      {url && <img src={url} alt="" className="w-full h-16 object-cover rounded" />}
                      <div className="flex gap-2">
                        <label className={`flex items-center gap-1 border border-[#D8BFAE] px-2 py-2 text-[10px] text-[#8E7A6B] cursor-pointer hover:border-[#CDA78F] transition-colors shrink-0 ${galleryUploading[i] ? "opacity-50 pointer-events-none" : ""}`}>
                          {galleryUploading[i] ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleGalleryUpload(e, i)} />
                        </label>
                        <Input value={url} onChange={(v) => {
                          const g = [...cfg.gallery]; g[i] = v; update("gallery", g);
                        }} placeholder="O pegar URL…" />
                        <button
                          onClick={() => update("gallery", cfg.gallery.filter((_, j) => j !== i))}
                          className="text-[#8E7A6B] hover:text-red-500 shrink-0"
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => update("gallery", [...cfg.gallery, ""])}
                    className="flex items-center gap-1.5 text-[10px] text-[#8E7A6B] hover:text-[#CDA78F] transition-colors"
                  >
                    <Plus size={12} strokeWidth={2} />
                    Agregar imagen
                  </button>
                </Section>

                <Section title="Colores">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Color acento</Label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={cfg.accentColor}
                          onChange={(e) => update("accentColor", e.target.value)}
                          className="w-8 h-8 border border-[#D8BFAE] cursor-pointer"
                        />
                        <Input value={cfg.accentColor} onChange={(v) => update("accentColor", v)} />
                      </div>
                    </div>
                    <div>
                      <Label>Color fondo</Label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={cfg.bgColor}
                          onChange={(e) => update("bgColor", e.target.value)}
                          className="w-8 h-8 border border-[#D8BFAE] cursor-pointer"
                        />
                        <Input value={cfg.bgColor} onChange={(v) => update("bgColor", v)} />
                      </div>
                    </div>
                  </div>
                </Section>
              </>
            )}

            {/* ── ENTRADAS ── */}
            {tab === "entradas" && (
              <>
                <Section title="Tipo de entrada">
                  <div>
                    <Label>Modo</Label>
                    <div className="flex gap-1.5">
                      {(["FREE", "PAID", "PAID_BY_DAY"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => update("ticketMode", m)}
                          className={`flex-1 py-2 text-[10px] uppercase tracking-wide transition-colors ${
                            cfg.ticketMode === m
                              ? "bg-[#CDA78F] text-white"
                              : "bg-[#F7F4F1] border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F]"
                          }`}
                        >
                          {m === "FREE" ? "Gratis" : m === "PAID" ? "De pago" : "Por día"}
                        </button>
                      ))}
                    </div>
                    {cfg.ticketMode === "PAID_BY_DAY" && (
                      <p className="text-[9px] text-[#8E7A6B] mt-1">Los asistentes eligen cuáles días asistir y pagan solo esos.</p>
                    )}
                  </div>

                  <div>
                    <Label>Nombre de la entrada</Label>
                    <Input value={cfg.ticketName} onChange={(v) => update("ticketName", v)} placeholder="Entrada, Ticket, Inscripción…" />
                  </div>

                  {cfg.ticketMode === "PAID" && (
                    <>
                      <div>
                        <Label>Precio (CLP)</Label>
                        <Input
                          type="number"
                          value={String(cfg.ticketPrice)}
                          onChange={(v) => update("ticketPrice", Math.max(0, parseInt(v) || 0))}
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <Label>Métodos de pago disponibles</Label>
                        {availablePayments.length === 0 && (
                          <p className="text-[10px] text-amber-600 bg-amber-50 px-3 py-2">
                            No hay métodos de pago configurados. Ve a Configuración → Pagos.
                          </p>
                        )}
                        <div className="space-y-1.5 mt-1">
                          {availablePayments.map((p) => (
                            <label key={p.key} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={cfg.enabledPayments.includes(p.key)}
                                onChange={() => togglePayment(p.key)}
                                className="w-3.5 h-3.5 accent-[#CDA78F]"
                              />
                              <span className="text-[10px] text-[#5C4A3E]">{p.label}</span>
                            </label>
                          ))}
                        </div>
                        {storeSettings.transferEnabled && (
                          <div className="mt-2 p-2 bg-[#EDE2D8]/40 border border-[#EDE2D8]">
                            <p className="text-[9px] text-[#8E7A6B] font-medium mb-1">Datos bancarios configurados:</p>
                            <p className="text-[9px] text-[#8E7A6B]">
                              {storeSettings.transferBankName} — {storeSettings.transferAccountName}
                              {storeSettings.transferRut && ` · RUT ${storeSettings.transferRut}`}
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {cfg.ticketMode === "PAID_BY_DAY" && (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label>Días y precios</Label>
                          {cfg.eventDate && cfg.eventEndDate && (
                            <button
                              type="button"
                              onClick={() => {
                                const dates = datesInRange(cfg.eventDate, cfg.eventEndDate);
                                const existing = cfg.dayTickets.reduce((acc, t) => { acc[t.date] = t; return acc; }, {} as Record<string, EventConfig["dayTickets"][0]>);
                                update("dayTickets", dates.map((date) => existing[date] ?? { date, label: fmtShortDate(date), price: 0 }));
                              }}
                              className="text-[9px] text-[#CDA78F] hover:text-[#8E7A6B] transition-colors underline"
                            >
                              Auto-rellenar desde fechas
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {cfg.dayTickets.map((t, i) => (
                            <div key={i} className="bg-[#F7F4F1] border border-[#EDE2D8] p-2 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <input
                                  type="date"
                                  value={t.date}
                                  onChange={(e) => {
                                    const arr = [...cfg.dayTickets]; arr[i] = { ...arr[i], date: e.target.value };
                                    update("dayTickets", arr);
                                  }}
                                  className="bg-transparent text-[9px] text-[#8E7A6B] outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => update("dayTickets", cfg.dayTickets.filter((_, j) => j !== i))}
                                  className="text-[#8E7A6B] hover:text-red-500"
                                >
                                  <Trash2 size={11} strokeWidth={1.5} />
                                </button>
                              </div>
                              <Input
                                value={t.label}
                                onChange={(v) => {
                                  const arr = [...cfg.dayTickets]; arr[i] = { ...arr[i], label: v };
                                  update("dayTickets", arr);
                                }}
                                placeholder="Ej: Día 1 · Taller de inicio"
                              />
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-[#8E7A6B] shrink-0">$</span>
                                <Input
                                  type="number"
                                  value={String(t.price)}
                                  onChange={(v) => {
                                    const arr = [...cfg.dayTickets]; arr[i] = { ...arr[i], price: Math.max(0, parseInt(v) || 0) };
                                    update("dayTickets", arr);
                                  }}
                                  placeholder="Precio CLP"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => update("dayTickets", [...cfg.dayTickets, { date: cfg.eventDate || "", label: "", price: 0 }])}
                          className="flex items-center gap-1.5 text-[10px] text-[#8E7A6B] hover:text-[#CDA78F] mt-1.5"
                        >
                          <Plus size={12} strokeWidth={2} />
                          Agregar día
                        </button>
                      </div>

                      <div>
                        <Label>Métodos de pago disponibles</Label>
                        {availablePayments.length === 0 && (
                          <p className="text-[10px] text-amber-600 bg-amber-50 px-3 py-2">
                            No hay métodos de pago configurados. Ve a Configuración → Pagos.
                          </p>
                        )}
                        <div className="space-y-1.5 mt-1">
                          {availablePayments.map((p) => (
                            <label key={p.key} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={cfg.enabledPayments.includes(p.key)}
                                onChange={() => togglePayment(p.key)}
                                className="w-3.5 h-3.5 accent-[#CDA78F]"
                              />
                              <span className="text-[10px] text-[#5C4A3E]">{p.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </Section>
              </>
            )}

            {/* ── COMUNIDAD ── */}
            {tab === "whatsapp" && (
              <>
                <Section title="Botón de comunidad">
                  <Toggle
                    checked={cfg.showWhatsappButton}
                    onChange={(v) => update("showWhatsappButton", v)}
                    label="Mostrar botón de enlace a comunidad"
                  />

                  {cfg.showWhatsappButton && (
                    <>
                      <div>
                        <Label>URL de la comunidad / grupo</Label>
                        <Input
                          value={cfg.whatsappUrl}
                          onChange={(v) => update("whatsappUrl", v)}
                          placeholder="https://..."
                        />
                        <p className="text-[9px] text-[#8E7A6B] mt-1">
                          Funciona con WhatsApp, Facebook, Telegram, Skool, Discord, Instagram, Slack, Notion, etc.
                        </p>
                      </div>

                      <div>
                        <Label>Texto del botón</Label>
                        <Input
                          value={cfg.whatsappButtonLabel}
                          onChange={(v) => update("whatsappButtonLabel", v)}
                          placeholder="Únete a la comunidad"
                        />
                      </div>

                      <div>
                        <Label>¿Cuándo se muestra?</Label>
                        <select
                          value={cfg.whatsappAccess}
                          onChange={(e) => update("whatsappAccess", e.target.value as EventConfig["whatsappAccess"])}
                          className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                        >
                          <option value="always">Siempre visible en la landing</option>
                          <option value="after_registration">Solo tras registrarse</option>
                          <option value="on_ticket">Solo en la entrada / ticket</option>
                        </select>
                        <p className="text-[9px] text-[#8E7A6B] mt-1">
                          {cfg.whatsappAccess === "on_ticket"
                            ? "El enlace aparece en la entrada imprimible del asistente."
                            : cfg.whatsappAccess === "after_registration"
                            ? "Se revela en la pantalla de confirmación tras registrarse."
                            : "Visible para cualquier visitante antes y después de registrarse."}
                        </p>
                      </div>
                    </>
                  )}

                  {!cfg.showWhatsappButton && (
                    <p className="text-[10px] text-[#8E7A6B]">
                      Activa el botón para agregar un enlace a cualquier comunidad: WhatsApp, Facebook, Telegram, Skool, Discord, Instagram, Slack y más.
                    </p>
                  )}
                </Section>
              </>
            )}

            {/* ── FORMULARIO ── */}
            {tab === "formulario" && (
              <>
                <Section title="Texto del formulario">
                  <div>
                    <Label>Título</Label>
                    <Input value={cfg.formTitle} onChange={(v) => update("formTitle", v)} placeholder="Reserva tu lugar" />
                  </div>
                  <div>
                    <Label>Subtítulo</Label>
                    <Input value={cfg.formSubtitle} onChange={(v) => update("formSubtitle", v)} placeholder="Completa tus datos…" />
                  </div>
                  <div>
                    <Label>Texto del botón</Label>
                    <Input value={cfg.ctaLabel} onChange={(v) => update("ctaLabel", v)} placeholder="Reservar entrada" />
                  </div>
                </Section>

                <Section title="Campos a recopilar">
                  <div className="space-y-2">
                    {[
                      { key: "collectName",     label: "Nombre completo" },
                      { key: "collectEmail",    label: "Email" },
                      { key: "collectPhone",    label: "Teléfono" },
                      { key: "collectWhatsapp", label: "WhatsApp" },
                    ].map((f) => (
                      <Toggle
                        key={f.key}
                        checked={cfg[f.key as keyof EventConfig] as boolean}
                        onChange={(v) => update(f.key as keyof EventConfig, v as never)}
                        label={f.label}
                      />
                    ))}
                  </div>
                </Section>

                <Section title="Campos obligatorios">
                  <div className="space-y-2">
                    {[
                      { key: "requireEmail", label: "Email obligatorio" },
                      { key: "requirePhone", label: "Teléfono obligatorio" },
                    ].map((f) => (
                      <Toggle
                        key={f.key}
                        checked={cfg[f.key as keyof EventConfig] as boolean}
                        onChange={(v) => update(f.key as keyof EventConfig, v as never)}
                        label={f.label}
                      />
                    ))}
                  </div>
                </Section>

                <Section title="Confirmación">
                  <div>
                    <Label>Título de pantalla de éxito</Label>
                    <Input value={cfg.thankYouTitle} onChange={(v) => update("thankYouTitle", v)} placeholder="¡Registro completado!" />
                  </div>
                  <div>
                    <Label>Mensaje de éxito</Label>
                    <Textarea value={cfg.thankYouText} onChange={(v) => update("thankYouText", v)} rows={2} placeholder="Te esperamos en el evento." />
                  </div>
                </Section>

                <Section title="Etiquetas CRM automáticas">
                  <div>
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {cfg.autoTags.map((tag, i) => (
                        <span key={i} className="flex items-center gap-1 text-[9px] bg-[#EDE2D8] text-[#5C4A3E] px-2 py-0.5">
                          {tag}
                          <button onClick={() => update("autoTags", cfg.autoTags.filter((_, j) => j !== i))}>
                            <Trash2 size={9} strokeWidth={2} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nueva etiqueta"
                        className="flex-1 bg-white border border-[#D8BFAE] px-2 py-1.5 text-[10px] text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val && !cfg.autoTags.includes(val)) {
                              update("autoTags", [...cfg.autoTags, val]);
                              (e.target as HTMLInputElement).value = "";
                            }
                          }
                        }}
                      />
                    </div>
                    <p className="text-[9px] text-[#8E7A6B] mt-1">Presiona Enter o coma para agregar.</p>
                  </div>
                </Section>
              </>
            )}

            {/* ── CONTENIDO ── */}
            {tab === "contenido" && (
              <>
                <Section title="Beneficios / Puntos clave">
                  <Toggle checked={cfg.showFeatures} onChange={(v) => update("showFeatures", v)} label="Mostrar sección de beneficios" />
                  {cfg.showFeatures && (
                    <>
                      {cfg.features.map((f, i) => (
                        <div key={i} className="bg-[#F7F4F1] p-2 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-[#8E7A6B] uppercase tracking-wide">Punto {i + 1}</span>
                            <button onClick={() => update("features", cfg.features.filter((_, j) => j !== i))}>
                              <Trash2 size={11} strokeWidth={1.5} className="text-[#8E7A6B] hover:text-red-500" />
                            </button>
                          </div>
                          <Input
                            value={f.title}
                            onChange={(v) => {
                              const arr = [...cfg.features]; arr[i] = { ...arr[i], title: v };
                              update("features", arr);
                            }}
                            placeholder="Título"
                          />
                          <Textarea
                            value={f.text}
                            onChange={(v) => {
                              const arr = [...cfg.features]; arr[i] = { ...arr[i], text: v };
                              update("features", arr);
                            }}
                            rows={2}
                            placeholder="Descripción…"
                          />
                        </div>
                      ))}
                      <button
                        onClick={() => update("features", [...cfg.features, { title: "", text: "" }])}
                        className="flex items-center gap-1.5 text-[10px] text-[#8E7A6B] hover:text-[#CDA78F]"
                      >
                        <Plus size={12} strokeWidth={2} />
                        Agregar punto
                      </button>
                    </>
                  )}
                </Section>

                <Section title="Prueba social">
                  <Toggle checked={cfg.showSocialProof} onChange={(v) => update("showSocialProof", v)} label="Mostrar contador social" />
                  {cfg.showSocialProof && (
                    <>
                      <div>
                        <Label>Número / cifra</Label>
                        <Input value={cfg.socialProofCount} onChange={(v) => update("socialProofCount", v)} placeholder="50+" />
                      </div>
                      <div>
                        <Label>Descripción</Label>
                        <Input value={cfg.socialProofText} onChange={(v) => update("socialProofText", v)} placeholder="personas registradas" />
                      </div>
                    </>
                  )}
                </Section>
              </>
            )}

            {/* ── AVANZADO ── */}
            {tab === "avanzado" && (
              <>
                <Section title="Código HTML personalizado">
                  <div>
                    <Label>{"<head> (Meta Pixel, GTM, etc.)"}</Label>
                    <Textarea
                      value={cfg.customHeadHtml}
                      onChange={(v) => update("customHeadHtml", v)}
                      rows={5}
                      placeholder="<!-- Scripts en el <head> -->"
                    />
                  </div>
                  <div>
                    <Label>{"<body> (chat widgets, embeds)"}</Label>
                    <Textarea
                      value={cfg.customBodyHtml}
                      onChange={(v) => update("customBodyHtml", v)}
                      rows={5}
                      placeholder="<!-- Scripts antes de </body> -->"
                    />
                  </div>
                </Section>
              </>
            )}

          </div>
        </div>

        {/* Preview panel */}
        {showPreview && (
          <DevicePreviewShell>
            {eventPreview}
          </DevicePreviewShell>
        )}
      </div>
    </div>
  );
}
