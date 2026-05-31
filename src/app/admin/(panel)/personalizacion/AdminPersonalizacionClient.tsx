"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  Palette, Image as ImageIcon, Type, ChevronDown, ChevronRight,
  Upload, X, Check, RotateCcw, ExternalLink, Plus, Pencil, Trash2,
  GripVertical, ImageOff, Star, MapPin, Phone,
} from "lucide-react";
import {
  FEATURE_ICON_MAP, parseFeatureItems, type FeatureItem,
} from "@/components/home/FeaturesStrip";
import {
  SOCIAL_ICON_MAP, parseSocialLinks, type SocialLink,
} from "@/components/SocialIcons";
import type { BrandColors, PageTexts, StoreLocation } from "@/types/personalization";
import { DEFAULT_COLORS, DEFAULT_PAGE_TEXTS } from "@/types/personalization";
import {
  updateBrandColors,
  resetBrandColors,
  updatePageTextSection,
  resetPageTextSection,
} from "@/app/actions/admin/personalization";
import { uploadStoreLogo, removeStoreLogo, updateStoreName, toggleWhatsAppButton, updateWhatsAppContactNumber, updateStoreLocations, updateContactInfo } from "@/app/actions/admin/settings";
import {
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerActive,
} from "@/app/actions/admin/banners";

// ─── Types ────────────────────────────────────────────────────

type Tab = "branding" | "banners" | "textos" | "ubicaciones" | "contacto";

type Banner = {
  id: string;
  image: string;
  eyebrow: string;
  heading: string;
  body: string | null;
  ctaLabel: string;
  ctaHref: string;
  isActive: boolean;
  sortOrder: number;
};

interface Props {
  settings: { colors: BrandColors; texts: PageTexts; logoUrl: string | null };
  banners: Banner[];
  storeName: string;
  whatsappButtonEnabled: boolean;
  whatsappContactNumber: string | null;
  locations: StoreLocation[];
  supportEmail: string;
  supportPhone: string;
}

// ─── Main component ───────────────────────────────────────────

