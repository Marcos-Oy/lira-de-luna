"use client";

import { useState, useTransition, useMemo } from "react";
import type { LPProduct } from "@/app/lp/[slug]/page";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Save, Loader2, Plus, X, ChevronDown, ChevronUp, Eye,
  Upload, Trash2, Video,
} from "lucide-react";
import { createLandingPage, updateLandingPage } from "@/app/actions/admin/landingPages";
import type { LandingPageConfig } from "@/lib/crm";
import DevicePreviewShell from "@/components/admin/DevicePreviewShell";

// ── Props ─────────────────────────────────────────────────────

export type ProductOption = {
  id: string; slug: string; name: string; price: number;
  image: string | null; collectionName: string; collectionSlug: string;
};
export type CollectionOption = { slug: string; name: string };

type SharedProps = {
  initialConfig: LandingPageConfig;
  products: ProductOption[];
  collections: CollectionOption[];
};

type Props =
  | (SharedProps & { mode: "create" })
  | (SharedProps & { mode: "edit"; id: string; title: string; slug: string });

// ── Section accordion ─────────────────────────────────────────

function Section({ title, children, defaultOpen = false }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#D8BFAE] rounded bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-[#5C4A3E] hover:bg-[#F7F4F1] transition-colors"
      >
        <span className="text-[9px] tracking-[0.15em] uppercase">{title}</span>
        {open ? <ChevronUp size={13} className="text-[#8E7A6B]" /> : <ChevronDown size={13} className="text-[#8E7A6B]" />}
      </button>
      {open && <div className="px-4 pb-4 pt-1 space-y-3 border-t border-[#D8BFAE]">{children}</div>}
    </div>
  );
}

