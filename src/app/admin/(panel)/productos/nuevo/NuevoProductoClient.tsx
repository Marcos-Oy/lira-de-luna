"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronLeft, Plus, X, Check, Scale, Package, Hash, Tag,
  Upload, ImageOff,
} from "lucide-react";
import { createProduct } from "@/app/actions/admin/products";

type Collection = { id: string; name: string; slug: string };

type TierForm    = { minQuantity: string; pricePerUnit: string };
type WeightForm  = { metalType: string; pricePerGram: string; minGrams: string; stock: string };
type VariantForm = { label: string; stock: string };

type FormData = {
  name: string; slug: string; description: string; price: string; stock: string;
  collectionId: string; images: string[]; materials: string;
  isNew: boolean; isBestseller: boolean;
  saleType: "UNIT" | "WHOLESALE" | "WEIGHT";
  tiers: TierForm[];
  weight: WeightForm;
  hasVariants: boolean;
  variants: VariantForm[];
  saleEnabled: boolean;
  saleDiscountPct: string;
  saleStartAt: string; saleEndAt: string;
};

const METAL_LABELS: Record<string, string> = {
  ORO_18K: "Oro 18k", ORO_14K: "Oro 14k", ORO_10K: "Oro 10k",
  PLATA_925: "Plata .925", PLATA_800: "Plata .800",
  ORO_BLANCO_18K: "Oro blanco 18k", ORO_ROSA_18K: "Oro rosado 18k",
};

function makeEmpty(collectionId: string): FormData {
  return {
    name: "", slug: "", description: "", price: "", stock: "0", collectionId,
    images: [], materials: "", isNew: false, isBestseller: false,
    saleType: "UNIT",
    tiers: [{ minQuantity: "10", pricePerUnit: "" }],
    weight: { metalType: "PLATA_925", pricePerGram: "", minGrams: "1", stock: "0" },
    hasVariants: false,
    variants: [{ label: "", stock: "0" }],
    saleEnabled: false, saleDiscountPct: "", saleStartAt: "", saleEndAt: "",
  };
}