export default function AdminPersonalizacionClient({ settings, banners: initialBanners, storeName, whatsappButtonEnabled, whatsappContactNumber, locations, supportEmail, supportPhone }: Props) {
  const [tab, setTab] = useState<Tab>("branding");

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "branding",    label: "Branding",   icon: Palette },
    { id: "banners",     label: "Banners",    icon: ImageIcon },
    { id: "textos",      label: "Textos",     icon: Type },
    { id: "ubicaciones", label: "Ubicaciones", icon: MapPin },
    { id: "contacto",   label: "Contacto",   icon: Phone },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Tab bar */}
      <div className="flex border-b border-[#D8BFAE]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-3 text-[11px] tracking-[0.15em] uppercase border-b-2 transition-colors ${
              tab === id
                ? "border-[#CDA78F] text-[#5C4A3E]"
                : "border-transparent text-[#8E7A6B] hover:text-[#5C4A3E] hover:border-[#D8BFAE]"
            }`}
          >
            <Icon size={13} strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </div>

      {tab === "branding" && (
        <BrandingTab settings={settings} storeName={storeName} whatsappButtonEnabled={whatsappButtonEnabled} whatsappContactNumber={whatsappContactNumber} />
      )}
      {tab === "banners" && (
        <BannersTab banners={initialBanners} />
      )}
      {tab === "textos" && (
        <TextosTab texts={settings.texts} />
      )}
      {tab === "ubicaciones" && (
        <UbicacionesTab locations={locations} />
      )}
      {tab === "contacto" && (
        <ContactoTab supportEmail={supportEmail} supportPhone={supportPhone} />
      )}
    </div>
  );
}

// ─── Branding Tab ─────────────────────────────────────────────

function BrandingTab({ settings, storeName: initialStoreName, whatsappButtonEnabled: initialWaEnabled, whatsappContactNumber: initialWaNumber }: { settings: Props["settings"]; storeName: string; whatsappButtonEnabled: boolean; whatsappContactNumber: string | null }) {
  const [colors, setColors] = useState<BrandColors>({ ...DEFAULT_COLORS, ...settings.colors });
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl);
  const [name, setName] = useState(initialStoreName);
  const [waNumber, setWaNumber] = useState(initialWaNumber ?? "");
  const [waSavedNumber, setWaSavedNumber] = useState(false);
  const [colorsPending, startColors] = useTransition();
  const [logoPending, startLogo] = useTransition();
  const [namePending, startName] = useTransition();
  const [waTogglePending, startWaToggle] = useTransition();
  const [waSavePending, startWaSave] = useTransition();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savedColors, setSavedColors] = useState(false);
  const [savedName, setSavedName] = useState(false);
  const [waEnabled, setWaEnabled] = useState(initialWaEnabled);

  const colorDefs: { key: keyof BrandColors; label: string; desc: string }[] = [
    { key: "sand",       label: "Primario",    desc: "Botones, CTAs, precios" },
    { key: "taupe",      label: "Secundario",  desc: "Texto, íconos" },
    { key: "dark",       label: "Texto oscuro", desc: "Títulos, encabezados" },
    { key: "cream",      label: "Fondo",        desc: "Fondo general" },
    { key: "beige",      label: "Beige",        desc: "Bordes, barra anuncio" },
    { key: "beigeLight", label: "Beige claro",  desc: "Secciones, tarjetas" },
  ];

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const fd = new FormData();
    fd.append("logo", file);
    startLogo(async () => {
      const res = await uploadStoreLogo(fd);
      if ("logoUrl" in res && res.logoUrl) setLogoUrl(res.logoUrl);
      setUploadingLogo(false);
    });
    e.target.value = "";
  }

  function handleRemoveLogo() {
    startLogo(async () => {
      await removeStoreLogo();
      setLogoUrl(null);
    });
  }

  function handleSaveColors() {
    startColors(async () => {
      await updateBrandColors(colors);
      setSavedColors(true);
      setTimeout(() => setSavedColors(false), 2500);
    });
  }

  function handleResetColors() {
    startColors(async () => {
      await resetBrandColors();
      setColors(DEFAULT_COLORS);
    });
  }

  function handleSaveName() {
    startName(async () => {
      await updateStoreName(name);
      setSavedName(true);
      setTimeout(() => setSavedName(false), 2500);
    });
  }

  function handleWaToggle() {
    startWaToggle(async () => {
      await toggleWhatsAppButton(!waEnabled);
      setWaEnabled((v) => !v);
    });
  }

  function handleWaSaveNumber() {
    startWaSave(async () => {
      await updateWhatsAppContactNumber(waNumber);
      setWaSavedNumber(true);
      setTimeout(() => setWaSavedNumber(false), 2500);
    });
  }

  return (
    <div className="space-y-8">
      {/* Nombre de la tienda */}
      <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-6">
        <h3 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium mb-1">
          Nombre de la tienda
        </h3>
        <p className="text-[10px] text-[#8E7A6B] mb-4">
          Aparece en el navbar cuando no hay logo cargado, en los correos y en los metadatos SEO.
        </p>
        <div className="flex gap-2 max-w-sm">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
            placeholder="Lira de Luna"
          />
          <button
            onClick={handleSaveName}
            disabled={namePending || !name.trim()}
            className="flex items-center gap-1.5 text-[9px] tracking-[0.15em] uppercase px-4 py-2 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white transition-colors disabled:opacity-50 shrink-0"
          >
            {savedName ? <><Check size={10} strokeWidth={2} /> Guardado</> : namePending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      {/* Logo */}
      <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">
              Logo de la tienda
            </h3>
            <p className="text-[10px] text-[#8E7A6B] mt-1">
              PNG, SVG o WEBP · Fondo transparente recomendado · Máx. 5 MB
            </p>
          </div>
          <div className="flex items-center gap-2">
            {logoUrl && (
              <button
                onClick={handleRemoveLogo}
                disabled={logoPending}
                className="text-[9px] tracking-[0.1em] uppercase px-3 py-1.5 border border-red-200 text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Quitar
              </button>
            )}
            <label className={`cursor-pointer flex items-center gap-1.5 text-[9px] tracking-[0.1em] uppercase px-3 py-1.5 border transition-colors ${
              uploadingLogo || logoPending
                ? "opacity-50 cursor-not-allowed border-[#D8BFAE] text-[#8E7A6B]"
                : "border-[#CDA78F] text-[#CDA78F] hover:bg-[#CDA78F] hover:text-white"
            }`}>
              <Upload size={10} strokeWidth={1.5} />
              {uploadingLogo ? "Subiendo..." : "Subir logo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
                disabled={uploadingLogo || logoPending}
                className="hidden"
              />
            </label>
          </div>
        </div>
        {logoUrl ? (
          <div className="relative h-24 bg-[#EDE2D8] flex items-center justify-center overflow-hidden border border-[#D8BFAE]">
            <Image
              src={logoUrl}
              alt="Logo"
              width={240}
              height={80}
              className="object-contain max-h-16"
              unoptimized={logoUrl.startsWith("/uploads")}
            />
          </div>
        ) : (
          <div className="h-24 border-2 border-dashed border-[#D8BFAE] flex items-center justify-center bg-white">
            <p className="text-[10px] text-[#D8BFAE] tracking-wide">Sin logo — se usará el nombre en tipografía</p>
          </div>
        )}
      </div>

      {/* Color palette */}
      <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">
              Paleta de colores
            </h3>
            <p className="text-[10px] text-[#8E7A6B] mt-1">
              Cambia la colorimetría de toda la tienda. Los cambios aplican en tiempo real al guardar.
            </p>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors"
          >
            <ExternalLink size={11} strokeWidth={1.5} />
            Ver tienda
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {colorDefs.map(({ key, label, desc }) => (
            <div key={key} className="space-y-2">
              <div className="relative">
                <input
                  type="color"
                  value={colors[key]}
                  onChange={(e) => setColors((c) => ({ ...c, [key]: e.target.value }))}
                  className="w-full h-14 border border-[#D8BFAE] cursor-pointer rounded-none bg-white p-0.5"
                  style={{ accentColor: colors[key] }}
                />
                <div
                  className="absolute inset-1 pointer-events-none"
                  style={{ backgroundColor: colors[key] }}
                />
              </div>
              <input
                type="text"
                value={colors[key]}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
                    setColors((c) => ({ ...c, [key]: v }));
                  }
                }}
                className="w-full bg-white border border-[#D8BFAE] px-2 py-1 text-[10px] text-[#5C4A3E] font-mono outline-none focus:border-[#CDA78F] uppercase"
                maxLength={7}
                spellCheck={false}
              />
              <div>
                <p className="text-[9px] tracking-[0.1em] uppercase text-[#5C4A3E] font-medium leading-tight">{label}</p>
                <p className="text-[9px] text-[#8E7A6B] leading-tight mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Live swatch preview */}
        <div className="flex h-8 mb-5 overflow-hidden border border-[#D8BFAE]">
          {colorDefs.map(({ key, label }) => (
            <div
              key={key}
              className="flex-1 relative group"
              style={{ backgroundColor: colors[key] }}
              title={label}
            />
          ))}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleResetColors}
            disabled={colorsPending}
            className="flex items-center gap-1.5 text-[9px] tracking-[0.12em] uppercase px-4 py-2 border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] transition-colors disabled:opacity-50"
          >
            <RotateCcw size={10} strokeWidth={1.5} />
            Restaurar
          </button>
          <button
            onClick={handleSaveColors}
            disabled={colorsPending}
            className="flex items-center gap-1.5 text-[9px] tracking-[0.15em] uppercase px-5 py-2 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white transition-colors disabled:opacity-50"
          >
            {savedColors ? (
              <><Check size={10} strokeWidth={2} /> Guardado</>
            ) : colorsPending ? (
              "Guardando..."
            ) : (
              "Guardar colores"
            )}
          </button>
        </div>
      </div>

      {/* WhatsApp flotante */}
      <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-6 space-y-4">
        <div>
          <h3 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">
            Botón flotante de WhatsApp
          </h3>
          <p className="text-[10px] text-[#8E7A6B] mt-1">
            Aparece en la esquina inferior derecha de la tienda para que los clientes puedan contactarte directamente.
          </p>
        </div>

        {/* Número */}
        <div className="space-y-1.5">
          <label className="text-[10px] tracking-[0.12em] uppercase text-[#8E7A6B]">Número de contacto</label>
          <p className="text-[10px] text-[#8E7A6B]/70">
            Con código de país, sin espacios ni guiones. Ej: <span className="font-mono">56912345678</span>
          </p>
          <div className="flex gap-2 max-w-xs">
            <input
              type="tel"
              value={waNumber}
              onChange={(e) => setWaNumber(e.target.value)}
              placeholder="56912345678"
              className="flex-1 bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] font-mono"
            />
            <button
              onClick={handleWaSaveNumber}
              disabled={waSavePending}
              className="flex items-center gap-1 text-[9px] tracking-[0.12em] uppercase px-3 py-2 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white transition-colors disabled:opacity-50 shrink-0"
            >
              {waSavedNumber ? <><Check size={10} strokeWidth={2} /> Guardado</> : waSavePending ? "..." : "Guardar"}
            </button>
          </div>
        </div>

        {/* Toggle */}
        <div className={`flex items-center gap-3 p-3 border text-xs ${waEnabled ? "bg-emerald-50 border-emerald-200" : "bg-[#EDE2D8] border-[#D8BFAE]"}`}>
          <div className={`w-2 h-2 rounded-full shrink-0 ${waEnabled ? "bg-emerald-400" : "bg-[#D8BFAE]"}`} />
          <p className={`flex-1 ${waEnabled ? "text-emerald-700" : "text-[#8E7A6B]"}`}>
            {!waNumber.trim()
              ? "Ingresa y guarda un número para poder activar el botón."
              : waEnabled
              ? "Botón activo — visible en la esquina inferior derecha de la tienda."
              : "Botón inactivo — no se muestra en la tienda."}
          </p>
          {waNumber.trim() && (
            <button
              onClick={handleWaToggle}
              disabled={waTogglePending}
              className={`shrink-0 text-[9px] tracking-[0.12em] uppercase px-3 py-1.5 border transition-colors disabled:opacity-50 ${
                waEnabled
                  ? "border-emerald-300 text-emerald-700 hover:bg-red-50 hover:border-red-200 hover:text-red-500"
                  : "border-[#CDA78F] text-[#CDA78F] hover:bg-[#CDA78F] hover:text-white"
              }`}
            >
              {waTogglePending ? "..." : waEnabled ? "Desactivar" : "Activar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Banners Tab ──────────────────────────────────────────────

type BannerFormData = {
  image: string;
  eyebrow: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  sortOrder: string;
};

const emptyBannerForm: BannerFormData = {
  image: "", eyebrow: "", heading: "", body: "",
  ctaLabel: "Comprar ahora", ctaHref: "/tienda", sortOrder: "0",
};

function BannersTab({ banners: initial }: { banners: Banner[] }) {
  const [banners, setBanners] = useState(initial);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BannerFormData>(emptyBannerForm);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) setForm((f) => ({ ...f, image: data.url! }));
      else setError(data.error ?? "Error al subir imagen");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function openCreate() {
    setForm({ ...emptyBannerForm, sortOrder: String(banners.length) });
    setEditingId(null);
    setError("");
    setModalOpen(true);
  }

  function openEdit(b: Banner) {
    setForm({
      image: b.image, eyebrow: b.eyebrow, heading: b.heading,
      body: b.body ?? "", ctaLabel: b.ctaLabel, ctaHref: b.ctaHref,
      sortOrder: String(b.sortOrder),
    });
    setEditingId(b.id);
    setError("");
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditingId(null); setError(""); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.eyebrow || !form.heading) { setError("Eyebrow y titular son requeridos"); return; }
    setError("");
    const payload = {
      image: form.image, eyebrow: form.eyebrow, heading: form.heading,
      body: form.body || undefined,
      ctaLabel: form.ctaLabel || "Comprar ahora",
      ctaHref: form.ctaHref || "/tienda",
      sortOrder: parseInt(form.sortOrder) || 0,
    };
    startTransition(async () => {
      if (editingId) {
        await updateBanner(editingId, payload);
        setBanners((prev) => prev.map((b) => b.id === editingId ? { ...b, ...payload, body: payload.body ?? null } : b));
      } else {
        await createBanner(payload);
        window.location.reload();
      }
      closeModal();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteBanner(id);
      setBanners((prev) => prev.filter((b) => b.id !== id));
      setDeleteConfirm(null);
    });
  }

  function handleToggle(id: string, isActive: boolean) {
    startTransition(async () => {
      await toggleBannerActive(id, isActive);
      setBanners((prev) => prev.map((b) => b.id === id ? { ...b, isActive } : b));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#8E7A6B]">
          {banners.length} banner{banners.length !== 1 ? "s" : ""}
          <span className="ml-2 text-[10px] text-[#CDA78F]">· El carrusel de inicio muestra los activos en orden</span>
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[10px] tracking-[0.15em] uppercase px-5 py-2.5 transition-colors"
        >
          <Plus size={14} strokeWidth={1.75} />
          Nuevo banner
        </button>
      </div>

      <div className="bg-[#F7F4F1] border border-[#D8BFAE] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#D8BFAE] bg-[#EDE2D8]/40 grid grid-cols-12 gap-4">
          <div className="col-span-1" />
          <div className="col-span-5 text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">Banner</div>
          <div className="col-span-2 text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">CTA</div>
          <div className="col-span-2 text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">Orden</div>
          <div className="col-span-1 text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">Estado</div>
          <div className="col-span-1" />
        </div>

        {banners.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#8E7A6B]">
            Sin banners — crea el primero para activar el carrusel
          </div>
        ) : (
          <div className="divide-y divide-[#EDE2D8]">
            {banners.map((b) => (
              <div
                key={b.id}
                className={`grid grid-cols-12 gap-4 items-center px-5 py-4 hover:bg-[#EDE2D8]/40 transition-colors cursor-pointer ${!b.isActive ? "opacity-50" : ""}`}
                onClick={() => openEdit(b)}
              >
                <div className="col-span-1 flex justify-center" onClick={(e) => e.stopPropagation()}>
                  <GripVertical size={14} strokeWidth={1.5} className="text-[#D8BFAE]" />
                </div>
                <div className="col-span-5 flex items-center gap-3">
                  <div className="relative w-20 h-12 shrink-0 bg-[#EDE2D8] overflow-hidden">
                    {b.image ? (
                      <Image src={b.image} alt={b.heading} fill className="object-cover" sizes="80px" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageOff size={14} strokeWidth={1} className="text-[#D8BFAE]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] tracking-[0.12em] uppercase text-[#CDA78F] mb-0.5">{b.eyebrow}</p>
                    <p className="text-xs text-[#5C4A3E] font-medium line-clamp-1">{b.heading}</p>
                    {b.body && <p className="text-[10px] text-[#8E7A6B] mt-0.5 line-clamp-1">{b.body}</p>}
                  </div>
                </div>
                <div className="col-span-2 min-w-0">
                  <p className="text-[10px] text-[#5C4A3E] font-medium truncate">{b.ctaLabel}</p>
                  <code className="text-[10px] text-[#CDA78F] bg-[#EDE2D8] px-1.5 py-0.5 truncate block">{b.ctaHref}</code>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-[#5C4A3E]">{b.sortOrder}</span>
                </div>
                <div className="col-span-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleToggle(b.id, !b.isActive)}
                    className={`text-[9px] tracking-[0.1em] uppercase px-2 py-1 transition-colors ${b.isActive ? "bg-[#CDA78F]/15 text-[#8E7A6B] hover:bg-red-50 hover:text-red-400" : "bg-red-50 text-red-400 hover:bg-[#CDA78F]/15 hover:text-[#8E7A6B]"}`}
                  >
                    {b.isActive ? "Activo" : "Inactivo"}
                  </button>
                </div>
                <div className="col-span-1 flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEdit(b)} className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] hover:text-[#5C4A3E] transition-colors" title="Editar textos e imagen">
                    <Pencil size={12} strokeWidth={1.5} />
                  </button>
                  {deleteConfirm === b.id ? (
                    <>
                      <button onClick={() => handleDelete(b.id)} className="w-7 h-7 flex items-center justify-center bg-red-50 border border-red-200 text-red-400 hover:bg-red-100 transition-colors">
                        <Check size={12} strokeWidth={1.5} />
                      </button>
                      <button onClick={() => setDeleteConfirm(null)} className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] transition-colors">
                        <X size={12} strokeWidth={1.5} />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setDeleteConfirm(b.id)} className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] hover:border-red-300 hover:text-red-400 transition-colors">
                      <Trash2 size={12} strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Banner modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-[#F7F4F1] border border-[#D8BFAE] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8BFAE] sticky top-0 bg-[#F7F4F1] z-10">
              <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">
                {editingId ? "Editar banner" : "Nuevo banner"}
              </h2>
              <button onClick={closeModal} className="text-[#8E7A6B] hover:text-[#5C4A3E]"><X size={16} strokeWidth={1.5} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <p className="text-[10px] text-[#8E7A6B] bg-[#EDE2D8]/50 px-3 py-2 border border-[#D8BFAE]">
                Edita la imagen, el texto superpuesto y el botón que aparecen en el carrusel del inicio.
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Imagen del banner</label>
                  <label className={`cursor-pointer flex items-center gap-1.5 text-[9px] tracking-[0.1em] uppercase px-3 py-1.5 border transition-colors ${uploading ? "opacity-50 cursor-not-allowed border-[#D8BFAE] text-[#8E7A6B]" : "border-[#CDA78F] text-[#CDA78F] hover:bg-[#CDA78F] hover:text-white"}`}>
                    <Upload size={10} strokeWidth={1.5} />
                    {uploading ? "Subiendo..." : "Subir foto"}
                    <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif" onChange={handleImageUpload} disabled={uploading} className="hidden" />
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-[#8E7A6B] shrink-0 tracking-wide">o pegar URL:</span>
                  <input
                    type="url"
                    value={form.image.startsWith("/uploads") ? "" : form.image}
                    onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 bg-white border border-[#D8BFAE] px-3 py-1.5 text-[10px] text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                  />
                </div>
                {form.image ? (
                  <div className="relative w-full h-40 border border-[#D8BFAE] overflow-hidden bg-[#EDE2D8]">
                    <Image src={form.image} alt="Banner" fill className="object-cover" sizes="600px" unoptimized />
                    <button type="button" onClick={() => setForm((f) => ({ ...f, image: "" }))} className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 hover:bg-red-600 text-white flex items-center justify-center">
                      <X size={11} strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-[#D8BFAE] py-8 flex flex-col items-center gap-2 text-[#D8BFAE]">
                    <ImageOff size={22} strokeWidth={1} />
                    <p className="text-[10px]">Sin imagen — sube una foto o pega una URL</p>
                  </div>
                )}
                <p className="text-[9px] text-[#8E7A6B]">JPG, PNG, WEBP · 1600×700 px recomendado · Máx. 10 MB</p>
              </div>
              <div className="border border-[#D8BFAE] p-4 space-y-3">
                <p className="text-[9px] tracking-[0.15em] uppercase text-[#CDA78F] font-medium">Texto superpuesto</p>
                <div className="space-y-1.5">
                  <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Texto pequeño superior (eyebrow) *</label>
                  <input value={form.eyebrow} onChange={(e) => setForm({ ...form, eyebrow: e.target.value })} className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" placeholder="ej: Nueva colección" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Titular principal *</label>
                  <input value={form.heading} onChange={(e) => setForm({ ...form, heading: e.target.value })} className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" placeholder="ej: Joyas que cuentan tu historia" />
                  <p className="text-[9px] text-[#8E7A6B]">Usa \n para saltos de línea si quieres dos líneas de titular.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Texto secundario (opcional)</label>
                  <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={2} className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] resize-none" placeholder="Descripción breve debajo del titular" />
                </div>
              </div>
              <div className="border border-[#D8BFAE] p-4 space-y-3">
                <p className="text-[9px] tracking-[0.15em] uppercase text-[#CDA78F] font-medium">Botón de acción</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Texto del botón</label>
                    <input value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" placeholder="Comprar ahora" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Enlace al hacer clic</label>
                    <input value={form.ctaHref} onChange={(e) => setForm({ ...form, ctaHref: e.target.value })} className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" placeholder="/tienda" />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 w-28">
                <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Orden</label>
                <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
              </div>
              {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2">{error}</p>}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="text-[10px] tracking-[0.12em] uppercase px-5 py-2.5 border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] transition-colors">Cancelar</button>
                <button type="submit" disabled={isPending || uploading} className="text-[10px] tracking-[0.15em] uppercase px-5 py-2.5 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white transition-colors disabled:opacity-50">
                  {isPending ? "Guardando..." : editingId ? "Guardar cambios" : "Crear banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Textos Tab ───────────────────────────────────────────────

type TextSectionDef = {
  key: keyof PageTexts;
  label: string;
  url: string;
  placeholder: string;
  rows: number;
  hint: string;
  isLine?: boolean;
  customEditor?: "featuresStrip" | "socialLinks";
};

const TEXT_SECTIONS: TextSectionDef[] = [
  {
    key: "announcementBar",
    label: "Barra de anuncio",
    url: "— barra superior de toda la tienda",
    placeholder: "Envíos gratis en pedidos +$30.000 CLP",
    rows: 1,
    hint: "Texto breve que aparece en la barra superior de toda la tienda.",
    isLine: true,
  },
  {
    key: "featuresStrip",
    label: "Banda de características (inicio)",
    url: "— sección de íconos bajo el carrusel",
    placeholder: "",
    rows: 1,
    hint: "Añade, edita o elimina las características que aparecen bajo el carrusel. Sin límite de ítems.",
    customEditor: "featuresStrip",
  },
  {
    key: "footerTagline",
    label: "Footer — frase de la marca",
    url: "— pie de página, bajo el nombre de la tienda",
    placeholder: "Joyas que cuentan tu historia.\nHechas con intención, para acompañarte siempre.",
    rows: 2,
    hint: "Frase corta debajo del nombre en el footer. Usa saltos de línea para separar.",
  },
  {
    key: "socialLinks",
    label: "Footer — Redes sociales",
    url: "— íconos del pie de página",
    placeholder: "",
    rows: 1,
    hint: "Añade todas las redes sociales que quieras. Se muestran como íconos en el footer.",
    customEditor: "socialLinks",
  },
  {
    key: "nosotros",
    label: "Nosotros — Historia",
    url: "/nosotros",
    placeholder: "Lira de Luna nació de la creencia de que cada joya cuenta una historia...\n\nNuestra inspiración viene de la luna...\n\nCada pieza es diseñada con minimalismo y propósito...",
    rows: 8,
    hint: "Separa los párrafos con una línea vacía. Se muestra en la sección de historia de la marca.",
  },
  {
    key: "guiaCuidado",
    label: "Guía de cuidado — Intro",
    url: "/guia-de-cuidado",
    placeholder: "Tus joyas están hechas para durar. Con el cuidado correcto, acompañarán cada momento de tu historia.",
    rows: 3,
    hint: "Texto introductorio del encabezado de la guía de cuidado.",
  },
  {
    key: "guiaCuidadoQuote",
    label: "Guía de cuidado — Cita",
    url: "/guia-de-cuidado",
    placeholder: '"Una joya cuidada es una joya que te acompaña toda la vida."',
    rows: 2,
    hint: "Cita editorial que aparece al final de la guía. Incluye las comillas si quieres.",
    isLine: false,
  },
  {
    key: "privacidad",
    label: "Política de Privacidad",
    url: "/privacidad",
    placeholder: "Escribe aquí el contenido completo de la política de privacidad...",
    rows: 12,
    hint: "Separa secciones con una línea vacía. Usa ### para títulos de sección (ej: ### 1. Responsable del tratamiento).",
  },
  {
    key: "terminos",
    label: "Términos y Condiciones",
    url: "/terminos",
    placeholder: "Escribe aquí los términos y condiciones...",
    rows: 12,
    hint: "Separa secciones con una línea vacía. Usa ### para títulos de sección.",
  },
  {
    key: "preguntas",
    label: "Preguntas Frecuentes",
    url: "/preguntas-frecuentes",
    placeholder: "Escribe aquí las preguntas y respuestas...\n\n### Categoría\n\n¿Pregunta?\nRespuesta aquí.\n\n¿Otra pregunta?\nOtra respuesta.",
    rows: 12,
    hint: "Usa ### para categorías y alterna pregunta/respuesta con una línea en blanco entre ellas.",
  },
  {
    key: "envios",
    label: "Envíos y Devoluciones",
    url: "/envios",
    placeholder: "Escribe aquí la política de envíos y devoluciones...",
    rows: 12,
    hint: "Separa secciones con una línea vacía. Usa ### para títulos de sección.",
  },
];

function TextosTab({ texts: initialTexts }: { texts: PageTexts }) {
  const [texts, setTexts] = useState<PageTexts>(initialTexts);
  const [open, setOpen] = useState<keyof PageTexts | null>("announcementBar");
  const [saving, setSaving] = useState<keyof PageTexts | null>(null);
  const [saved, setSaved] = useState<keyof PageTexts | null>(null);
  const [, startTransition] = useTransition();

  function handleSave(key: keyof PageTexts, value: string) {
    setSaving(key);
    startTransition(async () => {
      await updatePageTextSection(key, value);
      setTexts((t) => ({ ...t, [key]: value || undefined }));
      setSaving(null);
      setSaved(key);
      setTimeout(() => setSaved(null), 2500);
    });
  }

  function handleReset(key: keyof PageTexts) {
    startTransition(async () => {
      await resetPageTextSection(key);
      setTexts((t) => { const n = { ...t }; delete n[key]; return n; });
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-[#8E7A6B] pb-2">
        Edita los textos de las páginas de la tienda. Si un campo está vacío, se usa el contenido por defecto.
      </p>

      {TEXT_SECTIONS.map((section) => {
        const isOpen = open === section.key;
        const currentValue = texts[section.key] ?? DEFAULT_PAGE_TEXTS[section.key];
        const hasCustom = Boolean(texts[section.key]);

        return (
          <div key={section.key} className="bg-[#F7F4F1] border border-[#D8BFAE] overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? null : section.key)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#EDE2D8]/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown size={13} strokeWidth={1.5} className="text-[#CDA78F] shrink-0" />
                ) : (
                  <ChevronRight size={13} strokeWidth={1.5} className="text-[#8E7A6B] shrink-0" />
                )}
                <div className="text-left">
                  <p className="text-xs text-[#5C4A3E] font-medium">{section.label}</p>
                  <p className="text-[10px] text-[#8E7A6B]">{section.url}</p>
                </div>
              </div>
              {hasCustom && (
                <span className="text-[9px] tracking-[0.1em] uppercase bg-[#CDA78F]/15 text-[#CDA78F] px-2 py-0.5">
                  Personalizado
                </span>
              )}
            </button>

            {isOpen && section.customEditor === "featuresStrip" ? (
              <FeaturesStripEditor
                value={currentValue}
                isSaving={saving === section.key}
                isSaved={saved === section.key}
                hasCustom={hasCustom}
                onSave={(val) => handleSave(section.key, val)}
                onReset={() => handleReset(section.key)}
              />
            ) : isOpen && section.customEditor === "socialLinks" ? (
              <SocialLinksEditor
                value={currentValue}
                isSaving={saving === section.key}
                isSaved={saved === section.key}
                hasCustom={hasCustom}
                onSave={(val) => handleSave(section.key, val)}
                onReset={() => handleReset(section.key)}
              />
            ) : isOpen ? (
              <TextSectionEditor
                section={section}
                value={currentValue}
                isSaving={saving === section.key}
                isSaved={saved === section.key}
                hasCustom={hasCustom}
                onSave={(val) => handleSave(section.key, val)}
                onReset={() => handleReset(section.key)}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function TextSectionEditor({
  section, value: initialValue, isSaving, isSaved, hasCustom, onSave, onReset,
}: {
  section: TextSectionDef;
  value: string;
  isSaving: boolean;
  isSaved: boolean;
  hasCustom: boolean;
  onSave: (val: string) => void;
  onReset: () => void;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="px-5 pb-5 border-t border-[#EDE2D8] space-y-3 pt-4">
      <p className="text-[10px] text-[#8E7A6B]">{section.hint}</p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={section.rows}
        className="w-full bg-white border border-[#D8BFAE] px-3 py-2.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] resize-y font-sans leading-relaxed"
        placeholder={section.placeholder}
      />
      <div className="flex items-center justify-between">
        <div>
          {hasCustom && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors"
            >
              <RotateCcw size={10} strokeWidth={1.5} />
              Restablecer por defecto
            </button>
          )}
        </div>
        <button
          onClick={() => onSave(value)}
          disabled={isSaving}
          className="flex items-center gap-1.5 text-[9px] tracking-[0.15em] uppercase px-4 py-2 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white transition-colors disabled:opacity-50"
        >
          {isSaved ? (
            <><Check size={10} strokeWidth={2} /> Guardado</>
          ) : isSaving ? (
            "Guardando..."
          ) : (
            "Guardar"
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Features Strip Editor ─────────────────────────────────────

const ICON_LIST = Object.keys(FEATURE_ICON_MAP);

function FeaturesStripEditor({
  value: initialValue, isSaving, isSaved, hasCustom, onSave, onReset,
}: {
  value: string;
  isSaving: boolean;
  isSaved: boolean;
  hasCustom: boolean;
  onSave: (val: string) => void;
  onReset: () => void;
}) {
  const [items, setItems] = useState<FeatureItem[]>(() => parseFeatureItems(initialValue));
  const [pickerIdx, setPickerIdx] = useState<number | null>(null);

  function update(idx: number, field: keyof FeatureItem, val: string) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  }

  function addItem() {
    setItems((prev) => [...prev, { icon: "Star", title: "", subtitle: "" }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="px-5 pb-5 border-t border-[#EDE2D8] space-y-3 pt-4">
      <p className="text-[10px] text-[#8E7A6B]">
        Sin límite de ítems. Haz clic en el ícono para cambiarlo. Los cambios se reflejan en la banda bajo el carrusel.
      </p>

      {/* Overlay to close picker */}
      {pickerIdx !== null && (
        <div className="fixed inset-0 z-30" onClick={() => setPickerIdx(null)} />
      )}

      <div className="space-y-2">
        {items.map((item, idx) => {
          const Icon = FEATURE_ICON_MAP[item.icon] ?? Star;
          return (
            <div key={idx} className="flex items-center gap-2 bg-white border border-[#D8BFAE] px-3 py-2.5">
              {/* Icon picker trigger */}
              <div className="relative z-40 shrink-0">
                <button
                  type="button"
                  onClick={() => setPickerIdx(pickerIdx === idx ? null : idx)}
                  title="Cambiar ícono"
                  className="w-9 h-9 flex items-center justify-center border border-[#D8BFAE] hover:border-[#CDA78F] bg-[#F7F4F1] transition-colors"
                >
                  <Icon size={16} strokeWidth={1.5} className="text-[#CDA78F]" />
                </button>
                {pickerIdx === idx && (
                  <div className="absolute top-10 left-0 z-50 bg-white border border-[#D8BFAE] shadow-md p-2 grid grid-cols-6 gap-1 w-52">
                    {ICON_LIST.map((name) => {
                      const I = FEATURE_ICON_MAP[name]!;
                      return (
                        <button
                          key={name}
                          type="button"
                          title={name}
                          onClick={() => { update(idx, "icon", name); setPickerIdx(null); }}
                          className={`w-7 h-7 flex items-center justify-center transition-colors hover:bg-[#EDE2D8] ${item.icon === name ? "bg-[#CDA78F]/20 border border-[#CDA78F]" : ""}`}
                        >
                          <I size={13} strokeWidth={1.5} className="text-[#CDA78F]" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Title + subtitle */}
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  value={item.title}
                  onChange={(e) => update(idx, "title", e.target.value)}
                  placeholder="Título"
                  className="bg-[#F7F4F1] border border-[#D8BFAE] px-2 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                />
                <input
                  value={item.subtitle}
                  onChange={(e) => update(idx, "subtitle", e.target.value)}
                  placeholder="Subtítulo"
                  className="bg-[#F7F4F1] border border-[#D8BFAE] px-2 py-1.5 text-[10px] text-[#8E7A6B] outline-none focus:border-[#CDA78F]"
                />
              </div>

              {/* Delete */}
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="shrink-0 w-7 h-7 flex items-center justify-center text-[#D8BFAE] hover:text-red-400 hover:border-red-200 border border-transparent transition-colors"
              >
                <X size={12} strokeWidth={1.5} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-1.5 text-[9px] tracking-[0.12em] uppercase text-[#CDA78F] hover:text-[#8E7A6B] border border-dashed border-[#CDA78F]/50 hover:border-[#D8BFAE] px-4 py-2 transition-colors w-full justify-center"
      >
        <Plus size={11} strokeWidth={1.75} />
        Agregar característica
      </button>

      <div className="flex items-center justify-between pt-1">
        <div>
          {hasCustom && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors"
            >
              <RotateCcw size={10} strokeWidth={1.5} />
              Restablecer por defecto
            </button>
          )}
        </div>
        <button
          onClick={() => onSave(JSON.stringify(items))}
          disabled={isSaving}
          className="flex items-center gap-1.5 text-[9px] tracking-[0.15em] uppercase px-4 py-2 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white transition-colors disabled:opacity-50"
        >
          {isSaved ? <><Check size={10} strokeWidth={2} /> Guardado</> : isSaving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}

// ─── Social Links Editor ──────────────────────────────────────

const SOCIAL_PLATFORM_LIST = Object.keys(SOCIAL_ICON_MAP);

function SocialLinksEditor({
  value: initialValue, isSaving, isSaved, hasCustom, onSave, onReset,
}: {
  value: string;
  isSaving: boolean;
  isSaved: boolean;
  hasCustom: boolean;
  onSave: (val: string) => void;
  onReset: () => void;
}) {
  const [items, setItems] = useState<SocialLink[]>(() => parseSocialLinks(initialValue));
  const [pickerIdx, setPickerIdx] = useState<number | null>(null);

  function updateUrl(idx: number, url: string) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, url } : it));
  }

  function updatePlatform(idx: number, platform: string) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, platform } : it));
    setPickerIdx(null);
  }

  function addItem() {
    const used = new Set(items.map((i) => i.platform));
    const next = SOCIAL_PLATFORM_LIST.find((p) => !used.has(p)) ?? "instagram";
    setItems((prev) => [...prev, { platform: next, url: "" }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="px-5 pb-5 border-t border-[#EDE2D8] space-y-3 pt-4">
      <p className="text-[10px] text-[#8E7A6B]">
        Agrega todas las redes que necesites. Haz clic en el ícono para cambiar la plataforma.
      </p>

      {pickerIdx !== null && (
        <div className="fixed inset-0 z-30" onClick={() => setPickerIdx(null)} />
      )}

      <div className="space-y-2">
        {items.map((item, idx) => {
          const entry = SOCIAL_ICON_MAP[item.platform];
          const Icon = entry?.Icon;
          return (
            <div key={idx} className="flex items-center gap-2 bg-white border border-[#D8BFAE] px-3 py-2.5">
              {/* Platform picker */}
              <div className="relative z-40 shrink-0">
                <button
                  type="button"
                  onClick={() => setPickerIdx(pickerIdx === idx ? null : idx)}
                  title={entry?.label ?? item.platform}
                  className="w-9 h-9 flex items-center justify-center border border-[#D8BFAE] hover:border-[#CDA78F] bg-[#F7F4F1] transition-colors"
                >
                  {Icon ? <Icon size={16} /> : <span className="text-[9px] text-[#8E7A6B]">{item.platform.slice(0,2)}</span>}
                </button>
                {pickerIdx === idx && (
                  <div className="absolute top-10 left-0 z-50 bg-white border border-[#D8BFAE] shadow-md p-2 grid grid-cols-5 gap-1 w-44">
                    {SOCIAL_PLATFORM_LIST.map((platform) => {
                      const e = SOCIAL_ICON_MAP[platform]!;
                      const I = e.Icon;
                      return (
                        <button
                          key={platform}
                          type="button"
                          title={e.label}
                          onClick={() => updatePlatform(idx, platform)}
                          className={`w-7 h-7 flex items-center justify-center transition-colors hover:bg-[#EDE2D8] ${item.platform === platform ? "bg-[#CDA78F]/20 border border-[#CDA78F]" : ""}`}
                        >
                          <I size={13} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Platform label + URL */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <span className="text-[9px] tracking-[0.1em] uppercase text-[#CDA78F] shrink-0 w-20 truncate">
                  {entry?.label ?? item.platform}
                </span>
                <input
                  type="url"
                  value={item.url}
                  onChange={(e) => updateUrl(idx, e.target.value)}
                  placeholder={`https://${item.platform}.com/liradeluna`}
                  className="flex-1 bg-[#F7F4F1] border border-[#D8BFAE] px-2 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] min-w-0"
                />
              </div>

              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="shrink-0 w-7 h-7 flex items-center justify-center text-[#D8BFAE] hover:text-red-400 border border-transparent transition-colors"
              >
                <X size={12} strokeWidth={1.5} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-1.5 text-[9px] tracking-[0.12em] uppercase text-[#CDA78F] hover:text-[#8E7A6B] border border-dashed border-[#CDA78F]/50 hover:border-[#D8BFAE] px-4 py-2 transition-colors w-full justify-center"
      >
        <Plus size={11} strokeWidth={1.75} />
        Agregar red social
      </button>

      <div className="flex items-center justify-between pt-1">
        <div>
          {hasCustom && (
            <button onClick={onReset} className="flex items-center gap-1 text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors">
              <RotateCcw size={10} strokeWidth={1.5} />
              Restablecer por defecto
            </button>
          )}
        </div>
        <button
          onClick={() => onSave(JSON.stringify(items))}
          disabled={isSaving}
          className="flex items-center gap-1.5 text-[9px] tracking-[0.15em] uppercase px-4 py-2 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white transition-colors disabled:opacity-50"
        >
          {isSaved ? <><Check size={10} strokeWidth={2} /> Guardado</> : isSaving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}

// ─── Ubicaciones helpers ──────────────────────────────────────

const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY ?? "";

function mapsSearchUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
function mapsEmbedUrl(address: string) {
  if (!GMAPS_KEY || !address.trim()) return null;
  return `https://www.google.com/maps/embed/v1/place?key=${GMAPS_KEY}&q=${encodeURIComponent(address)}`;
}

// ─── Ubicaciones Tab ──────────────────────────────────────────

function UbicacionesTab({ locations: initialLocations }: { locations: StoreLocation[] }) {
  const [locations, setLocations] = useState<StoreLocation[]>(initialLocations);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<StoreLocation, "id">>({ name: "", address: "", mapUrl: "" });
  const [isAdding, setIsAdding] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function startAdd() {
    setEditingId(null);
    setDraft({ name: "", address: "", mapUrl: "" });
    setIsAdding(true);
  }

  function startEdit(loc: StoreLocation) {
    setIsAdding(false);
    setEditingId(loc.id);
    setDraft({ name: loc.name, address: loc.address, mapUrl: loc.mapUrl ?? "" });
  }

  function cancelForm() {
    setIsAdding(false);
    setEditingId(null);
  }

  function persist(next: StoreLocation[]) {
    startTransition(async () => {
      await updateStoreLocations(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  function confirmAdd() {
    if (!draft.name.trim() || !draft.address.trim()) return;
    const newLoc: StoreLocation = {
      id: crypto.randomUUID(),
      name: draft.name.trim(),
      address: draft.address.trim(),
      mapUrl: draft.mapUrl?.trim() || undefined,
    };
    const next = [...locations, newLoc];
    setLocations(next);
    setIsAdding(false);
    setDraft({ name: "", address: "", mapUrl: "" });
    persist(next);
  }

  function confirmEdit() {
    if (!editingId || !draft.name.trim() || !draft.address.trim()) return;
    const next = locations.map((l) =>
      l.id === editingId
        ? { ...l, name: draft.name.trim(), address: draft.address.trim(), mapUrl: draft.mapUrl?.trim() || undefined }
        : l,
    );
    setLocations(next);
    setEditingId(null);
    persist(next);
  }

  function remove(id: string) {
    const next = locations.filter((l) => l.id !== id);
    setLocations(next);
    if (editingId === id) setEditingId(null);
    persist(next);
  }

  const formActive = isAdding || editingId !== null;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Info banner */}
      <div className="bg-[#F7F4F1] border border-[#D8BFAE] px-5 py-4 text-xs text-[#8E7A6B] leading-relaxed space-y-1">
        <p className="font-medium text-[#5C4A3E] text-[11px] tracking-wide">Sucursales físicas</p>
        <p>Las ubicaciones que agregues aparecerán automáticamente en el inicio de tu tienda con la dirección y un mapa de Google Maps.</p>
        <p>Si tienes una sola sucursal, se muestra directamente. Si tienes varias, el cliente puede seleccionarlas con un clic.</p>
        <p className="text-[#CDA78F]">
          Para mostrar el mapa configura la variable de entorno{" "}
          <code className="bg-[#EDE2D8] px-1 rounded text-[10px]">NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY</code>{" "}
          con tu API Key de Google Maps Embed. Sin ella, la dirección se muestra igual con un enlace a Google Maps.
        </p>
      </div>

      {/* Location list */}
      <div className="space-y-2">
        {locations.length === 0 && !isAdding && (
          <p className="text-[11px] text-[#8E7A6B] tracking-wide py-4 text-center border border-dashed border-[#D8BFAE]">
            Sin sucursales configuradas
          </p>
        )}
        {locations.map((loc) => (
          <div key={loc.id} className="bg-[#F7F4F1] border border-[#D8BFAE]">
            {editingId === loc.id ? (
              <LocationForm
                draft={draft}
                setDraft={setDraft}
                onConfirm={confirmEdit}
                onCancel={cancelForm}
                label="Guardar cambios"
              />
            ) : (
              <div>
                <div className="flex items-start gap-3 px-4 py-3">
                  <MapPin size={14} strokeWidth={1.5} className="text-[#CDA78F] mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <a
                      href={mapsSearchUrl(loc.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5C4A3E] tracking-wide hover:text-[#CDA78F] transition-colors group"
                    >
                      {loc.name}
                      <ExternalLink size={9} strokeWidth={1.5} className="text-[#D8BFAE] group-hover:text-[#CDA78F] transition-colors" />
                    </a>
                    <p className="text-[11px] text-[#8E7A6B] mt-0.5 leading-snug whitespace-pre-line">{loc.address}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(loc)}
                      disabled={formActive}
                      className="w-7 h-7 flex items-center justify-center text-[#8E7A6B] hover:text-[#5C4A3E] border border-transparent hover:border-[#D8BFAE] transition-colors disabled:opacity-40"
                      title="Editar"
                    >
                      <Pencil size={11} strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(loc.id)}
                      disabled={formActive}
                      className="w-7 h-7 flex items-center justify-center text-[#D8BFAE] hover:text-red-400 border border-transparent transition-colors disabled:opacity-40"
                      title="Eliminar"
                    >
                      <Trash2 size={11} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
                {/* Map preview */}
                {loc.address.trim() && (
                  <div className="mx-4 mb-4">
                    {mapsEmbedUrl(loc.address) ? (
                      <iframe
                        src={mapsEmbedUrl(loc.address)!}
                        className="w-full h-44 border border-[#D8BFAE]"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        title={`Mapa — ${loc.name}`}
                      />
                    ) : (
                      <a
                        href={mapsSearchUrl(loc.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 w-full bg-[#EDE2D8] hover:bg-[#D8BFAE] border border-[#D8BFAE] px-4 py-3 text-[10px] tracking-[0.1em] uppercase text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors"
                      >
                        <ExternalLink size={11} strokeWidth={1.5} />
                        Ver ubicación en Google Maps
                        <span className="ml-auto text-[9px] text-[#CDA78F]">Configura NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY para ver el mapa aquí</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Add form */}
        {isAdding && (
          <div className="bg-[#F7F4F1] border border-[#CDA78F]/50">
            <LocationForm
              draft={draft}
              setDraft={setDraft}
              onConfirm={confirmAdd}
              onCancel={cancelForm}
              label="Agregar sucursal"
            />
          </div>
        )}
      </div>

      {/* Add button */}
      {!formActive && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={startAdd}
            className="flex items-center gap-1.5 text-[9px] tracking-[0.12em] uppercase text-[#CDA78F] hover:text-[#8E7A6B] border border-dashed border-[#CDA78F]/50 hover:border-[#D8BFAE] px-4 py-2 transition-colors"
          >
            <Plus size={11} strokeWidth={1.75} />
            Agregar sucursal
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-[9px] tracking-[0.1em] uppercase text-emerald-600">
              <Check size={10} strokeWidth={2} /> Guardado
            </span>
          )}
          {isPending && (
            <span className="text-[9px] text-[#8E7A6B]">Guardando…</span>
          )}
        </div>
      )}
    </div>
  );
}

function googleMapsUrlToEmbed(url: string): string {
  if (url.includes("/maps/embed")) return url;
  const m = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (m) return `https://maps.google.com/maps?q=${m[1]},${m[2]}&output=embed&hl=es`;
  return `https://maps.google.com/maps?q=${encodeURIComponent(url)}&output=embed&hl=es`;
}

function LocationForm({
  draft,
  setDraft,
  onConfirm,
  onCancel,
  label,
}: {
  draft: Omit<StoreLocation, "id">;
  setDraft: (d: Omit<StoreLocation, "id">) => void;
  onConfirm: () => void;
  onCancel: () => void;
  label: string;
}) {
  const valid = draft.name.trim().length > 0 && draft.address.trim().length > 0;

  const mapUrl = draft.mapUrl?.trim() ?? "";
  const previewEmbed = mapUrl.length > 10
    ? googleMapsUrlToEmbed(mapUrl)
    : (GMAPS_KEY && draft.address.trim().length > 8 ? mapsEmbedUrl(draft.address) : null);
  const previewSearch = mapUrl.length > 0
    ? mapUrl
    : (draft.address.trim() ? mapsSearchUrl(draft.address) : null);

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="space-y-1">
        <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Nombre de la sucursal</label>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="Ej: Sucursal Centro"
          className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Dirección completa</label>
        <textarea
          value={draft.address}
          onChange={(e) => setDraft({ ...draft, address: e.target.value })}
          placeholder={"Av. Ejemplo 123, Piso 2\nSantiago, Chile"}
          rows={2}
          className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] resize-none"
        />
      </div>

      {/* Enlace Google Maps */}
      <div className="space-y-1.5">
        <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">
          Enlace del mapa <span className="normal-case text-[#CDA78F]">(opcional)</span>
        </label>

        {/* Instrucciones paso a paso */}
        <div className="bg-[#EDE2D8]/60 border border-[#D8BFAE] px-3 py-2.5 space-y-1.5 text-[10px] text-[#8E7A6B]">
          <p className="font-medium text-[#5C4A3E]">¿Cómo obtener el enlace del mapa?</p>
          <p>1. Abre <strong>Google Maps</strong> y busca tu local.</p>
          <p>2. Haz clic en <strong>Compartir</strong> (ícono de compartir).</p>
          <p>3. Elige la pestaña <strong>"Insertar mapa"</strong>.</p>
          <p>4. Copia <strong>solo la URL</strong> que aparece dentro de <code className="bg-[#D8BFAE] px-1">src="..."</code></p>
          <p className="text-[9px] text-[#CDA78F]">
            Ejemplo: <span className="font-mono break-all">https://www.google.com/maps/embed?pb=!1m18...</span>
          </p>
        </div>

        <input
          type="url"
          value={draft.mapUrl ?? ""}
          onChange={(e) => setDraft({ ...draft, mapUrl: e.target.value })}
          placeholder="https://www.google.com/maps/embed?pb=!1m18..."
          className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
        />

        {/* Aviso si pega enlace acortado o no compatible */}
        {mapUrl.length > 5 && !mapUrl.includes("/maps/embed") && !mapUrl.match(/@-?\d+\.?\d*,-?\d+\.?\d*/) && (
          <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2">
            Este enlace no es compatible con el mapa integrado. Usa la URL del embed (Compartir → Insertar mapa → copiar src). El mapa se mostrará igual usando la dirección.
          </p>
        )}
      </div>

      {/* Vista previa del mapa */}
      {(mapUrl.length > 10 || draft.address.trim().length > 8) && (
        <div className="space-y-1.5">
          <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Vista previa</p>
          {previewEmbed ? (
            <iframe
              src={previewEmbed}
              className="w-full h-44 border border-[#D8BFAE]"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              title="Vista previa del mapa"
            />
          ) : previewSearch ? (
            <a
              href={previewSearch}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 w-full bg-[#EDE2D8] hover:bg-[#D8BFAE] border border-[#D8BFAE] px-4 py-3 text-[10px] tracking-[0.1em] uppercase text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors"
            >
              <ExternalLink size={11} strokeWidth={1.5} />
              Verificar en Google Maps
            </a>
          ) : null}
        </div>
      )}

      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="text-[9px] tracking-[0.12em] uppercase px-4 py-2 text-[#8E7A6B] hover:text-[#5C4A3E] border border-[#D8BFAE] transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!valid}
          className="flex items-center gap-1.5 text-[9px] tracking-[0.12em] uppercase px-4 py-2 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white transition-colors disabled:opacity-40"
        >
          <Check size={10} strokeWidth={2} />
          {label}
        </button>
      </div>
    </div>
  );
}

// ─── Contacto Tab ─────────────────────────────────────────────

function ContactoTab({ supportEmail: initEmail, supportPhone: initPhone }: { supportEmail: string; supportPhone: string }) {
  const [email, setEmail]       = useState(initEmail);
  const [phone, setPhone]       = useState(initPhone);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState("");
  const [isPending, start]      = useTransition();

  function handleSave() {
    setError("");
    start(async () => {
      try {
        await updateContactInfo({ supportEmail: email, supportPhone: phone });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        setError("Error al guardar");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">Información de contacto y soporte</h2>
        <p className="text-xs text-[#8E7A6B] mt-0.5">
          Se muestra a clientes en sus comprobantes y cuando necesitan contactar soporte.
        </p>
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2">{error}</p>}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Correo de soporte</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contacto@lirradeluna.cl"
            className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Teléfono / WhatsApp de soporte</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+56 9 1234 5678"
            className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-1.5 px-6 py-2.5 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[10px] tracking-[0.15em] uppercase transition-colors disabled:opacity-50"
        >
          {saved ? <><Check size={11} /> Guardado</> : isPending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
