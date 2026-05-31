"use client";

import { useState, useTransition, useRef } from "react";
import { Check, Upload, X, ImageIcon } from "lucide-react";
import { updateSeo, uploadOgImage } from "@/app/actions/admin/settings";

interface Props {
  seoTitle: string | null;
  seoDescription: string | null;
  seoOgImage: string | null;
}

export default function SeoClient({ seoTitle, seoDescription, seoOgImage }: Props) {
  const [title, setTitle]         = useState(seoTitle ?? "");
  const [desc, setDesc]           = useState(seoDescription ?? "");
  const [ogImage, setOgImage]     = useState(seoOgImage);
  const [preview, setPreview]     = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [saved, setSaved]         = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) { setUploadError("Formato no válido. Usa PNG, JPG o WebP"); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadError("El archivo no puede superar 5 MB"); return; }
    setPreview(URL.createObjectURL(file));
  }

  function handleUpload() {
    if (!fileRef.current?.files?.[0]) return;
    const fd = new FormData();
    fd.append("ogImage", fileRef.current.files[0]);
    startTransition(async () => {
      const res = await uploadOgImage(fd);
      if ("error" in res && res.error) { setUploadError(res.error); return; }
      if ("seoOgImage" in res && res.seoOgImage) {
        setOgImage(res.seoOgImage);
        setPreview(null);
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  }

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      await updateSeo({ seoTitle: title, seoDescription: desc });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <div className="p-6 space-y-5">
      {/* Title */}
      <div className="grid grid-cols-3 gap-4 items-center">
        <label className="text-xs text-[#8E7A6B]">Título del sitio</label>
        <div className="col-span-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lira de Luna — Joyas que cuentan tu historia"
            className="w-full bg-[#EDE2D8] border border-[#D8BFAE] text-[#5C4A3E] text-xs px-3 py-2.5 outline-none focus:border-[#CDA78F] transition-colors"
          />
        </div>
      </div>

      {/* Description */}
      <div className="grid grid-cols-3 gap-4">
        <label className="text-xs text-[#8E7A6B] pt-2">Meta descripción</label>
        <div className="col-span-2">
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Diseños minimalistas en plata y baño de oro."
            rows={3}
            maxLength={160}
            className="w-full bg-[#EDE2D8] border border-[#D8BFAE] text-[#5C4A3E] text-xs px-3 py-2.5 outline-none focus:border-[#CDA78F] transition-colors resize-none"
          />
          <p className="text-[9px] text-[#8E7A6B] text-right mt-0.5">{desc.length}/160</p>
        </div>
      </div>

      {/* OG Image */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-[#8E7A6B]">Imagen OG</label>
          <p className="text-[9px] text-[#8E7A6B] mt-0.5">Se muestra al compartir en redes sociales. 1200×630 px recomendado.</p>
        </div>
        <div className="col-span-2 space-y-3">
          {/* Current / preview */}
          {(preview || ogImage) ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview ?? ogImage ?? ""}
                alt="OG preview"
                className="h-24 object-cover border border-[#D8BFAE]"
              />
              {preview && (
                <button
                  onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-[#5C4A3E] text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
                >
                  <X size={10} strokeWidth={2} />
                </button>
              )}
            </div>
          ) : (
            <div className="h-24 w-44 bg-[#EDE2D8] border border-dashed border-[#D8BFAE] flex items-center justify-center">
              <ImageIcon size={24} strokeWidth={1} className="text-[#D8BFAE]" />
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
            id="og-image-upload"
          />

          <div className="flex items-center gap-2">
            <label
              htmlFor="og-image-upload"
              className="flex items-center gap-1.5 text-[10px] tracking-[0.12em] uppercase text-[#8E7A6B] border border-[#D8BFAE] px-3 py-2 cursor-pointer hover:border-[#CDA78F] hover:text-[#5C4A3E] transition-colors"
            >
              <Upload size={11} strokeWidth={1.5} /> Seleccionar imagen
            </label>
            {preview && (
              <button
                onClick={handleUpload}
                disabled={isPending}
                className="flex items-center gap-1.5 text-[10px] tracking-[0.12em] uppercase bg-[#CDA78F] hover:bg-[#8E7A6B] text-white px-3 py-2 transition-colors disabled:opacity-50"
              >
                {isPending ? "Subiendo…" : "Subir"}
              </button>
            )}
          </div>
          {uploadError && <p className="text-[10px] text-red-500">{uploadError}</p>}
        </div>
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