export default function NuevoProductoClient({ collections }: { collections: Collection[] }) {
  const router = useRouter();
  const defaultCollectionId = collections[0]?.id ?? "";

  const [form, setForm] = useState<FormData>(() => makeEmpty(defaultCollectionId));
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  // ── Toast ──────────────────────────────────────────────────────────────
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  function showToast(msg: string) {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3500);
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json() as { url?: string; error?: string };
        if (data.url) urls.push(data.url);
        else setError(data.error ?? "Error al subir imagen");
      }
      if (urls.length) setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeImage(i: number) {
    setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));
  }

  function addVariant() { setForm((f) => ({ ...f, variants: [...f.variants, { label: "", stock: "0" }] })); }
  function removeVariant(i: number) { setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) })); }
  function updateVariant(i: number, field: keyof VariantForm, value: string) {
    setForm((f) => ({ ...f, variants: f.variants.map((v, idx) => idx === i ? { ...v, [field]: value } : v) }));
  }

  function addTier() { setForm((f) => ({ ...f, tiers: [...f.tiers, { minQuantity: "", pricePerUnit: "" }] })); }
  function removeTier(i: number) { setForm((f) => ({ ...f, tiers: f.tiers.filter((_, idx) => idx !== i) })); }
  function updateTier(i: number, field: keyof TierForm, value: string) {
    setForm((f) => ({ ...f, tiers: f.tiers.map((t, idx) => idx === i ? { ...t, [field]: value } : t) }));
  }
  function updateWeight(field: keyof WeightForm, value: string) {
    setForm((f) => ({ ...f, weight: { ...f.weight, [field]: value } }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const materials = form.materials.split("\n").map((s) => s.trim()).filter(Boolean);
    const price = parseInt(form.price, 10) || 0;
    if (!form.name || !form.slug || !form.collectionId) {
      setError("Completa todos los campos requeridos"); return;
    }
    if (form.saleType === "WHOLESALE" && form.tiers.length === 0) {
      setError("Agrega al menos un tier de precio"); return;
    }
    if (form.saleType === "WEIGHT" && !form.weight.pricePerGram) {
      setError("Ingresa el precio por gramo"); return;
    }
    if (form.hasVariants && form.saleType === "UNIT") {
      const valid = form.variants.filter((v) => v.label.trim());
      if (valid.length === 0) { setError("Agrega al menos una variante/talla"); return; }
    }
    setError("");

    const wholesaleTiers = form.saleType === "WHOLESALE"
      ? form.tiers.map((t) => ({ minQuantity: parseInt(t.minQuantity) || 0, pricePerUnit: parseInt(t.pricePerUnit) || 0 })).filter((t) => t.minQuantity > 0 && t.pricePerUnit > 0)
      : [];
    const weightConfig = form.saleType === "WEIGHT"
      ? { metalType: form.weight.metalType, pricePerGram: parseInt(form.weight.pricePerGram) || 0, minGrams: parseFloat(form.weight.minGrams) || 1, stock: parseFloat(form.weight.stock) || 0 }
      : undefined;
    const variantData = (form.hasVariants && form.saleType === "UNIT")
      ? form.variants.filter((v) => v.label.trim()).map((v) => ({ label: v.label.trim(), stock: parseInt(v.stock) || 0, type: "Talla" }))
      : [];
    const stock = parseInt(form.stock) || 0;

    startTransition(async () => {
      const res = await createProduct({
        name: form.name, slug: form.slug, description: form.description, price, stock,
        collectionId: form.collectionId, images: form.images, materials,
        isNew: form.isNew, isBestseller: form.isBestseller, saleType: form.saleType,
        wholesaleTiers, weightConfig, variants: variantData,
        saleEnabled: form.saleEnabled,
        saleDiscountPct: form.saleDiscountPct ? Math.max(1, Math.min(99, parseInt(form.saleDiscountPct))) : undefined,
        saleStartAt: form.saleStartAt || undefined,
        saleEndAt: form.saleEndAt || undefined,
      });
      if ("error" in res) { setError(String(res.error)); return; }
      const productName = form.name;
      setForm(makeEmpty(defaultCollectionId));
      showToast(`"${productName}" creado correctamente`);
    });
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Floating toast ── */}
      <div
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white flex items-center gap-2.5 px-5 py-3 shadow-xl transition-opacity duration-500 pointer-events-none ${toastVisible ? "opacity-100" : "opacity-0"}`}
      >
        <Check size={16} strokeWidth={2.5} />
        <span className="text-sm font-medium tracking-wide">{toastMsg}</span>
      </div>

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/admin/productos")}
          className="flex items-center gap-1.5 text-[10px] tracking-[0.12em] uppercase text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors"
        >
          <ChevronLeft size={13} strokeWidth={1.5} /> Volver
        </button>
        <h1 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">
          Nuevo producto
        </h1>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="bg-[#F7F4F1] border border-[#D8BFAE] p-6 space-y-5">

        {/* Name + Slug */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Nombre *</label>
            <input value={form.name} onChange={(e) => setField("name", e.target.value)} className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" placeholder="Collar Luna Creciente" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Slug *</label>
            <input value={form.slug} onChange={(e) => setField("slug", e.target.value)} className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" placeholder="collar-luna-creciente" />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Descripción</label>
          <textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={2} className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] resize-none" />
        </div>

        {/* Collection + SaleType */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Colección *</label>
            <select value={form.collectionId} onChange={(e) => setField("collectionId", e.target.value)} className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]">
              {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Tipo de venta *</label>
            <select value={form.saleType} onChange={(e) => setField("saleType", e.target.value as "UNIT" | "WHOLESALE" | "WEIGHT")} className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]">
              <option value="UNIT">Unitario (retail normal)</option>
              <option value="WHOLESALE">Por cantidad (mayorista)</option>
              <option value="WEIGHT">Por peso (mayorista)</option>
            </select>
          </div>
        </div>

        {/* Price */}
        {form.saleType !== "WEIGHT" && (
          <div className="space-y-1.5">
            <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">
              {form.saleType === "WHOLESALE" ? "Precio retail (referencia) CLP" : "Precio CLP *"}
            </label>
            <input type="number" value={form.price} onChange={(e) => setField("price", e.target.value)} className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" placeholder="28900" />
          </div>
        )}

        {/* UNIT: stock or variants */}
        {form.saleType === "UNIT" && (
          <div className="space-y-3 p-4 border border-[#D8BFAE] bg-white">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={form.hasVariants} onChange={(e) => setField("hasVariants", e.target.checked)} className="accent-[#CDA78F]" />
              <span className="text-[9px] tracking-[0.15em] uppercase text-[#5C4A3E] font-medium">
                Este producto tiene tallas / variantes
              </span>
            </label>
            {form.hasVariants ? (
              <div className="space-y-3 pl-5 border-l-2 border-[#CDA78F]/30">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Talla · Stock por talla</p>
                  <button type="button" onClick={addVariant} className="text-[9px] tracking-[0.1em] uppercase text-[#CDA78F] hover:text-[#8E7A6B] flex items-center gap-1 transition-colors">
                    <Plus size={10} /> Agregar talla
                  </button>
                </div>
                <div className="grid grid-cols-[1fr_1fr_32px] gap-2 text-[9px] tracking-[0.08em] uppercase text-[#8E7A6B] mb-1">
                  <span>Talla</span><span>Stock (unidades)</span><span></span>
                </div>
                {form.variants.map((v, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_32px] gap-2 items-center">
                    <input type="text" value={v.label} onChange={(e) => updateVariant(i, "label", e.target.value)} placeholder="ej. 5 · 6 · 7" className="bg-[#F7F4F1] border border-[#D8BFAE] px-2 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                    <input type="number" min="0" value={v.stock} onChange={(e) => updateVariant(i, "stock", e.target.value)} placeholder="0" className="bg-[#F7F4F1] border border-[#D8BFAE] px-2 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                    <button type="button" onClick={() => removeVariant(i)} disabled={form.variants.length === 1} className="w-8 h-8 flex items-center justify-center text-[#D8BFAE] hover:text-red-400 disabled:opacity-30 transition-colors">
                      <X size={13} strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
                <p className="text-[9px] text-[#8E7A6B]">Las tallas con stock 0 aparecerán tachadas en la tienda.</p>
              </div>
            ) : (
              <div className="pl-5 border-l-2 border-[#CDA78F]/30 space-y-1.5">
                <label className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Stock (unidades)</label>
                <input type="number" min="0" value={form.stock} onChange={(e) => setField("stock", e.target.value)} className="w-36 bg-[#F7F4F1] border border-[#D8BFAE] px-2 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" placeholder="0" />
              </div>
            )}
          </div>
        )}

        {/* WHOLESALE tiers */}
        {form.saleType === "WHOLESALE" && (
          <div className="space-y-3 p-4 bg-blue-50 border border-blue-200">
            <div className="flex items-center justify-between">
              <p className="text-[9px] tracking-[0.15em] uppercase text-blue-700 font-medium flex items-center gap-1.5">
                <Hash size={11} /> Tiers de precio mayorista
              </p>
              <button type="button" onClick={addTier} className="text-[9px] tracking-[0.1em] uppercase text-blue-600 hover:text-blue-800 flex items-center gap-1">
                <Plus size={10} /> Agregar tier
              </button>
            </div>
            <div className="grid grid-cols-[1fr_1fr_32px] gap-2 text-[9px] tracking-[0.1em] uppercase text-blue-500 mb-1">
              <span>Cantidad mínima</span><span>Precio/unidad CLP</span><span></span>
            </div>
            {form.tiers.map((t, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_32px] gap-2 items-center">
                <input type="number" value={t.minQuantity} onChange={(e) => updateTier(i, "minQuantity", e.target.value)} placeholder="ej. 10" className="bg-white border border-blue-200 px-2 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-blue-400" />
                <input type="number" value={t.pricePerUnit} onChange={(e) => updateTier(i, "pricePerUnit", e.target.value)} placeholder="ej. 15000" className="bg-white border border-blue-200 px-2 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-blue-400" />
                <button type="button" onClick={() => removeTier(i)} disabled={form.tiers.length === 1} className="w-8 h-8 flex items-center justify-center text-blue-300 hover:text-red-400 disabled:opacity-30 transition-colors">
                  <X size={13} strokeWidth={1.5} />
                </button>
              </div>
            ))}
            <p className="text-[10px] text-blue-500">El cliente ve el precio según la cantidad que pide.</p>
          </div>
        )}

        {/* WEIGHT config */}
        {form.saleType === "WEIGHT" && (
          <div className="space-y-4 p-4 bg-purple-50 border border-purple-200">
            <p className="text-[9px] tracking-[0.15em] uppercase text-purple-700 font-medium flex items-center gap-1.5">
              <Scale size={11} /> Configuración por peso
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] tracking-[0.12em] uppercase text-purple-600">Metal</label>
                <select value={form.weight.metalType} onChange={(e) => updateWeight("metalType", e.target.value)} className="w-full bg-white border border-purple-200 px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-purple-400">
                  {Object.entries(METAL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] tracking-[0.12em] uppercase text-purple-600">Precio por gramo CLP *</label>
                <input type="number" value={form.weight.pricePerGram} onChange={(e) => updateWeight("pricePerGram", e.target.value)} placeholder="ej. 2500" className="w-full bg-white border border-purple-200 px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-purple-400" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] tracking-[0.12em] uppercase text-purple-600">Mínimo (gramos)</label>
                <input type="number" step="0.1" value={form.weight.minGrams} onChange={(e) => updateWeight("minGrams", e.target.value)} placeholder="1" className="w-full bg-white border border-purple-200 px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-purple-400" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] tracking-[0.12em] uppercase text-purple-600">Stock disponible (g)</label>
                <input type="number" step="0.1" value={form.weight.stock} onChange={(e) => updateWeight("stock", e.target.value)} placeholder="0" className="w-full bg-white border border-purple-200 px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-purple-400" />
              </div>
            </div>
          </div>
        )}

        {/* Images */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">
              Imágenes del producto
              {form.images.length > 0 && <span className="ml-2 text-[#CDA78F]">({form.images.length})</span>}
            </label>
            <label className={`cursor-pointer flex items-center gap-1.5 text-[9px] tracking-[0.1em] uppercase px-3 py-1.5 border transition-colors ${uploading ? "opacity-50 cursor-not-allowed border-[#D8BFAE] text-[#8E7A6B]" : "border-[#CDA78F] text-[#CDA78F] hover:bg-[#CDA78F] hover:text-white"}`}>
              <Upload size={10} strokeWidth={1.5} />
              {uploading ? "Subiendo..." : "Subir fotos"}
              <input type="file" multiple accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif" onChange={handleImageUpload} disabled={uploading} className="hidden" />
            </label>
          </div>
          {form.images.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {form.images.map((url, i) => (
                <div key={i} className="relative w-20 h-20 border border-[#D8BFAE] overflow-hidden bg-[#EDE2D8]">
                  <Image src={url} alt={`Imagen ${i + 1}`} fill className="object-cover" sizes="80px" unoptimized={url.startsWith("/uploads")} />
                  <button type="button" onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors" aria-label="Eliminar imagen">
                    <X size={10} strokeWidth={2} />
                  </button>
                  {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] text-center py-0.5">Principal</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-[#D8BFAE] py-8 flex flex-col items-center justify-center gap-2 text-[#D8BFAE]">
              <ImageOff size={24} strokeWidth={1} />
              <p className="text-[10px] tracking-wide">Sin imágenes — haz clic en "Subir fotos"</p>
            </div>
          )}
          <p className="text-[9px] text-[#8E7A6B]">JPG, PNG, WEBP o GIF · Máx. 10 MB · La primera imagen es la principal</p>
        </div>

        {/* Materials */}
        <div className="space-y-1.5">
          <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Materiales (uno por línea)</label>
          <textarea value={form.materials} onChange={(e) => setField("materials", e.target.value)} rows={2} className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] resize-none" placeholder={"Plata .925\nBaño de oro 18k"} />
        </div>

        {/* Flags */}
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isNew} onChange={(e) => setField("isNew", e.target.checked)} className="accent-[#CDA78F]" />
            <span className="text-xs text-[#5C4A3E]">Nuevo</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isBestseller} onChange={(e) => setField("isBestseller", e.target.checked)} className="accent-[#CDA78F]" />
            <span className="text-xs text-[#5C4A3E]">Bestseller</span>
          </label>
        </div>

        {/* Oferta */}
        <div className="space-y-3 p-4 border border-[#D8BFAE] bg-white">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={form.saleEnabled} onChange={(e) => setField("saleEnabled", e.target.checked)} className="accent-[#CDA78F]" />
            <span className="text-[9px] tracking-[0.15em] uppercase text-[#5C4A3E] font-medium flex items-center gap-1.5">
              <Tag size={11} strokeWidth={1.5} className="text-[#CDA78F]" />
              Activar oferta por fechas
            </span>
          </label>
          {form.saleEnabled && (
            <div className="space-y-3 pl-5 border-l-2 border-[#CDA78F]/30">
              <div className="flex items-end gap-3">
                <div className="space-y-1 w-32">
                  <label className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Descuento %</label>
                  <div className="relative">
                    <input type="number" min="1" max="99" value={form.saleDiscountPct} onChange={(e) => setField("saleDiscountPct", e.target.value)} placeholder="ej. 20" className="w-full bg-[#F7F4F1] border border-[#D8BFAE] pl-2 pr-6 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#8E7A6B]">%</span>
                  </div>
                </div>
                {form.saleDiscountPct && form.price && (
                  <div className="pb-1">
                    <p className="text-[10px] text-[#8E7A6B]">Precio con descuento</p>
                    <p className="text-sm font-medium text-orange-500">
                      ${Math.round(parseInt(form.price) * (1 - parseInt(form.saleDiscountPct) / 100)).toLocaleString("es-CL")} CLP
                    </p>
                    <p className="text-[10px] text-[#D8BFAE] line-through">${parseInt(form.price).toLocaleString("es-CL")}</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Inicio de oferta</label>
                  <input type="date" value={form.saleStartAt} onChange={(e) => setField("saleStartAt", e.target.value)} className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-2 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Fin de oferta</label>
                  <input type="date" value={form.saleEndAt} onChange={(e) => setField("saleEndAt", e.target.value)} className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-2 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                </div>
              </div>
              <p className="text-[9px] text-[#8E7A6B]">
                El precio con descuento se calcula automáticamente. Sin fechas, la oferta estará activa de inmediato.
              </p>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => router.push("/admin/productos")}
            className="text-[10px] tracking-[0.12em] uppercase px-5 py-2.5 border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending || uploading}
            className="text-[10px] tracking-[0.15em] uppercase px-8 py-2.5 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white transition-colors disabled:opacity-50"
          >
            {isPending ? "Creando..." : "Crear producto"}
          </button>
        </div>
      </form>
    </div>
  );
}
