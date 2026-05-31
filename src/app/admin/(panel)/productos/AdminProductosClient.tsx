"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Plus, Search, Pencil, Trash2, X, Check, Scale, Package, Hash, Tag,
  ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal, Upload, ImageOff,
  CheckSquare, Square, Minus, Loader2,
} from "lucide-react";
import {
  updateProduct,
  deleteProduct,
  toggleProductActive,
  bulkToggleProductActive,
  bulkDeleteProducts,
  bulkSetSale,
  bulkRemoveSale,
} from "@/app/actions/admin/products";

type Collection = { id: string; name: string; slug: string };
type Tier = { minQuantity: number; pricePerUnit: number; sortOrder: number };
type WeightProduct = { metalType: string; pricePerGram: number; minGrams: number; stock: number } | null;
type Variant = { id: string; label: string; type: string; stock: number; isActive: boolean };

type Product = {
  id: string; slug: string; name: string; price: number; stock: number;
  images: unknown; materials: unknown; isNew: boolean;
  isBestseller: boolean; isActive: boolean; saleType: string;
  collection: { name: string; slug: string };
  collectionId: string; description: string | null;
  wholesaleTiers: Tier[];
  weightProduct: WeightProduct;
  variants: Variant[];
  saleEnabled: boolean;
  saleDiscountPct: number | null;
  saleStartAt: Date | null;
  saleEndAt: Date | null;
  createdAt: Date;
};

interface Props {
  products: Product[];
  collections: Collection[];
  totalProducts: number;
  totalPages: number;
  currentPage: number;
  filters: {
    q: string; collection: string; status: string; saleType: string;
    stock: string; minPrice?: number; maxPrice?: number;
    dateFrom?: string; dateTo?: string; sort: string;
  };
}

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

const emptyForm: FormData = {
  name: "", slug: "", description: "", price: "", stock: "0", collectionId: "",
  images: [], materials: "", isNew: false, isBestseller: false,
  saleType: "UNIT",
  tiers: [{ minQuantity: "10", pricePerUnit: "" }],
  weight: { metalType: "PLATA_925", pricePerGram: "", minGrams: "1", stock: "0" },
  hasVariants: false,
  variants: [{ label: "", stock: "0" }],
  saleEnabled: false, saleDiscountPct: "",
  saleStartAt: "", saleEndAt: "",
};

const METAL_LABELS: Record<string, string> = {
  ORO_18K: "Oro 18k", ORO_14K: "Oro 14k", ORO_10K: "Oro 10k",
  PLATA_925: "Plata .925", PLATA_800: "Plata .800",
  ORO_BLANCO_18K: "Oro blanco 18k", ORO_ROSA_18K: "Oro rosado 18k",
};

const SALE_TYPE_LABELS: Record<string, string> = {
  UNIT: "Unitario", WHOLESALE: "Por cantidad", WEIGHT: "Por peso",
};
const SALE_TYPE_COLORS: Record<string, string> = {
  UNIT: "bg-[#EDE2D8] text-[#8E7A6B]",
  WHOLESALE: "bg-blue-50 text-blue-600",
  WEIGHT: "bg-purple-50 text-purple-600",
};

function getFirstImage(images: unknown): string {
  if (Array.isArray(images) && typeof images[0] === "string") return images[0];
  return "";
}

