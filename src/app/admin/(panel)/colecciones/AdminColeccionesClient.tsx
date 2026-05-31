"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2, GripVertical, X, Check, Upload, ImageOff } from "lucide-react";
import {
  createCollection,
  updateCollection,
  deleteCollection,
  toggleCollectionActive,
} from "@/app/actions/admin/collections";

type Collection = {
  id:             string;
  slug:           string;
  name:           string;
  description:    string | null;
  image:          string | null;
  collectionType: string;
  isActive:       boolean;
  sortOrder:      number;
  _count:         { products: number };
};

interface Props {
  collections: Collection[];
}

type FormData = {
  name:           string;
  slug:           string;
  description:    string;
  image:          string;
  sortOrder:      string;
  collectionType: string;
};

const COLLECTION_TYPES = [
  { value: "JEWELRY",  label: "Joyería (collares, aretes, anillos…)" },
  { value: "SUPPLIES", label: "Insumos (líquidos, cajitas, empaques…)" },
  { value: "OTHER",    label: "Otro" },
];

const emptyForm: FormData = { name: "", slug: "", description: "", image: "", sortOrder: "0", collectionType: "JEWELRY" };

export default function AdminColeccionesClient({ collections: initial }: Props) {
  const [collections, setCollections] = useState(initial);
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
    setForm({ ...emptyForm, sortOrder: String(collections.length) });
    setEditingId(null);
    setError("");
    setModalOpen(true);
  }

  function openEdit(c: Collection) {
    setForm({
      name:           c.name,
      slug:           c.slug,
      description:    typeof c.description === "string" ? c.description : "",
      image:          typeof c.image === "string" ? c.image : "",
      sortOrder:      String(c.sortOrder),
      collectionType: c.collectionType ?? "JEWELRY",
    });
    setEditingId(c.id);
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
    if (!form.name || !form.slug) { setError("Nombre y slug son requeridos"); return; }
    setError("");

    startTransition(async () => {
      if (editingId) {
        const res = await updateCollection(editingId, {
          name:           form.name,
          description:    form.description,
          image:          form.image,
          sortOrder:      parseInt(form.sortOrder) || 0,
          collectionType: form.collectionType,
        });
        if ("error" in res) { setError(String(res.error)); return; }
        setCollections((prev) =>
          prev.map((c) =>
            c.id === editingId
              ? {
                  ...c,
                  name:           form.name,
                  description:    form.description || null,
                  image:          form.image || null,
                  sortOrder:      parseInt(form.sortOrder) || 0,
                  collectionType: form.collectionType,
                }
              : c
          )
        );
      } else {
        const res = await createCollection({
          name:           form.name,
          slug:           form.slug,
          description:    form.description,
          image:          form.image,
          sortOrder:      parseInt(form.sortOrder) || 0,
          collectionType: form.collectionType,
        });
        if ("error" in res) { setError(String(res.error)); return; }
        window.location.reload();
      }
      closeModal();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteCollection(id);
      if ("error" in res) {
        alert(res.error);
        setDeleteConfirm(null);
        return;
      }
      setCollections((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirm(null);
    });
  }

  function handleToggle(id: string, isActive: boolean) {
    startTransition(async () => {
      await toggleCollectionActive(id, isActive);
      setCollections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive } : c))
      );
    });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#8E7A6B]">{collections.length} colecciones</p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[10px] tracking-[0.15em] uppercase px-5 py-2.5 transition-colors"
        >
          <Plus size={14} strokeWidth={1.75} />
          Nueva colección
        </button>
      </div>

      {/* List */}
      <div className="bg-[#F7F4F1] border border-[#D8BFAE] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#D8BFAE] bg-[#EDE2D8]/40 grid grid-cols-12 gap-4">
          <div className="col-span-1" />
          <div className="col-span-5 text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">Colección</div>
          <div className="col-span-2 text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">Slug</div>
          <div className="col-span-2 text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">Productos</div>
          <div className="col-span-1 text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">Estado</div>
          <div className="col-span-1" />
        </div>

        {collections.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#8E7A6B]">Sin colecciones</div>
        ) : (
          <div className="divide-y divide-[#EDE2D8]">
            {collections.map((c) => (
              <div
                key={c.id}
                className={`grid grid-cols-12 gap-4 items-center px-5 py-4 hover:bg-[#EDE2D8]/30 transition-colors group ${!c.isActive ? "opacity-50" : ""}`}
              >
                <div className="col-span-1 flex justify-center">
                  <GripVertical size={14} strokeWidth={1.5} className="text-[#D8BFAE]" />
                </div>

                <div className="col-span-5 flex items-center gap-3">
                  <div className="relative w-12 h-12 shrink-0 bg-[#EDE2D8] overflow-hidden">
                    {c.image && (
                      <Image src={c.image} alt={c.name} fill className="object-cover" sizes="48px" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-[#5C4A3E] font-medium">{c.name}</p>
                    <p className="text-[10px] text-[#8E7A6B] mt-0.5 line-clamp-1">{c.description}</p>
                  </div>
                </div>

                <div className="col-span-2">
                  <code className="text-[10px] text-[#CDA78F] bg-[#EDE2D8] px-2 py-0.5">/{c.slug}</code>
                </div>

                <div className="col-span-2">
                  <span className="text-xs text-[#5C4A3E]">{c._count.products} piezas</span>
                </div>

                <div className="col-span-1">
                  <button
                    onClick={() => handleToggle(c.id, !c.isActive)}
                    className={`text-[9px] tracking-[0.1em] uppercase px-2 py-1 transition-colors ${
                      c.isActive
                        ? "bg-[#CDA78F]/15 text-[#8E7A6B] hover:bg-red-50 hover:text-red-400"
                        : "bg-red-50 text-red-400 hover:bg-[#CDA78F]/15 hover:text-[#8E7A6B]"
                    }`}
                  >
                    {c.isActive ? "Activa" : "Inactiva"}
                  </button>
                </div>

                <div className="col-span-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                  <button
                    onClick={() => openEdit(c)}
                    aria-label="Editar"
                    className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] hover:text-[#5C4A3E] transition-colors"
                  >
                    <Pencil size={12} strokeWidth={1.5} />
                  </button>
                  {deleteConfirm === c.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(c.id)}
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
                      onClick={() => setDeleteConfirm(c.id)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[#F7F4F1] border border-[#D8BFAE] w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8BFAE]">
              <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">
                {editingId ? "Editar colección" : "Nueva colección"}
              </h2>
              <button onClick={closeModal} className="text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Nombre *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                    placeholder="Collares"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Slug *</label>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    disabled={!!editingId}
                    className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] disabled:opacity-50"
                    placeholder="collares"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] resize-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Imagen de portada</label>
                  <label className={`cursor-pointer flex items-center gap-1.5 text-[9px] tracking-[0.1em] uppercase px-3 py-1.5 border transition-colors ${uploading ? "opacity-50 cursor-not-allowed border-[#D8BFAE] text-[#8E7A6B]" : "border-[#CDA78F] text-[#CDA78F] hover:bg-[#CDA78F] hover:text-white"}`}>
                    <Upload size={10} strokeWidth={1.5} />
                    {uploading ? "Subiendo..." : "Subir foto"}
                    <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif" onChange={handleImageUpload} disabled={uploading} className="hidden" />
                  </label>
                </div>
                {form.image ? (
                  <div className="relative w-full h-32 border border-[#D8BFAE] overflow-hidden bg-[#EDE2D8]">
                    <Image src={form.image} alt="Portada" fill className="object-cover" sizes="400px" unoptimized={form.image.startsWith("/uploads")} />
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
                  <div className="border-2 border-dashed border-[#D8BFAE] py-6 flex flex-col items-center justify-center gap-2 text-[#D8BFAE]">
                    <ImageOff size={20} strokeWidth={1} />
                    <p className="text-[10px] tracking-wide">Sin imagen — haz clic en "Subir foto"</p>
                  </div>
                )}
                <p className="text-[9px] text-[#8E7A6B]">JPG, PNG, WEBP o GIF · Máx. 10 MB</p>
              </div>

              <div className="space-y-1.5 w-24">
                <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Orden</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                />
              </div>

              {/* Tipo de colección */}
              <div className="space-y-1.5">
                <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Tipo de colección</label>
                <select
                  value={form.collectionType}
                  onChange={(e) => setForm({ ...form, collectionType: e.target.value })}
                  className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                >
                  {COLLECTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <p className="text-[9px] text-[#8E7A6B]">
                  Los insumos aparecen etiquetados en la tienda.
                </p>
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
                  {isPending ? "Guardando..." : editingId ? "Guardar cambios" : "Crear colección"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