// ── Field helpers ─────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] block mb-1">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F] bg-white"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F] resize-none bg-white"
    />
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-8 h-4 rounded-full transition-colors ${checked ? "bg-[#CDA78F]" : "bg-[#D8BFAE]"}`}
      >
        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
      <span className="text-xs text-[#5C4A3E]">{label}</span>
    </label>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 accent-[#CDA78F]"
      />
      <span className="text-xs text-[#5C4A3E]">{label}</span>
    </label>
  );
}

// ── Preview Pane (purpose-built for ~220 px device frames) ────

function PreviewPane({ config, products }: {
  config: LandingPageConfig;
  products: LPProduct[];
}) {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const ac = config.accentColor;
  const bg = config.bgColor;
  const serif = "Georgia, 'Times New Roman', serif";
  const isVertical = config.videoOrientation === "vertical";

  const videoSlot = config.showVideo && config.videoUrl ? (
    <div style={{ padding: "10px 10px 0" }}>
      {config.videoTitle && (
        <p style={{ fontFamily: serif, fontSize: "11px", fontWeight: 600, color: "#5C4A3E", textAlign: "center", margin: "0 0 6px" }}>
          {config.videoTitle}
        </p>
      )}
      <div style={{
        position: "relative", width: isVertical ? "56%" : "100%",
        margin: isVertical ? "0 auto" : undefined,
        paddingBottom: isVertical ? "99.6%" : "56.25%",
        backgroundColor: "#18181B", borderRadius: "8px", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="9" height="10" viewBox="0 0 9 10" fill="rgba(255,255,255,0.8)"><polygon points="1,0.5 8.5,5 1,9.5"/></svg>
          </div>
        </div>
      </div>
      {config.videoCaption && (
        <p style={{ fontSize: "8px", color: "#8E7A6B", textAlign: "center", margin: "5px 0 0" }}>{config.videoCaption}</p>
      )}
    </div>
  ) : null;

  return (
    <div style={{ backgroundColor: bg, minHeight: "100%", fontFamily: "system-ui, sans-serif" }}>

      {/* Brand header */}
      <div style={{ textAlign: "center", padding: "8px 10px", borderBottom: `1px solid ${ac}30` }}>
        <span style={{ fontFamily: serif, color: ac, fontSize: "9px", letterSpacing: "0.25em", textTransform: "uppercase" }}>
          Lira de Luna
        </span>
      </div>

      {/* Hero */}
      <div style={{
        padding: "18px 12px 16px", textAlign: "center",
        background: config.heroImage
          ? `linear-gradient(rgba(0,0,0,0.42),rgba(0,0,0,0.42)) center/cover, url(${config.heroImage}) center/cover no-repeat`
          : undefined,
      }}>
        <h1 style={{ fontFamily: serif, fontSize: "17px", lineHeight: 1.25, color: config.heroImage ? "#fff" : "#5C4A3E", margin: "0 0 5px", fontWeight: 600 }}>
          {config.headline}
        </h1>
        {config.subheadline && (
          <p style={{ fontSize: "10px", color: config.heroImage ? "rgba(255,255,255,0.85)" : "#8E7A6B", margin: "0 0 12px", lineHeight: 1.4 }}>
            {config.subheadline}
          </p>
        )}
        <a href="#" onClick={(e) => e.preventDefault()}
          style={{ display: "inline-block", backgroundColor: ac, color: "#fff", padding: "6px 14px", borderRadius: "8px", fontSize: "9px", textDecoration: "none" }}>
          {config.ctaLabel}
        </a>
      </div>

      {config.videoPosition === "after_hero" && videoSlot}

      {/* Social proof */}
      {config.showSocialProof && (
        <div style={{ padding: "14px 12px", textAlign: "center", backgroundColor: `${ac}15` }}>
          <span style={{ fontFamily: serif, fontSize: "28px", fontWeight: 700, color: ac, display: "block", lineHeight: 1 }}>
            {config.socialProofCount}
          </span>
          <p style={{ fontSize: "9px", color: "#8E7A6B", margin: "3px 0 0" }}>{config.socialProofText}</p>
        </div>
      )}

      {/* Body text */}
      {config.bodyText && (
        <div style={{ padding: "10px 12px" }}>
          <p style={{ fontSize: "9px", color: "#5C4A3E", textAlign: "center", lineHeight: 1.6, whiteSpace: "pre-line", margin: 0 }}>
            {config.bodyText}
          </p>
        </div>
      )}

      {config.videoPosition === "after_social" && videoSlot}

      {/* Products — 2 per row */}
      {config.showProducts && products.length > 0 && (
        <div style={{ padding: "14px 10px" }}>
          <p style={{ fontFamily: serif, fontSize: "12px", fontWeight: 600, color: "#5C4A3E", textAlign: "center", margin: "0 0 8px" }}>
            Nuestras piezas
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            {products.map((p) => (
              <div key={p.id} style={{ borderRadius: "8px", overflow: "hidden", border: `1px solid ${ac}30`, backgroundColor: "#fff" }}>
                <div style={{ width: "100%", aspectRatio: "1", backgroundColor: "#EDE2D8", overflow: "hidden" }}>
                  {p.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                </div>
                <div style={{ padding: "5px 5px 6px" }}>
                  <p style={{ fontSize: "8px", color: "#5C4A3E", margin: "0 0 3px", lineHeight: 1.3, overflow: "hidden", maxHeight: "2.6em" }}>{p.name}</p>
                  <p style={{ fontSize: "9px", fontWeight: 600, color: ac, margin: "0 0 4px" }}>${p.price.toLocaleString("es-CL")}</p>
                  <div style={{ backgroundColor: ac, color: "#fff", borderRadius: "4px", padding: "3px 0", fontSize: "7px", textAlign: "center" }}>
                    {config.productCtaLabel}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {config.videoPosition === "after_products" && videoSlot}

      {/* Features / Beneficios */}
      {config.showFeatures && config.features.length > 0 && (
        <div style={{ padding: "12px 10px", backgroundColor: `${ac}0a` }}>
          <p style={{ fontFamily: serif, fontSize: "11px", fontWeight: 600, color: "#5C4A3E", textAlign: "center", margin: "0 0 8px" }}>¿Por qué elegirnos?</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {config.features.map((f, i) => (
              <div key={i} style={{ backgroundColor: "rgba(255,255,255,0.75)", border: `1px solid ${ac}30`, borderRadius: "8px", padding: "6px 8px" }}>
                <p style={{ fontSize: "9px", fontWeight: 600, color: "#5C4A3E", margin: "0 0 1px" }}>{f.title}</p>
                <p style={{ fontSize: "8px", color: "#8E7A6B", margin: 0, lineHeight: 1.4 }}>{f.text}</p>
              </div>
            ))}
          </div>
          {config.featuresImage && (
            <img
              src={config.featuresImage}
              alt=""
              style={{ width: "100%", borderRadius: "8px", objectFit: "cover", marginTop: "8px", maxHeight: "80px" }}
            />
          )}
        </div>
      )}

      {config.videoPosition === "after_benefits" && videoSlot}

      {/* Form */}
      {config.showForm && (
        <div style={{ padding: "16px 12px", backgroundColor: `${ac}0d` }}>
          <p style={{ fontFamily: serif, fontSize: "14px", fontWeight: 600, color: "#5C4A3E", textAlign: "center", margin: "0 0 3px" }}>
            {config.formTitle}
          </p>
          {config.formSubtitle && (
            <p style={{ fontSize: "9px", color: "#8E7A6B", textAlign: "center", margin: "0 0 10px" }}>{config.formSubtitle}</p>
          )}
          <div style={{ backgroundColor: "rgba(255,255,255,0.97)", borderRadius: "12px", padding: "12px 10px", border: `1px solid ${ac}30` }}>
            {!formSubmitted ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {config.collectName && (
                  <input readOnly placeholder="Nombre completo *"
                    style={{ border: "1px solid #D8BFAE", borderRadius: "8px", padding: "6px 8px", fontSize: "9px", color: "#5C4A3E", width: "100%", boxSizing: "border-box" }} />
                )}
                {config.collectEmail && (
                  <input readOnly placeholder={`Correo${config.requireEmail ? " *" : ""}`}
                    style={{ border: "1px solid #D8BFAE", borderRadius: "8px", padding: "6px 8px", fontSize: "9px", color: "#5C4A3E", width: "100%", boxSizing: "border-box" }} />
                )}
                {config.collectPhone && (
                  <input readOnly placeholder={`Teléfono${config.requirePhone ? " *" : ""}`}
                    style={{ border: "1px solid #D8BFAE", borderRadius: "8px", padding: "6px 8px", fontSize: "9px", color: "#5C4A3E", width: "100%", boxSizing: "border-box" }} />
                )}
                <button
                  onClick={() => setFormSubmitted(true)}
                  style={{ backgroundColor: ac, color: "#fff", border: "none", borderRadius: "8px", padding: "8px 12px", fontSize: "9px", cursor: "pointer", width: "100%", fontWeight: 500 }}
                >
                  {config.ctaLabel}
                </button>
                <p style={{ fontSize: "8px", color: "#8E7A6B", textAlign: "center", margin: 0 }}>Tus datos están seguros.</p>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: `${ac}22`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", fontSize: "16px" }}>
                  ✓
                </div>
                <p style={{ fontFamily: serif, fontSize: "12px", color: "#5C4A3E", fontWeight: 600, margin: "0 0 4px" }}>{config.thankYouTitle}</p>
                <p style={{ fontSize: "9px", color: "#8E7A6B", margin: 0 }}>{config.thankYouText}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "8px 10px", borderTop: `1px solid ${ac}20`, fontSize: "8px", color: "#8E7A6B" }}>
        © Lira de Luna ·{" "}
        <span style={{ textDecoration: "underline", cursor: "pointer" }}>Ir a la tienda</span>
      </div>

    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

export default function LandingPageEditorClient(props: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(props.mode === "edit" ? props.title : "");
  const [config, setConfig] = useState<LandingPageConfig>(props.initialConfig);
  const { products, collections } = props;

  // Maps + filters products to match exactly what the real LP would show
  const filteredPreviewProducts = useMemo<LPProduct[]>(() => {
    const all: LPProduct[] = products.map((p) => ({
      id: p.id, slug: p.slug, name: p.name, price: p.price, image: p.image,
      collectionSlug: p.collectionSlug,
      saleEnabled: false, saleDiscountPct: null, saleStartAt: null, saleEndAt: null,
    }));
    if (config.productMode === "MANUAL") {
      if (config.productIds.length === 0) return [];
      return config.productIds.map((id) => all.find((p) => p.id === id)).filter(Boolean) as LPProduct[];
    }
    if (config.productMode === "COLLECTION") {
      if (!config.collectionSlug) return [];
      return all.filter((p) => p.collectionSlug === config.collectionSlug);
    }
    return all;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, config.productMode, config.productIds.join(","), config.collectionSlug]);
  const [productSearch, setProductSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroUploadError, setHeroUploadError] = useState<string | null>(null);
  const [featImgUploading, setFeatImgUploading] = useState(false);
  const [featImgUploadError, setFeatImgUploadError] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState<number | null>(null);


  async function handleHeroUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeroUploading(true);
    setHeroUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) setC("heroImage", data.url);
      else setHeroUploadError(data.error ?? "Error al subir imagen");
    } finally {
      setHeroUploading(false);
      e.target.value = "";
    }
  }

  async function handleFeatImgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeatImgUploading(true);
    setFeatImgUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) setC("featuresImage", data.url);
      else setFeatImgUploadError(data.error ?? "Error al subir imagen");
    } finally {
      setFeatImgUploading(false);
      e.target.value = "";
    }
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoUploading(true);
    setVideoUploadError(null);
    setVideoUploadProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // Use XHR so we can track upload progress for large files
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/admin/upload-video");
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setVideoUploadProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => {
          const data = JSON.parse(xhr.responseText) as { url?: string; error?: string };
          if (data.url) { setC("videoUrl", data.url); resolve(); }
          else { setVideoUploadError(data.error ?? "Error al subir video"); reject(); }
        };
        xhr.onerror = () => { setVideoUploadError("Error de red al subir video"); reject(); };
        xhr.send(fd);
      });
    } catch { /* already set error */ } finally {
      setVideoUploading(false);
      setVideoUploadProgress(null);
      e.target.value = "";
    }
  }

  function setC<K extends keyof LandingPageConfig>(key: K, value: LandingPageConfig[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  function setFeature(i: number, field: "title" | "text", value: string) {
    setConfig((c) => {
      const features = [...c.features];
      features[i] = { ...features[i], [field]: value };
      return { ...c, features };
    });
  }

  function addTag() {
    const tag = tagInput.trim();
    if (!tag || config.autoTags.includes(tag)) return;
    setC("autoTags", [...config.autoTags, tag]);
    setTagInput("");
  }

  function removeTag(t: string) {
    setC("autoTags", config.autoTags.filter((x) => x !== t));
  }

  function handleSave() {
    if (!title.trim()) { setError("El título es requerido"); return; }
    setError(null);
    startTransition(async () => {
      if (props.mode === "create") {
        const res = await createLandingPage({ title, config });
        if ("error" in res && res.error) { setError(res.error); return; }
        if ("success" in res && res.success) {
          setSuccess("Landing page creada");
          router.push("/admin/landing-pages");
        }
      } else {
        const res = await updateLandingPage(props.id, { title, config });
        if ("error" in res && res.error) { setError(res.error); return; }
        setSuccess("Guardado correctamente");
        setTimeout(() => setSuccess(null), 2500);
      }
    });
  }

  return (
    <div className="flex flex-col h-full bg-[#F7F4F1]">
      {/* Header */}
      <div className="bg-white border-b border-[#D8BFAE] px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/landing-pages")}
            className="flex items-center gap-1.5 text-xs text-[#8E7A6B] hover:text-[#5C4A3E]"
          >
            <ArrowLeft size={13} />
            Volver
          </button>
          <span className="text-[#D8BFAE]">|</span>
          <h1 className="text-sm font-medium text-[#5C4A3E]">
            {props.mode === "create" ? "Nueva landing page" : "Editar landing page"}
          </h1>
          {props.mode === "edit" && (
            <a
              href={`/lp/${props.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#CDA78F] flex items-center gap-1 hover:text-[#5C4A3E]"
            >
              <Eye size={12} />
              Ver pública
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="border border-[#D8BFAE] rounded px-3 py-1.5 text-xs text-[#8E7A6B] hover:bg-[#F7F4F1] transition-colors hidden xl:flex items-center gap-1"
          >
            <Eye size={12} />
            {showPreview ? "Ocultar preview" : "Mostrar preview"}
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-1.5 bg-[#5C4A3E] text-white px-4 py-2 rounded text-xs hover:bg-[#4a3a30] disabled:opacity-50"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {props.mode === "create" ? "Crear" : "Guardar"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex">
        {/* Editor */}
        <div className={`flex-1 overflow-y-auto p-6 space-y-3 ${showPreview ? "xl:max-w-[60%]" : ""}`}>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-2 rounded">{error}</div>}
          {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs px-4 py-2 rounded">{success}</div>}

          {/* Title (internal) */}
          <div className="bg-white border border-[#D8BFAE] rounded p-4">
            <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] block mb-2">
              Nombre interno *
            </label>
            <input
              value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Campaña anillos verano 2026"
              className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-sm text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F]"
            />
            <p className="text-[10px] text-[#8E7A6B] mt-1">Solo visible en el panel admin.</p>
          </div>

          {/* Tab: Contenido */}
          <Section title="Contenido" defaultOpen>
            <Field label="Titular principal">
              <Input value={config.headline} onChange={(v) => setC("headline", v)} placeholder="Joyas exclusivas para ti" />
            </Field>
            <Field label="Subtitular">
              <Input value={config.subheadline} onChange={(v) => setC("subheadline", v)} placeholder="Diseños únicos a tu medida" />
            </Field>
            <Field label="Texto cuerpo">
              <Textarea value={config.bodyText} onChange={(v) => setC("bodyText", v)} placeholder="Descripción adicional..." rows={3} />
            </Field>
            <Field label="Imagen hero">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    value={config.heroImage ?? ""}
                    onChange={(e) => setC("heroImage", e.target.value || null)}
                    placeholder="https://... (URL externa)"
                    className="flex-1 border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F] bg-white"
                  />
                  <label className={`shrink-0 cursor-pointer flex items-center gap-1.5 px-3 py-2 border rounded text-xs transition-colors ${heroUploading ? "opacity-50 cursor-not-allowed border-[#D8BFAE] text-[#8E7A6B]" : "border-[#CDA78F] text-[#CDA78F] hover:bg-[#CDA78F] hover:text-white"}`}>
                    {heroUploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                    {heroUploading ? "Subiendo..." : "Subir"}
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif"
                      onChange={handleHeroUpload}
                      disabled={heroUploading}
                      className="hidden"
                    />
                  </label>
                </div>
                {heroUploadError && <p className="text-xs text-red-500">{heroUploadError}</p>}
                {config.heroImage && (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={config.heroImage} alt="Hero preview" className="h-28 w-full object-cover rounded border border-[#D8BFAE]" />
                    <button
                      type="button"
                      onClick={() => setC("heroImage", null)}
                      className="absolute top-1.5 right-1.5 bg-white/80 hover:bg-white rounded p-1 text-red-400 hover:text-red-600 transition-colors"
                      title="Quitar imagen"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Color acento">
                <div className="flex items-center gap-2">
                  <input
                    type="color" value={config.accentColor} onChange={(e) => setC("accentColor", e.target.value)}
                    className="w-8 h-8 rounded border border-[#D8BFAE] cursor-pointer"
                  />
                  <input
                    value={config.accentColor} onChange={(e) => setC("accentColor", e.target.value)}
                    className="flex-1 border border-[#D8BFAE] rounded px-2 py-1.5 text-xs text-[#5C4A3E] focus:outline-none"
                  />
                </div>
              </Field>
              <Field label="Color fondo">
                <div className="flex items-center gap-2">
                  <input
                    type="color" value={config.bgColor} onChange={(e) => setC("bgColor", e.target.value)}
                    className="w-8 h-8 rounded border border-[#D8BFAE] cursor-pointer"
                  />
                  <input
                    value={config.bgColor} onChange={(e) => setC("bgColor", e.target.value)}
                    className="flex-1 border border-[#D8BFAE] rounded px-2 py-1.5 text-xs text-[#5C4A3E] focus:outline-none"
                  />
                </div>
              </Field>
            </div>
          </Section>

          {/* Video */}
          <Section title="Video (VSL, producto, prueba social)">
            <div className="border border-[#D8BFAE] rounded p-3 bg-[#F7F4F1] space-y-1.5">
              <Toggle
                checked={config.showVideo}
                onChange={(v) => setC("showVideo", v)}
                label="Mostrar sección de video"
              />
            </div>

            {config.showVideo && (
              <div className="space-y-4 pl-4 border-l-2 border-[#D8BFAE]">
                {/* URL o subida */}
                <Field label="URL del video o archivo">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={config.videoUrl ?? ""}
                        onChange={(e) => setC("videoUrl", e.target.value || null)}
                        placeholder="YouTube, Vimeo o URL directa de video..."
                        className="flex-1 border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F] bg-white"
                      />
                      <label className={`shrink-0 cursor-pointer flex items-center gap-1.5 px-3 py-2 border rounded text-xs transition-colors ${videoUploading ? "opacity-50 cursor-not-allowed border-[#D8BFAE] text-[#8E7A6B]" : "border-[#CDA78F] text-[#CDA78F] hover:bg-[#CDA78F] hover:text-white"}`}>
                        {videoUploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                        {videoUploading ? (videoUploadProgress !== null ? `${videoUploadProgress}%` : "Subiendo...") : "Subir"}
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                          onChange={handleVideoUpload}
                          disabled={videoUploading}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {videoUploadError && <p className="text-xs text-red-500">{videoUploadError}</p>}
                    {config.videoUrl && (
                      <div className="flex items-center gap-2 bg-[#EDE2D8] rounded px-3 py-2">
                        <Video size={13} className="text-[#CDA78F] shrink-0" />
                        <span className="text-xs text-[#5C4A3E] truncate flex-1">{config.videoUrl}</span>
                        <button
                          type="button"
                          onClick={() => setC("videoUrl", null)}
                          className="text-[#8E7A6B] hover:text-red-500 shrink-0"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                    <p className="text-[10px] text-[#8E7A6B]">
                      Acepta YouTube, Vimeo, URL de MP4/WebM, o sube un archivo (máx. 300 MB).
                    </p>
                  </div>
                </Field>

                {/* Orientación */}
                <Field label="Orientación">
                  <div className="flex gap-4">
                    {([
                      { value: "horizontal", label: "Horizontal (16:9)", desc: "VSL, producto, YouTube" },
                      { value: "vertical",   label: "Vertical (9:16)",   desc: "Reels, TikTok, Shorts" },
                    ] as const).map((opt) => (
                      <label key={opt.value} className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="videoOrientation"
                          checked={config.videoOrientation === opt.value}
                          onChange={() => setC("videoOrientation", opt.value)}
                          className="mt-0.5 accent-[#CDA78F]"
                        />
                        <div>
                          <p className="text-xs text-[#5C4A3E] font-medium">{opt.label}</p>
                          <p className="text-[10px] text-[#8E7A6B]">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </Field>

                {/* Posición */}
                <Field label="Posición en la página">
                  <select
                    value={config.videoPosition}
                    onChange={(e) => setC("videoPosition", e.target.value as LandingPageConfig["videoPosition"])}
                    className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F] bg-white"
                  >
                    <option value="after_hero">Después del hero (ideal para VSL)</option>
                    <option value="after_benefits">Después de los beneficios</option>
                    <option value="after_social">Después de la prueba social</option>
                    <option value="after_products">Después de los productos</option>
                  </select>
                </Field>

                {/* Título y caption */}
                <Field label="Título sobre el video (opcional)">
                  <Input value={config.videoTitle} onChange={(v) => setC("videoTitle", v)} placeholder="Mira cómo funciona" />
                </Field>
                <Field label="Texto bajo el video (opcional)">
                  <Input value={config.videoCaption} onChange={(v) => setC("videoCaption", v)} placeholder="Prueba real de una clienta satisfecha" />
                </Field>
              </div>
            )}
          </Section>

          {/* 2. Secciones adicionales (beneficios → prueba social → segundo CTA) */}
          <Section title="2. Beneficios y prueba social">
            {/* Features */}
            <div className="space-y-2">
              <Toggle checked={config.showFeatures} onChange={(v) => setC("showFeatures", v)} label="Mostrar sección de beneficios" />
              {config.showFeatures && (
                <div className="pl-4 space-y-3 border-l-2 border-[#D8BFAE]">
                  {config.features.map((f, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2">
                      <Field label={`Título ${i + 1}`}>
                        <Input value={f.title} onChange={(v) => setFeature(i, "title", v)} />
                      </Field>
                      <Field label={`Descripción ${i + 1}`}>
                        <Input value={f.text} onChange={(v) => setFeature(i, "text", v)} />
                      </Field>
                    </div>
                  ))}
                  {/* Imagen debajo de beneficios */}
                  <Field label="Imagen debajo de beneficios">
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          value={config.featuresImage ?? ""}
                          onChange={(e) => setC("featuresImage", e.target.value || null)}
                          placeholder="https://... (URL externa)"
                          className="flex-1 border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F] bg-white"
                        />
                        <label className={`shrink-0 cursor-pointer flex items-center gap-1.5 px-3 py-2 border rounded text-xs transition-colors ${featImgUploading ? "opacity-50 cursor-not-allowed border-[#D8BFAE] text-[#8E7A6B]" : "border-[#CDA78F] text-[#CDA78F] hover:bg-[#CDA78F] hover:text-white"}`}>
                          {featImgUploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                          {featImgUploading ? "Subiendo..." : "Subir"}
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif"
                            onChange={handleFeatImgUpload}
                            disabled={featImgUploading}
                            className="hidden"
                          />
                        </label>
                      </div>
                      {featImgUploadError && <p className="text-xs text-red-500">{featImgUploadError}</p>}
                      {config.featuresImage && (
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={config.featuresImage} alt="Preview" className="h-28 w-full object-cover rounded border border-[#D8BFAE]" />
                          <button
                            type="button"
                            onClick={() => setC("featuresImage", null)}
                            className="absolute top-1.5 right-1.5 bg-white/80 hover:bg-white rounded p-1 text-red-400 hover:text-red-600 transition-colors"
                            title="Quitar imagen"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </Field>
                </div>
              )}
            </div>

            {/* Social proof */}
            <div className="space-y-2 pt-2 border-t border-[#D8BFAE]/50">
              <Toggle checked={config.showSocialProof} onChange={(v) => setC("showSocialProof", v)} label="Mostrar prueba social" />
              {config.showSocialProof && (
                <div className="pl-4 grid grid-cols-2 gap-2 border-l-2 border-[#D8BFAE]">
                  <Field label="Número">
                    <Input value={config.socialProofCount} onChange={(v) => setC("socialProofCount", v)} placeholder="500+" />
                  </Field>
                  <Field label="Texto">
                    <Input value={config.socialProofText} onChange={(v) => setC("socialProofText", v)} placeholder="clientas satisfechas" />
                  </Field>
                </div>
              )}
            </div>

          </Section>

          {/* 3. Catálogo / Productos */}
          <Section title="3. Catálogo de productos">
            <Toggle
              checked={config.showProducts}
              onChange={(v) => setC("showProducts", v)}
              label="Mostrar productos en esta landing page"
            />
            {config.showProducts && (
              <div className="space-y-4 pl-4 border-l-2 border-[#D8BFAE]">
                {/* Mode selector */}
                <Field label="Selección de productos">
                  <div className="flex gap-3">
                    {(["COLLECTION", "MANUAL"] as const).map((m) => (
                      <label key={m} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="productMode"
                          checked={config.productMode === m}
                          onChange={() => setC("productMode", m)}
                          className="accent-[#CDA78F]"
                        />
                        <span className="text-xs text-[#5C4A3E]">
                          {m === "COLLECTION" ? "Por colección" : "Manual (elegir productos)"}
                        </span>
                      </label>
                    ))}
                  </div>
                </Field>

                {/* Collection picker */}
                {config.productMode === "COLLECTION" && (
                  <Field label="Colección">
                    <select
                      value={config.collectionSlug ?? ""}
                      onChange={(e) => setC("collectionSlug", e.target.value || null)}
                      className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F] bg-white"
                    >
                      <option value="">— Elige una colección —</option>
                      {collections.map((c) => (
                        <option key={c.slug} value={c.slug}>{c.name}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-[#8E7A6B] mt-1">
                      Se mostrarán todos los productos activos de esa colección.
                    </p>
                  </Field>
                )}

                {/* Manual product picker */}
                {config.productMode === "MANUAL" && (
                  <Field label={`Productos seleccionados (${config.productIds.length})`}>
                    <input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Buscar producto..."
                      className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F] mb-2"
                    />
                    <div className="border border-[#D8BFAE] rounded overflow-y-auto max-h-52 divide-y divide-[#D8BFAE]/50">
                      {products
                        .filter((p) =>
                          !productSearch ||
                          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                          p.collectionName.toLowerCase().includes(productSearch.toLowerCase())
                        )
                        .map((p) => {
                          const checked = config.productIds.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${checked ? "bg-[#EDE2D8]/60" : "hover:bg-[#F7F4F1]"}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setC("productIds",
                                    checked
                                      ? config.productIds.filter((id) => id !== p.id)
                                      : [...config.productIds, p.id]
                                  );
                                }}
                                className="w-3.5 h-3.5 accent-[#CDA78F] shrink-0"
                              />
                              {p.image && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={p.image} alt={p.name} className="w-8 h-8 object-cover rounded shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-[#5C4A3E] truncate">{p.name}</p>
                                <p className="text-[10px] text-[#8E7A6B]">{p.collectionName}</p>
                              </div>
                              <span className="text-[10px] text-[#8E7A6B] shrink-0">
                                ${p.price.toLocaleString("es-CL")}
                              </span>
                            </label>
                          );
                        })}
                      {products.filter((p) =>
                        !productSearch ||
                        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                        p.collectionName.toLowerCase().includes(productSearch.toLowerCase())
                      ).length === 0 && (
                        <p className="text-xs text-[#8E7A6B] text-center py-4">Sin resultados</p>
                      )}
                    </div>
                  </Field>
                )}

                {/* CTA label */}
                <Field label="Texto del botón de producto">
                  <Input
                    value={config.productCtaLabel}
                    onChange={(v) => setC("productCtaLabel", v)}
                    placeholder="Ver en tienda"
                  />
                </Field>

                {/* Lead gate */}
                <div className="border border-[#D8BFAE] rounded p-3 bg-[#F7F4F1] space-y-1.5">
                  <Toggle
                    checked={config.requireLeadBeforeStore}
                    onChange={(v) => setC("requireLeadBeforeStore", v)}
                    label="Pedir datos antes de ir a la tienda"
                  />
                  <p className="text-[10px] text-[#8E7A6B] pl-10">
                    Al hacer clic en un producto, aparece un formulario flotante. Si el visitante deja sus datos queda registrado como lead en el CRM y luego puede ver el producto en la tienda.
                  </p>
                </div>
              </div>
            )}
          </Section>

          {/* 4. Formulario de captura */}
          <Section title="4. Formulario de captura">
            <div className="border border-[#D8BFAE] rounded p-3 bg-[#F7F4F1] space-y-1.5">
              <Toggle
                checked={config.showForm}
                onChange={(v) => setC("showForm", v)}
                label="Activar formulario de captura"
              />
              <p className="text-[10px] text-[#8E7A6B] pl-10">
                Al desactivar, todos los botones llevan directo a la tienda sin pedir datos. Al activar, se muestra el formulario al presionar los botones.
              </p>
            </div>
            {config.showForm && <>
            <Field label="Título del formulario">
              <Input value={config.formTitle} onChange={(v) => setC("formTitle", v)} placeholder="Solicita información" />
            </Field>
            <Field label="Subtitular del formulario">
              <Input value={config.formSubtitle} onChange={(v) => setC("formSubtitle", v)} placeholder="Te contactamos en menos de 24h" />
            </Field>
            <Field label="Texto del botón">
              <Input value={config.ctaLabel} onChange={(v) => setC("ctaLabel", v)} placeholder="Quiero saber más" />
            </Field>

            <div className="border-t border-[#D8BFAE]/50 pt-3 space-y-2">
              <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Pantalla de gracias</p>
              <Field label="Título">
                <Input value={config.thankYouTitle} onChange={(v) => setC("thankYouTitle", v)} placeholder="¡Gracias!" />
              </Field>
              <Field label="Texto">
                <Textarea value={config.thankYouText} onChange={(v) => setC("thankYouText", v)} placeholder="En breve nos ponemos en contacto contigo." rows={2} />
              </Field>
            </div>

            <div className="border-t border-[#D8BFAE]/50 pt-3 space-y-2">
              <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Campos a recopilar</p>
              <div className="grid grid-cols-2 gap-y-2">
                <Checkbox checked={config.collectName} onChange={(v) => setC("collectName", v)} label="Nombre" />
                <Checkbox checked={config.collectEmail} onChange={(v) => setC("collectEmail", v)} label="Correo electrónico" />
                <Checkbox checked={config.collectPhone} onChange={(v) => setC("collectPhone", v)} label="Teléfono" />
                <Checkbox checked={config.collectWhatsapp} onChange={(v) => setC("collectWhatsapp", v)} label="WhatsApp" />
              </div>
            </div>

            <div className="border-t border-[#D8BFAE]/50 pt-3 space-y-2">
              <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Campos obligatorios</p>
              <div className="grid grid-cols-2 gap-y-2">
                <Checkbox checked={config.requireEmail} onChange={(v) => setC("requireEmail", v)} label="Correo obligatorio" />
                <Checkbox checked={config.requirePhone} onChange={(v) => setC("requirePhone", v)} label="Teléfono obligatorio" />
              </div>
            </div>

            <div className="border-t border-[#D8BFAE]/50 pt-3 space-y-2">
              <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Etiquetas automáticas al lead</p>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="Ej: verano-2026"
                  className="flex-1 border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F] bg-white"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-3 py-2 bg-[#EDE2D8] rounded border border-[#D8BFAE] text-xs text-[#5C4A3E] hover:bg-[#D8BFAE] transition-colors"
                >
                  <Plus size={12} />
                </button>
              </div>
              {config.autoTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {config.autoTags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 bg-[#EDE2D8] text-[#5C4A3E] rounded px-2 py-0.5 text-[10px]">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="text-[#8E7A6B] hover:text-red-500">
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-[#8E7A6B]">
                Estas etiquetas se añaden automáticamente a cada lead generado por esta landing page.
              </p>
            </div>
            </>}
          </Section>

          {/* 5. Código personalizado */}
          <Section title="5. Código personalizado">
            <div className="space-y-1 pb-1">
              <p className="text-[10px] text-[#8E7A6B] leading-relaxed">
                Pega aquí código HTML/JS externo. Útil para Meta Pixel, Google Tag Manager, Calendly, etc.
              </p>
            </div>

            <Field label="Código HEAD — scripts de seguimiento, píxeles">
              <textarea
                value={config.customHeadHtml}
                onChange={(e) => setC("customHeadHtml", e.target.value)}
                placeholder={"<!-- Meta Pixel -->\n<script>\n  !function(f,b,e,v,n,t,s){...}\n</script>"}
                rows={6}
                spellCheck={false}
                className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-[11px] text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F] resize-y bg-white font-mono leading-relaxed"
              />
              <p className="text-[10px] text-[#8E7A6B] mt-1">
                Se inyecta en <code className="bg-[#EDE2D8] px-1 rounded">&lt;head&gt;</code> al cargar la página.
              </p>
            </Field>

            <Field label="Código BODY — widgets, embeds (Calendly, chat, etc.)">
              <textarea
                value={config.customBodyHtml}
                onChange={(e) => setC("customBodyHtml", e.target.value)}
                placeholder={"<!-- Calendly badge widget -->\n<link href=\"https://assets.calendly.com/...\" rel=\"stylesheet\">\n<script>...</script>"}
                rows={6}
                spellCheck={false}
                className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-[11px] text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F] resize-y bg-white font-mono leading-relaxed"
              />
              <p className="text-[10px] text-[#8E7A6B] mt-1">
                Se inyecta al final del <code className="bg-[#EDE2D8] px-1 rounded">&lt;body&gt;</code>. Úsalo para widgets visibles o scripts que dependen del DOM.
              </p>
            </Field>

            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-[10px] text-amber-700 leading-relaxed">
              ⚠ Solo pega código de fuentes confiables. El código se ejecuta directamente en la landing page.
            </div>
          </Section>
        </div>

        {/* ── Preview panel ── */}
        {showPreview && (
          <DevicePreviewShell>
            <PreviewPane config={config} products={filteredPreviewProducts} />
          </DevicePreviewShell>
        )}
      </div>
    </div>
  );
}
