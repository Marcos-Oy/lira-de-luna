"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2, X, Check, Upload, ImageOff, GripVertical } from "lucide-react";
import {
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerActive,
} from "@/app/actions/admin/banners";

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
  banners: Banner[];
}

type FormData = {
  image: string;
  eyebrow: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  sortOrder: string;
};

const emptyForm: FormData = {
  image: "",
  eyebrow: "",
  heading: "",
  body: "",
  ctaLabel: "Comprar ahora",
  ctaHref: "/tienda",
  sortOrder: "0",
};

export default function AdminBannersClient({ banners: initial }: Props) {
  const [banners, setBanners] = useState(initial);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
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
    setForm({ ...emptyForm, sortOrder: String(banners.length) });
    setEditingId(null);
    setError("");
    setModalOpen(true);
  }

  function openEdit(b: Banner) {
    setForm({
      image: b.image,
      eyebrow: b.eyebrow,
      heading: b.heading,
      body: b.body ?? "",
      ctaLabel: b.ctaLabel,
      ctaHref: b.ctaHref,
      sortOrder: String(b.sortOrder),
    });
    setEditingId(b.id);
    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.eyebrow || !form.heading) {
      setError("Eyebrow y titular son requeridos");
      return;
    }
    setError("");

    const payload = {
      image: form.image,
      eyebrow: form.eyebrow,
      heading: form.heading,
      body: form.body || undefined,
      ctaLabel: form.ctaLabel || "Comprar ahora",
      ctaHref: form.ctaHref || "/tienda",
      sortOrder: parseInt(form.sortOrder) || 0,
    };

    startTransition(async () => {
      if (editingId) {
        await updateBanner(editingId, payload);
        setBanners((prev) =>
          prev.map((b) =>
            b.id === editingId
              ? {
                  ...b,
                  ...payload,
                  body: payload.body ?? null,
                }
              : b
          )
        );
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
      setBanners((prev) =>
        prev.map((b) => (b.id === id ? { ...b, isActive } : b))
      );
    });
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#8E7A6B]">
          {banners.length} banner{banners.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[10px] tracking-[0.15em] uppercase px-5 py-2.5 transition-colors"
        >
          <Plus size={14} strokeWidth={1.75} />
          Nuevo banner
        </button>
      </div>

      {/* List */}
      <div className="bg-[#F7F4F1] border border-[#D8BFAE] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#D8BFAE] bg-[#EDE2D8]/40 grid grid-cols-12 gap-4">
          <div className="col-span-1" />
          <div className="col-span-5 text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">Banner</div>
          <div className="col-span-2 text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">CTA</div>
          <div className="col-span-2 text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">Orden</div>
          <div className="col-span-1 text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">Estado</div>
          <div className="col-span-1" />
        </div>

        {banners.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#8E7A6B]">
            Sin banners — crea el primero para activar el carrusel
          </div>
        ) : (
          <div className="divide-y divide-[#EDE2D8]">
            {banners.map((b) => (
              <div
                key={b.id}
                className={`grid grid-cols-12 gap-4 items-center px-5 py-4 hover:bg-[#EDE2D8]/30 transition-colors group ${!b.isActive ? "opacity-50" : ""}`}
              >
                <div className="col-span-1 flex justify-center">
                  <GripVertical size={14} strokeWidth={1.5} className="text-[#D8BFAE]" />
                </div>

                <div className="col-span-5 flex items-center gap-3">
                  <div className="relative w-20 h-12 shrink-0 bg-[#EDE2D8] overflow-hidden">
                    {b.image ? (
                      <Image
                        src={b.image}
                        alt={b.heading}
                        fill
                        className="object-cover"
                        sizes="80px"
                        unoptimized={b.image.startsWith("/uploads")}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageOff size={14} strokeWidth={1} className="text-[#D8BFAE]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] tracking-[0.12em] uppercase text-[#CDA78F] mb-0.5">{b.eyebrow}</p>
                    <p className="text-xs text-[#5C4A3E] font-medium line-clamp-1">{b.heading}</p>
                    {b.body && (
                      <p className="text-[10px] text-[#8E7A6B] mt-0.5 line-clamp-1">{b.body}</p>
                    )}
                  </div>
                </div>

                <div className="col-span-2 min-w-0">
                  <p className="text-[10px] text-[#5C4A3E] font-medium truncate">{b.ctaLabel}</p>
                  <code className="text-[10px] text-[#CDA78F] bg-[#EDE2D8] px-1.5 py-0.5 truncate block">{b.ctaHref}</code>
                </div>

                <div className="col-span-2">
                  <span className="text-xs text-[#5C4A3E]">{b.sortOrder}</span>
                </div>

                <div className="col-span-1">
                  <button
                    onClick={() => handleToggle(b.id, !b.isActive)}
                    className={`text-[9px] tracking-[0.1em] uppercase px-2 py-1 transition-colors ${
                      b.isActive
                        ? "bg-[#CDA78F]/15 text-[#8E7A6B] hover:bg-red-50 hover:text-red-400"
                        : "bg-red-50 text-red-400 hover:bg-[#CDA78F]/15 hover:text-[#8E7A6B]"
                    }`}
                  >
                    {b.isActive ? "Activo" : "Inactivo"}
                  </button>
                </div>

                <div className="col-span-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                  <button
                    onClick={() => openEdit(b)}
                    aria-label="Editar"
                    className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] hover:text-[#5C4A3E] transition-colors"
                  >
                    <Pencil size={12} strokeWidth={1.5} />
                  </button>
                  {deleteConfirm === b.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="w-7 h-7 flex items-center justify-center bg-red-50 border border-red-200 text-red-400 hover:bg-red-100 transition-colors"
                      >
                        <Check size={12} strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] transition-colors"
                      >
                        <X size={12} strokeWidth={1.5} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(b.id)}
                      aria-label="Eliminar"
                      className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] hover:border-red-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-[#F7F4F1] border border-[#D8BFAE] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8BFAE] sticky top-0 bg-[#F7F4F1] z-10">
              <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">
                {editingId ? "Editar banner" : "Nuevo banner"}
              </h2>
              <button onClick={closeModal} className="text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Image uploader */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Imagen del banner</label>
                  <label
                    className={`cursor-pointer flex items-center gap-1.5 text-[9px] tracking-[0.1em] uppercase px-3 py-1.5 border transition-colors ${
                      uploading
                        ? "opacity-50 cursor-not-allowed border-[#D8BFAE] text-[#8E7A6B]"
                        : "border-[#CDA78F] text-[#CDA78F] hover:bg-[#CDA78F] hover:text-white"
                    }`}
                  >
                    <Upload size={10} strokeWidth={1.5} />
                    {uploading ? "Subiendo..." : "Subir foto"}
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>
                {form.image ? (
                  <div className="relative w-full h-40 border border-[#D8BFAE] overflow-hidden bg-[#EDE2D8]">
                    <Image
                      src={form.image}
                      alt="Banner"
                      fill
                      className="object-cover"
                      sizes="600px"
                      unoptimized={form.image.startsWith("/uploads")}
                    />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, image: "" }))}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
                      aria-label="Eliminar imagen"
                    >
                      <X size={11} strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-[#D8BFAE] py-8 flex flex-col items-center justify-center gap-2 text-[#D8BFAE]">
                    <ImageOff size={22} strokeWidth={1} />
                    <p className="text-[10px] tracking-wide">Sin imagen — haz clic en &quot;Subir foto&quot;</p>
                  </div>
                )}
                <p className="text-[9px] text-[#8E7A6B]">
                  JPG, PNG, WEBP · Recomendado 1600×700 px · Máx. 10 MB
                </p>
              </div>

              {/* Eyebrow + Heading */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Eyebrow *</label>
                  <input
                    value={form.eyebrow}
                    onChange={(e) => setForm({ ...form, eyebrow: e.target.value })}
                    className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                    placeholder="Nueva colección"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Titular *</label>
                  <input
                    value={form.heading}
                    onChange={(e) => setForm({ ...form, heading: e.target.value })}
                    className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                    placeholder="Joyas que cuentan tu historia"
                  />
                </div>
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Descripción</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={2}
                  className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] resize-none"
                  placeholder="Texto secundario del banner (opcional)"
                />
              </div>

              {/* CTA */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Texto del botón</label>
                  <input
                    value={form.ctaLabel}
                    onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                    className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                    placeholder="Comprar ahora"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Enlace del botón</label>
                  <input
                    value={form.ctaHref}
                    onChange={(e) => setForm({ ...form, ctaHref: e.target.value })}
                    className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                    placeholder="/tienda"
                  />
                </div>
              </div>

              {/* Sort order */}
              <div className="space-y-1.5 w-28">
                <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Orden</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2">{error}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-[10px] tracking-[0.12em] uppercase px-5 py-2.5 border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || uploading}
                  className="text-[10px] tracking-[0.15em] uppercase px-5 py-2.5 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white transition-colors disabled:opacity-50"
                >
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