export default function AdminProductosClient({
  products: initial,
  collections,
  totalProducts,
  totalPages,
  currentPage,
  filters,
}: Props) {
  const router = useRouter();

  // ── CRUD state ──────────────────────────────────────────────────────
  const [products, setProducts] = useState(initial);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  // ── Bulk actions state ───────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkSaleMode, setBulkSaleMode] = useState(false);
  const [bulkSalePct, setBulkSalePct] = useState("");
  const [bulkSaleStart, setBulkSaleStart] = useState("");
  const [bulkSaleEnd, setBulkSaleEnd] = useState("");
  const [bulkResult, setBulkResult] = useState("");
  const [isBulkPending, startBulkTransition] = useTransition();

  // ── Filter draft state ───────────────────────────────────────────────
  const [localQ,          setLocalQ]          = useState(filters.q);
  const [localCollection, setLocalCollection] = useState(filters.collection);
  const [localStatus,     setLocalStatus]     = useState(filters.status);
  const [localSaleType,   setLocalSaleType]   = useState(filters.saleType);
  const [localStock,      setLocalStock]      = useState(filters.stock);
  const [localMinPrice,   setLocalMinPrice]   = useState(filters.minPrice ? String(filters.minPrice) : "");
  const [localMaxPrice,   setLocalMaxPrice]   = useState(filters.maxPrice ? String(filters.maxPrice) : "");
  const [localDateFrom,   setLocalDateFrom]   = useState(filters.dateFrom ?? "");
  const [localDateTo,     setLocalDateTo]     = useState(filters.dateTo   ?? "");
  const [localSort,       setLocalSort]       = useState(filters.sort);
  const [filtersOpen,     setFiltersOpen]     = useState(false);

  const activeFilterCount = [
    filters.collection, filters.status, filters.saleType, filters.stock,
    filters.minPrice, filters.maxPrice, filters.dateFrom, filters.dateTo,
  ].filter(Boolean).length;

  // ── Navigation helpers ──────────────────────────────────────────────
  function buildParams(overrides: Record<string, string | number | undefined> = {}) {
    const base: Record<string, string> = {};
    if (localQ)          base.q          = localQ;
    if (localCollection) base.collection = localCollection;
    if (localStatus)     base.status     = localStatus;
    if (localSaleType)   base.saleType   = localSaleType;
    if (localStock)      base.stock      = localStock;
    if (localMinPrice)   base.minPrice   = localMinPrice;
    if (localMaxPrice)   base.maxPrice   = localMaxPrice;
    if (localDateFrom)   base.dateFrom   = localDateFrom;
    if (localDateTo)     base.dateTo     = localDateTo;
    base.sort = localSort;
    base.page = "1";
    const merged = { ...base, ...overrides };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== "" && String(v) !== "0") params.set(k, String(v));
    }
    if (!params.has("sort")) params.set("sort", "newest");
    return params;
  }

  function applyFilters() { router.push(`?${buildParams().toString()}`); }
  function clearFilters() {
    setLocalQ(""); setLocalCollection(""); setLocalStatus("");
    setLocalSaleType(""); setLocalStock(""); setLocalMinPrice(""); setLocalMaxPrice("");
    setLocalDateFrom(""); setLocalDateTo("");
    setLocalSort("newest");
    router.push("?sort=newest&page=1");
  }
  function goToPage(p: number) {
    const params = new URLSearchParams();
    if (filters.q)          params.set("q",          filters.q);
    if (filters.collection) params.set("collection", filters.collection);
    if (filters.status)     params.set("status",     filters.status);
    if (filters.saleType)   params.set("saleType",   filters.saleType);
    if (filters.stock)      params.set("stock",      filters.stock);
    if (filters.minPrice)   params.set("minPrice",   String(filters.minPrice));
    if (filters.maxPrice)   params.set("maxPrice",   String(filters.maxPrice));
    if (filters.dateFrom)   params.set("dateFrom",   filters.dateFrom);
    if (filters.dateTo)     params.set("dateTo",     filters.dateTo);
    params.set("sort", filters.sort);
    params.set("page", String(p));
    router.push(`?${params.toString()}`);
  }

  // ── Image upload helpers ─────────────────────────────────────────────
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

  // ── Variant helpers ─────────────────────────────────────────────────
  function addVariant() {
    setForm((f) => ({ ...f, variants: [...f.variants, { label: "", stock: "0" }] }));
  }
  function removeVariant(i: number) {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));
  }
  function updateVariant(i: number, field: keyof VariantForm, value: string) {
    setForm((f) => ({ ...f, variants: f.variants.map((v, idx) => idx === i ? { ...v, [field]: value } : v) }));
  }

  // ── Tier helpers ─────────────────────────────────────────────────────
  function addTier() {
    setForm((f) => ({ ...f, tiers: [...f.tiers, { minQuantity: "", pricePerUnit: "" }] }));
  }
  function removeTier(i: number) {
    setForm((f) => ({ ...f, tiers: f.tiers.filter((_, idx) => idx !== i) }));
  }
  function updateTier(i: number, field: keyof TierForm, value: string) {
    setForm((f) => ({ ...f, tiers: f.tiers.map((t, idx) => idx === i ? { ...t, [field]: value } : t) }));
  }
  function updateWeight(field: keyof WeightForm, value: string) {
    setForm((f) => ({ ...f, weight: { ...f.weight, [field]: value } }));
  }

  // ── CRUD handlers ────────────────────────────────────────────────────
  function openEdit(p: Product) {
    const imgs = Array.isArray(p.images) ? (p.images as string[]) : [];
    setForm({
      name: p.name, slug: p.slug,
      description: typeof p.description === "string" ? p.description : "",
      price: String(p.price),
      stock: String(p.stock ?? 0),
      collectionId: p.collectionId,
      images: imgs,
      materials: Array.isArray(p.materials) ? (p.materials as string[]).join("\n") : "",
      isNew: p.isNew, isBestseller: p.isBestseller,
      saleType: p.saleType as "UNIT" | "WHOLESALE" | "WEIGHT",
      tiers: p.wholesaleTiers.length > 0
        ? p.wholesaleTiers.map((t) => ({ minQuantity: String(t.minQuantity), pricePerUnit: String(t.pricePerUnit) }))
        : [{ minQuantity: "10", pricePerUnit: "" }],
      weight: p.weightProduct
        ? { metalType: p.weightProduct.metalType, pricePerGram: String(p.weightProduct.pricePerGram), minGrams: String(p.weightProduct.minGrams), stock: String(p.weightProduct.stock) }
        : { metalType: "PLATA_925", pricePerGram: "", minGrams: "1", stock: "0" },
      hasVariants: p.variants.length > 0,
      variants: p.variants.length > 0
        ? p.variants.map((v) => ({ label: v.label, stock: String(v.stock) }))
        : [{ label: "", stock: "0" }],
      saleEnabled:    p.saleEnabled,
      saleDiscountPct: p.saleDiscountPct != null ? String(p.saleDiscountPct) : "",
      saleStartAt:    p.saleStartAt ? new Date(p.saleStartAt).toISOString().slice(0, 10) : "",
      saleEndAt:      p.saleEndAt   ? new Date(p.saleEndAt  ).toISOString().slice(0, 10) : "",
    });
    setEditingId(p.id); setError(""); setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditingId(null); setError(""); }

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
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
    const offerData = {
      saleEnabled:    form.saleEnabled,
      saleDiscountPct: form.saleDiscountPct ? Math.max(1, Math.min(99, parseInt(form.saleDiscountPct))) : undefined,
      saleStartAt:    form.saleStartAt || undefined,
      saleEndAt:      form.saleEndAt   || undefined,
    };

    startTransition(async () => {
      if (editingId) {
        const res = await updateProduct(editingId, {
          name: form.name, description: form.description, price, stock,
          collectionId: form.collectionId, images: form.images, materials,
          isNew: form.isNew, isBestseller: form.isBestseller, saleType: form.saleType,
          wholesaleTiers, weightConfig, variants: variantData, ...offerData,
        });
        if ("error" in res) { setError(String(res.error)); return; }
        setProducts((prev) => prev.map((p) => p.id === editingId ? {
          ...p, name: form.name, description: form.description, price, stock,
          collectionId: form.collectionId,
          collection: collections.find((c) => c.id === form.collectionId) ?? p.collection,
          images: form.images as unknown, materials: materials as unknown,
          isNew: form.isNew, isBestseller: form.isBestseller, saleType: form.saleType,
          wholesaleTiers: wholesaleTiers.map((t, i) => ({ ...t, sortOrder: i })),
          weightProduct: weightConfig ? { ...weightConfig } : null,
          variants: variantData.map((v, i) => ({ id: `tmp-${i}`, ...v, isActive: true })),
          saleEnabled: form.saleEnabled,
          saleDiscountPct: offerData.saleDiscountPct ?? null,
          saleStartAt: form.saleStartAt ? new Date(form.saleStartAt) : null,
          saleEndAt:   form.saleEndAt   ? new Date(form.saleEndAt)   : null,
        } : p));
      }
      closeModal();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setDeleteConfirm(null);
    });
  }

  function handleToggleActive(id: string, isActive: boolean) {
    startTransition(async () => {
      await toggleProductActive(id, isActive);
      setProducts((prev) => prev.map((p) => p.id === id ? { ...p, isActive } : p));
    });
  }

  // ── Bulk helpers ─────────────────────────────────────────────────────
  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function togglePage() {
    const pageIds = products.map((p) => p.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(pageIds));
  }

  function clearBulkSelection() {
    setSelectedIds(new Set());
    setBulkDeleteConfirm(false);
    setBulkSaleMode(false);
    setBulkSalePct("");
    setBulkSaleStart("");
    setBulkSaleEnd("");
  }

  function applyBulkActivate(isActive: boolean) {
    const ids = Array.from(selectedIds);
    startBulkTransition(async () => {
      const res = await bulkToggleProductActive(ids, isActive);
      if (res.success) {
        setProducts((prev) => prev.map((p) => selectedIds.has(p.id) ? { ...p, isActive } : p));
        const label = isActive ? "activado" : "desactivado";
        setBulkResult(`${res.updated} producto${res.updated !== 1 ? "s" : ""} ${label}${res.updated !== 1 ? "s" : ""}`);
        setSelectedIds(new Set());
        setTimeout(() => setBulkResult(""), 3000);
      }
    });
  }

  function applyBulkDelete() {
    const ids = Array.from(selectedIds);
    startBulkTransition(async () => {
      const res = await bulkDeleteProducts(ids);
      if (res.success) {
        setProducts((prev) => prev.filter((p) => !selectedIds.has(p.id)));
        setBulkResult(`${res.deleted} producto${res.deleted !== 1 ? "s" : ""} eliminado${res.deleted !== 1 ? "s" : ""}`);
        setSelectedIds(new Set());
        setBulkDeleteConfirm(false);
        setTimeout(() => setBulkResult(""), 3000);
      }
    });
  }

  function applyBulkSetSale() {
    const pct = Math.max(1, Math.min(99, parseInt(bulkSalePct) || 0));
    if (!pct) return;
    const ids = Array.from(selectedIds);
    startBulkTransition(async () => {
      const res = await bulkSetSale(ids, {
        saleDiscountPct: pct,
        saleStartAt: bulkSaleStart || undefined,
        saleEndAt: bulkSaleEnd || undefined,
      });
      if (res.success) {
        setProducts((prev) => prev.map((p) =>
          selectedIds.has(p.id)
            ? { ...p, saleEnabled: true, saleDiscountPct: pct,
                saleStartAt: bulkSaleStart ? new Date(bulkSaleStart) : null,
                saleEndAt: bulkSaleEnd ? new Date(bulkSaleEnd) : null }
            : p
        ));
        setBulkResult(`Oferta -${pct}% aplicada a ${res.updated} producto${res.updated !== 1 ? "s" : ""}`);
        clearBulkSelection();
        setTimeout(() => setBulkResult(""), 3000);
      }
    });
  }

  function applyBulkRemoveSale() {
    const ids = Array.from(selectedIds);
    startBulkTransition(async () => {
      const res = await bulkRemoveSale(ids);
      if (res.success) {
        setProducts((prev) => prev.map((p) =>
          selectedIds.has(p.id)
            ? { ...p, saleEnabled: false, saleDiscountPct: null, saleStartAt: null, saleEndAt: null }
            : p
        ));
        setBulkResult(`Oferta eliminada de ${res.updated} producto${res.updated !== 1 ? "s" : ""}`);
        clearBulkSelection();
        setTimeout(() => setBulkResult(""), 3000);
      }
    });
  }

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl">

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2.5 w-60">
            <Search size={13} strokeWidth={1.5} className="text-[#8E7A6B] shrink-0" />
            <input
              type="text"
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              placeholder="Buscar producto..."
              className="bg-transparent text-xs text-[#5C4A3E] placeholder:text-[#8E7A6B] outline-none w-full"
            />
            {localQ && (
              <button onClick={() => { setLocalQ(""); router.push(`?${buildParams({ q: "" }).toString()}`); }}>
                <X size={11} strokeWidth={1.5} className="text-[#8E7A6B] hover:text-[#5C4A3E]" />
              </button>
            )}
          </div>

          <button
            onClick={() => setFiltersOpen((o) => !o)}
            className={`flex items-center gap-1.5 text-[10px] tracking-[0.12em] uppercase px-3 py-2.5 border transition-colors ${filtersOpen ? "bg-[#5C4A3E] border-[#5C4A3E] text-white" : "bg-[#F7F4F1] border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F]"}`}
          >
            <SlidersHorizontal size={12} strokeWidth={1.5} />
            Filtros
            {activeFilterCount > 0 && (
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${filtersOpen ? "bg-white text-[#5C4A3E]" : "bg-[#CDA78F] text-white"}`}>
                {activeFilterCount}
              </span>
            )}
            <ChevronDown size={11} strokeWidth={1.5} className={`transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={localSort}
            onChange={(e) => { setLocalSort(e.target.value); router.push(`?${buildParams({ sort: e.target.value }).toString()}`); }}
            className="bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2.5 text-[10px] tracking-[0.08em] text-[#8E7A6B] outline-none focus:border-[#CDA78F]"
          >
            <option value="newest">Más recientes</option>
            <option value="oldest">Más antiguos</option>
            <option value="name_asc">Nombre A-Z</option>
            <option value="name_desc">Nombre Z-A</option>
            <option value="price_hi">Mayor precio</option>
            <option value="price_lo">Menor precio</option>
            <option value="stock_lo">Menos stock</option>
          </select>

          <button
            onClick={() => router.push("/admin/productos/nuevo")}
            className="flex items-center gap-2 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[10px] tracking-[0.15em] uppercase px-5 py-2.5 transition-colors"
          >
            <Plus size={14} strokeWidth={1.75} /> Nuevo producto
          </button>
        </div>
      </div>

      {/* ── Advanced filters ── */}
      {filtersOpen && (
        <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Colección</label>
              <select value={localCollection} onChange={(e) => setLocalCollection(e.target.value)} className="w-full bg-white border border-[#D8BFAE] px-2 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]">
                <option value="">Todas</option>
                {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Estado</label>
              <select value={localStatus} onChange={(e) => setLocalStatus(e.target.value)} className="w-full bg-white border border-[#D8BFAE] px-2 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]">
                <option value="">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Tipo de venta</label>
              <select value={localSaleType} onChange={(e) => setLocalSaleType(e.target.value)} className="w-full bg-white border border-[#D8BFAE] px-2 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]">
                <option value="">Todos</option>
                <option value="UNIT">Unitario</option>
                <option value="WHOLESALE">Por cantidad</option>
                <option value="WEIGHT">Por peso</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Stock</label>
              <select value={localStock} onChange={(e) => setLocalStock(e.target.value)} className="w-full bg-white border border-[#D8BFAE] px-2 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]">
                <option value="">Todos</option>
                <option value="in">Con stock</option>
                <option value="out">Sin stock</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Precio mín. CLP</label>
              <input type="number" min="0" value={localMinPrice} onChange={(e) => setLocalMinPrice(e.target.value)} placeholder="0" className="w-full bg-white border border-[#D8BFAE] px-2 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Precio máx. CLP</label>
              <input type="number" min="0" value={localMaxPrice} onChange={(e) => setLocalMaxPrice(e.target.value)} placeholder="sin límite" className="w-full bg-white border border-[#D8BFAE] px-2 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Registrado desde</label>
              <input type="date" value={localDateFrom} onChange={(e) => setLocalDateFrom(e.target.value)} className="w-full bg-white border border-[#D8BFAE] px-2 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Registrado hasta</label>
              <input type="date" value={localDateTo} onChange={(e) => setLocalDateTo(e.target.value)} className="w-full bg-white border border-[#D8BFAE] px-2 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-[10px] tracking-[0.12em] uppercase px-4 py-2 border border-[#D8BFAE] text-[#8E7A6B] hover:border-red-300 hover:text-red-400 transition-colors">
                Limpiar filtros
              </button>
            )}
            <button onClick={applyFilters} className="text-[10px] tracking-[0.15em] uppercase px-5 py-2 bg-[#5C4A3E] hover:bg-[#3E2F25] text-white transition-colors">
              Aplicar filtros
            </button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-[#F7F4F1] border border-[#D8BFAE] overflow-hidden">
        {products.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#8E7A6B]">
            Sin productos{filters.q ? ` para "${filters.q}"` : ""}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#D8BFAE] bg-[#EDE2D8]/40">
                <th className="pl-4 pr-2 py-3.5 w-9">
                  {(() => {
                    const pageIds = products.map((p) => p.id);
                    const selCount = pageIds.filter((id) => selectedIds.has(id)).length;
                    const allSel = selCount === pageIds.length && pageIds.length > 0;
                    const partial = selCount > 0 && !allSel;
                    return (
                      <button onClick={togglePage} className="text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors">
                        {allSel ? <CheckSquare size={14} strokeWidth={1.5} /> : partial ? <Minus size={14} strokeWidth={1.5} /> : <Square size={14} strokeWidth={1.5} />}
                      </button>
                    );
                  })()}
                </th>
                {["Producto", "Colección", "Tipo de venta", "Precio ref.", "Stock", "Estado", "Registro", "Destacado", "Acciones"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDE2D8]">
              {products.map((p) => {
                const img = getFirstImage(p.images);
                const variantTotalStock = p.variants.reduce((s, v) => s + v.stock, 0);
                const hasVariants = p.variants.length > 0;
                return (
                  <tr key={p.id} className={`hover:bg-[#EDE2D8]/30 transition-colors group ${!p.isActive ? "opacity-50" : ""} ${selectedIds.has(p.id) ? "bg-[#EDE2D8]/40" : ""}`}>
                    <td className="pl-4 pr-2 py-4 w-9">
                      <button onClick={() => toggleRow(p.id)} className="text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors">
                        {selectedIds.has(p.id) ? <CheckSquare size={14} strokeWidth={1.5} className="text-[#CDA78F]" /> : <Square size={14} strokeWidth={1.5} />}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 shrink-0 bg-[#EDE2D8] overflow-hidden">
                          {img && <Image src={img} alt={p.name} fill className="object-cover" sizes="40px" />}
                        </div>
                        <div>
                          <p className="text-xs text-[#5C4A3E] font-medium leading-tight">{p.name}</p>
                          <p className="text-[10px] text-[#8E7A6B] mt-0.5">/{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-[#8E7A6B]">{p.collection.name}</td>
                    <td className="px-5 py-4">
                      <span className={`text-[9px] tracking-[0.08em] uppercase px-2 py-1 inline-flex items-center gap-1 ${SALE_TYPE_COLORS[p.saleType]}`}>
                        {p.saleType === "WEIGHT" ? <Scale size={9} /> : p.saleType === "WHOLESALE" ? <Hash size={9} /> : <Package size={9} />}
                        {SALE_TYPE_LABELS[p.saleType]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-[#5C4A3E] font-medium">
                      {p.saleType === "WEIGHT" && p.weightProduct
                        ? `$${p.weightProduct.pricePerGram.toLocaleString("es-CL")}/g`
                        : p.saleType === "WHOLESALE" && p.wholesaleTiers.length > 0
                        ? `Desde $${Math.min(...p.wholesaleTiers.map((t) => t.pricePerUnit)).toLocaleString("es-CL")}`
                        : `$${p.price.toLocaleString("es-CL")}`}
                    </td>
                    <td className="px-5 py-4">
                      {p.saleType === "UNIT" ? (
                        hasVariants ? (
                          <div>
                            <span className={`text-xs font-medium ${variantTotalStock === 0 ? "text-red-400" : variantTotalStock <= 5 ? "text-amber-500" : "text-[#5C4A3E]"}`}>
                              {variantTotalStock} uds.
                            </span>
                            <p className="text-[10px] text-[#8E7A6B] mt-0.5">
                              {p.variants.length} talla{p.variants.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        ) : (
                          <span className={`text-xs font-medium ${p.stock === 0 ? "text-red-400" : p.stock <= 5 ? "text-amber-500" : "text-[#5C4A3E]"}`}>
                            {p.stock} uds.
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-[#D8BFAE]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-[10px] text-[#8E7A6B]">
                        {new Date(p.createdAt).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggleActive(p.id, !p.isActive)}
                        className={`text-[9px] tracking-[0.1em] uppercase px-2.5 py-1 transition-colors ${p.isActive ? "bg-emerald-50 text-emerald-600 hover:bg-red-50 hover:text-red-400" : "bg-red-50 text-red-400 hover:bg-emerald-50 hover:text-emerald-600"}`}
                      >
                        {p.isActive ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-[#8E7A6B]">
                        {p.isNew && <span className="bg-[#CDA78F]/20 px-2 py-0.5">Nuevo</span>}
                        {p.isBestseller && <span className="bg-[#D8BFAE]/30 px-2 py-0.5">Best</span>}
                        {p.saleEnabled && p.saleDiscountPct && (!p.saleEndAt || new Date(p.saleEndAt) >= new Date()) && (
                          <span className="bg-orange-50 text-orange-500 border border-orange-200 px-2 py-0.5 flex items-center gap-1">
                            <Tag size={9} strokeWidth={1.5} />-{p.saleDiscountPct}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(p)} aria-label="Editar" className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] hover:text-[#5C4A3E] transition-colors">
                          <Pencil size={12} strokeWidth={1.5} />
                        </button>
                        {deleteConfirm === p.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(p.id)} className="w-7 h-7 flex items-center justify-center bg-red-50 border border-red-200 text-red-400 hover:bg-red-100 transition-colors">
                              <Check size={12} strokeWidth={1.5} />
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] transition-colors">
                              <X size={12} strokeWidth={1.5} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(p.id)} aria-label="Eliminar" className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] hover:border-red-300 hover:text-red-400 transition-colors">
                            <Trash2 size={12} strokeWidth={1.5} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="px-5 py-4 border-t border-[#D8BFAE] flex items-center justify-between gap-4">
          <p className="text-[10px] text-[#8E7A6B]">
            Mostrando {products.length} de {totalProducts} productos
            {totalPages > 1 && ` — página ${currentPage} de ${totalPages}`}
          </p>
          {totalPages > 1 && (() => {
            const WINDOW = 10;
            const wStart = Math.floor((currentPage - 1) / WINDOW) * WINDOW + 1;
            const wEnd   = Math.min(wStart + WINDOW - 1, totalPages);
            const pages  = Array.from({ length: wEnd - wStart + 1 }, (_, i) => wStart + i);
            return (
              <div className="flex items-center gap-1 flex-wrap">
                {/* Ventana anterior */}
                {wStart > 1 && (
                  <button onClick={() => goToPage(wStart - 1)}
                    className="px-2 py-1 text-[10px] border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] transition-colors">
                    ‹‹
                  </button>
                )}
                {/* Página anterior */}
                <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}
                  className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] hover:text-[#5C4A3E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft size={13} strokeWidth={1.5} />
                </button>
                {/* Números de página */}
                {pages.map((n) => (
                  <button key={n} onClick={() => goToPage(n)}
                    className={`w-7 h-7 flex items-center justify-center text-[10px] border transition-colors ${
                      n === currentPage
                        ? "bg-[#CDA78F] border-[#CDA78F] text-white"
                        : "border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] hover:text-[#5C4A3E]"
                    }`}>
                    {n}
                  </button>
                ))}
                {/* Página siguiente */}
                <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}
                  className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] hover:text-[#5C4A3E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight size={13} strokeWidth={1.5} />
                </button>
                {/* Ventana siguiente */}
                {wEnd < totalPages && (
                  <button onClick={() => goToPage(wEnd + 1)}
                    className="px-2 py-1 text-[10px] border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] transition-colors">
                    ››
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Bulk sale form panel (appears above the bar) ── */}
      {selectedIds.size > 0 && bulkSaleMode && (
        <div className="fixed bottom-[72px] left-1/2 -translate-x-1/2 z-40 bg-white border border-[#D8BFAE] shadow-2xl px-5 py-4 flex items-end gap-3 flex-wrap">
          <div className="space-y-1">
            <label className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Descuento %</label>
            <div className="relative w-24">
              <input
                type="number" min="1" max="99"
                value={bulkSalePct}
                onChange={(e) => setBulkSalePct(e.target.value)}
                placeholder="ej. 20"
                className="w-full bg-[#F7F4F1] border border-[#D8BFAE] pl-2 pr-5 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#8E7A6B]">%</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Inicio</label>
            <input type="date" value={bulkSaleStart} onChange={(e) => setBulkSaleStart(e.target.value)}
              className="bg-[#F7F4F1] border border-[#D8BFAE] px-2 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Fin</label>
            <input type="date" value={bulkSaleEnd} onChange={(e) => setBulkSaleEnd(e.target.value)}
              className="bg-[#F7F4F1] border border-[#D8BFAE] px-2 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
          </div>
          <button
            onClick={applyBulkSetSale}
            disabled={!bulkSalePct || isBulkPending}
            className="text-[10px] tracking-[0.1em] uppercase bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            {isBulkPending ? <Loader2 size={12} className="animate-spin" /> : <Tag size={11} />}
            Aplicar
          </button>
          <button
            onClick={() => setBulkSaleMode(false)}
            className="text-[10px] tracking-[0.1em] uppercase border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] px-3 py-2 transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* ── Bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#5C4A3E] text-white flex items-center gap-3 px-5 py-3 shadow-2xl">
          <span className="text-xs font-medium shrink-0">
            {selectedIds.size} producto{selectedIds.size !== 1 ? "s" : ""}
          </span>
          <span className="w-px h-4 bg-white/20 shrink-0" />

          {bulkDeleteConfirm ? (
            <>
              <span className="text-xs text-red-300 shrink-0">¿Confirmar eliminación?</span>
              <button
                onClick={applyBulkDelete}
                disabled={isBulkPending}
                className="text-[10px] tracking-[0.1em] uppercase bg-red-500 hover:bg-red-600 px-3 py-1.5 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isBulkPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={11} />}
                Sí, eliminar
              </button>
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                className="text-[10px] tracking-[0.1em] uppercase border border-white/30 hover:bg-white/10 px-3 py-1.5 transition-colors"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => applyBulkActivate(true)}
                disabled={isBulkPending}
                className="text-[10px] tracking-[0.1em] uppercase border border-white/30 hover:bg-white/10 px-3 py-1.5 transition-colors disabled:opacity-50"
              >
                Activar
              </button>
              <button
                onClick={() => applyBulkActivate(false)}
                disabled={isBulkPending}
                className="text-[10px] tracking-[0.1em] uppercase border border-white/30 hover:bg-white/10 px-3 py-1.5 transition-colors disabled:opacity-50"
              >
                Desactivar
              </button>
              <button
                onClick={() => { setBulkSaleMode((m) => !m); setBulkDeleteConfirm(false); }}
                disabled={isBulkPending}
                className={`text-[10px] tracking-[0.1em] uppercase px-3 py-1.5 transition-colors disabled:opacity-50 flex items-center gap-1.5 ${bulkSaleMode ? "bg-orange-500 text-white" : "border border-white/30 hover:bg-white/10 text-orange-200"}`}
              >
                <Tag size={11} /> Oferta
              </button>
              <button
                onClick={applyBulkRemoveSale}
                disabled={isBulkPending}
                className="text-[10px] tracking-[0.1em] uppercase border border-white/30 hover:bg-white/10 px-3 py-1.5 transition-colors disabled:opacity-50 text-white/70"
              >
                Quitar oferta
              </button>
              <span className="w-px h-4 bg-white/20 shrink-0" />
              <button
                onClick={() => setBulkDeleteConfirm(true)}
                disabled={isBulkPending}
                className="text-[10px] tracking-[0.1em] uppercase bg-red-500/20 border border-red-400/40 hover:bg-red-500/30 px-3 py-1.5 transition-colors disabled:opacity-50 text-red-300 flex items-center gap-1.5"
              >
                <Trash2 size={11} /> Eliminar
              </button>
              <span className="w-px h-4 bg-white/20 shrink-0" />
              <button
                onClick={clearBulkSelection}
                className="text-[10px] tracking-[0.1em] uppercase text-white/60 hover:text-white px-2 py-1.5 transition-colors"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Bulk result toast ── */}
      {bulkResult && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs px-4 py-2.5 shadow-lg flex items-center gap-2">
          <Check size={13} strokeWidth={2} />
          {bulkResult}
        </div>
      )}

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-[#F7F4F1] border border-[#D8BFAE] w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8BFAE] sticky top-0 bg-[#F7F4F1] z-10">
              <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">
                Editar producto
              </h2>
              <button onClick={closeModal} className="text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Name + Slug */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Nombre *</label>
                  <input value={form.name} onChange={(e) => setField("name", e.target.value)} className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" placeholder="Collar Luna Creciente" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Slug *</label>
                  <input value={form.slug} onChange={(e) => setField("slug", e.target.value)} disabled={!!editingId} className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] disabled:opacity-50" placeholder="collar-luna-creciente" />
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

              {/* Price (UNIT/WHOLESALE) */}
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
                    <input
                      type="checkbox"
                      checked={form.hasVariants}
                      onChange={(e) => setField("hasVariants", e.target.checked)}
                      className="accent-[#CDA78F]"
                    />
                    <span className="text-[9px] tracking-[0.15em] uppercase text-[#5C4A3E] font-medium">
                      Este producto tiene tallas / variantes
                    </span>
                  </label>

                  {form.hasVariants ? (
                    <div className="space-y-3 pl-5 border-l-2 border-[#CDA78F]/30">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">
                          Talla · Stock por talla
                        </p>
                        <button type="button" onClick={addVariant} className="text-[9px] tracking-[0.1em] uppercase text-[#CDA78F] hover:text-[#8E7A6B] flex items-center gap-1 transition-colors">
                          <Plus size={10} /> Agregar talla
                        </button>
                      </div>
                      <div className="grid grid-cols-[1fr_1fr_32px] gap-2 text-[9px] tracking-[0.08em] uppercase text-[#8E7A6B] mb-1">
                        <span>Talla</span><span>Stock (unidades)</span><span></span>
                      </div>
                      {form.variants.map((v, i) => (
                        <div key={i} className="grid grid-cols-[1fr_1fr_32px] gap-2 items-center">
                          <input
                            type="text"
                            value={v.label}
                            onChange={(e) => updateVariant(i, "label", e.target.value)}
                            placeholder="ej. 5 · 6 · 7 · S · M"
                            className="bg-[#F7F4F1] border border-[#D8BFAE] px-2 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                          />
                          <input
                            type="number"
                            min="0"
                            value={v.stock}
                            onChange={(e) => updateVariant(i, "stock", e.target.value)}
                            placeholder="0"
                            className="bg-[#F7F4F1] border border-[#D8BFAE] px-2 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                          />
                          <button
                            type="button"
                            onClick={() => removeVariant(i)}
                            disabled={form.variants.length === 1}
                            className="w-8 h-8 flex items-center justify-center text-[#D8BFAE] hover:text-red-400 disabled:opacity-30 transition-colors"
                          >
                            <X size={13} strokeWidth={1.5} />
                          </button>
                        </div>
                      ))}
                      <p className="text-[9px] text-[#8E7A6B]">
                        Cada talla tiene su propio inventario. Las tallas con stock 0 aparecerán tachadas en la tienda.
                      </p>
                    </div>
                  ) : (
                    <div className="pl-5 border-l-2 border-[#CDA78F]/30 space-y-1.5">
                      <label className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Stock (unidades)</label>
                      <input
                        type="number"
                        min="0"
                        value={form.stock}
                        onChange={(e) => setField("stock", e.target.value)}
                        className="w-36 bg-[#F7F4F1] border border-[#D8BFAE] px-2 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                        placeholder="0"
                      />
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
                  <p className="text-[10px] text-blue-500 mt-1">El cliente ve el precio según la cantidad que pide.</p>
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

              {/* ── Images uploader ── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">
                    Imágenes del producto
                    {form.images.length > 0 && (
                      <span className="ml-2 text-[#CDA78F]">({form.images.length})</span>
                    )}
                  </label>
                  <label className={`cursor-pointer flex items-center gap-1.5 text-[9px] tracking-[0.1em] uppercase px-3 py-1.5 border transition-colors ${uploading ? "opacity-50 cursor-not-allowed border-[#D8BFAE] text-[#8E7A6B]" : "border-[#CDA78F] text-[#CDA78F] hover:bg-[#CDA78F] hover:text-white"}`}>
                    <Upload size={10} strokeWidth={1.5} />
                    {uploading ? "Subiendo..." : "Subir fotos"}
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>

                {form.images.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {form.images.map((url, i) => (
                      <div key={i} className="relative w-20 h-20 border border-[#D8BFAE] overflow-hidden bg-[#EDE2D8]">
                        <Image src={url} alt={`Imagen ${i + 1}`} fill className="object-cover" sizes="80px" unoptimized={url.startsWith("/uploads")} />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
                          aria-label="Eliminar imagen"
                        >
                          <X size={10} strokeWidth={2} />
                        </button>
                        {i === 0 && (
                          <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] text-center py-0.5">
                            Principal
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-[#D8BFAE] py-8 flex flex-col items-center justify-center gap-2 text-[#D8BFAE]">
                    <ImageOff size={24} strokeWidth={1} />
                    <p className="text-[10px] tracking-wide">Sin imágenes — haz clic en "Subir fotos"</p>
                  </div>
                )}
                <p className="text-[9px] text-[#8E7A6B]">
                  JPG, PNG, WEBP o GIF · Máx. 10 MB por imagen · La primera imagen es la principal
                </p>
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

              {/* Oferta programada */}
              <div className="space-y-3 p-4 border border-[#D8BFAE] bg-white">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={form.saleEnabled}
                    onChange={(e) => setField("saleEnabled", e.target.checked)}
                    className="accent-[#CDA78F]" />
                  <span className="text-[9px] tracking-[0.15em] uppercase text-[#5C4A3E] font-medium flex items-center gap-1.5">
                    <Tag size={11} strokeWidth={1.5} className="text-[#CDA78F]" />
                    Activar oferta por fechas
                  </span>
                </label>

                {form.saleEnabled && (
                  <div className="space-y-3 pl-5 border-l-2 border-[#CDA78F]/30">
                    {/* Discount percentage */}
                    <div className="flex items-end gap-3">
                      <div className="space-y-1 w-32">
                        <label className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Descuento %</label>
                        <div className="relative">
                          <input
                            type="number" min="1" max="99"
                            value={form.saleDiscountPct}
                            onChange={(e) => setField("saleDiscountPct", e.target.value)}
                            placeholder="ej. 20"
                            className="w-full bg-[#F7F4F1] border border-[#D8BFAE] pl-2 pr-6 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#8E7A6B]">%</span>
                        </div>
                      </div>
                      {form.saleDiscountPct && form.price && (
                        <div className="pb-1">
                          <p className="text-[10px] text-[#8E7A6B]">Precio con descuento</p>
                          <p className="text-sm font-medium text-orange-500">
                            ${Math.round(parseInt(form.price) * (1 - parseInt(form.saleDiscountPct) / 100)).toLocaleString("es-CL")} CLP
                          </p>
                          <p className="text-[10px] text-[#D8BFAE] line-through">
                            ${parseInt(form.price).toLocaleString("es-CL")}
                          </p>
                        </div>
                      )}
                    </div>
                    {/* Date range */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Inicio de oferta</label>
                        <input type="date" value={form.saleStartAt}
                          onChange={(e) => setField("saleStartAt", e.target.value)}
                          className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-2 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Fin de oferta</label>
                        <input type="date" value={form.saleEndAt}
                          onChange={(e) => setField("saleEndAt", e.target.value)}
                          className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-2 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                      </div>
                    </div>
                    <p className="text-[9px] text-[#8E7A6B]">
                      El precio con descuento se calcula automáticamente. Si no indicas fechas, la oferta estará activa de inmediato.
                    </p>
                  </div>
                )}
              </div>

              {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2">{error}</p>}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="text-[10px] tracking-[0.12em] uppercase px-5 py-2.5 border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] transition-colors">Cancelar</button>
                <button type="submit" disabled={isPending || uploading} className="text-[10px] tracking-[0.15em] uppercase px-5 py-2.5 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white transition-colors disabled:opacity-50">
                  {isPending ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
