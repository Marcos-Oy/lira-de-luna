"use client";

import { useRef, useState, useTransition } from "react";
import { uploadStoreLogo, removeStoreLogo, updateStoreName } from "@/app/actions/admin/settings";
import { CheckCircle2, Loader2, Upload, X, ImageIcon } from "lucide-react";

interface Props {
  initialLogoUrl: string | null;
  initialStoreName: string;
}

export default function StoreSettingsClient({ initialLogoUrl, initialStoreName }: Props) {
  const [storeName, setStoreName] = useState(initialStoreName);
  const [savedName, setSavedName] = useState(false);
  const [isPendingName, startNameTransition] = useTransition();

  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(initialLogoUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPendingLogo, startLogoTransition] = useTransition();
  const [logoError, setLogoError] = useState<string | null>(null);
  const [savedLogo, setSavedLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSaveName() {
    if (!storeName.trim()) return;
    startNameTransition(async () => {
      await updateStoreName(storeName);
      setSavedName(true);
      setTimeout(() => setSavedName(false), 2000);
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleUpload() {
    if (!selectedFile) return;
    const fd = new FormData();
    fd.append("logo", selectedFile);
    startLogoTransition(async () => {
      const res = await uploadStoreLogo(fd);
      if ("error" in res) {
        setLogoError(String(res.error));
      } else {
        setCurrentLogoUrl(res.logoUrl ?? null);
        setPreviewUrl(null);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setSavedLogo(true);
        setTimeout(() => setSavedLogo(false), 2000);
      }
    });
  }

  function handleRemoveLogo() {
    startLogoTransition(async () => {
      await removeStoreLogo();
      setCurrentLogoUrl(null);
      setPreviewUrl(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function handleCancelSelection() {
    setPreviewUrl(null);
    setSelectedFile(null);
    setLogoError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const displayUrl = previewUrl ?? currentLogoUrl;

  return (
    <div className="space-y-6">
      {/* Store name */}
      <div className="grid grid-cols-3 gap-4 items-center">
        <label className="text-xs text-[#8E7A6B]">Nombre de la tienda</label>
        <div className="col-span-2 flex gap-2">
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="flex-1 bg-[#EDE2D8] border border-[#D8BFAE] text-[#5C4A3E] text-xs px-3 py-2.5 outline-none focus:border-[#CDA78F] transition-colors"
          />
          <button
            onClick={handleSaveName}
            disabled={isPendingName || !storeName.trim()}
            className="flex items-center gap-1.5 bg-[#CDA78F] hover:bg-[#8E7A6B] disabled:opacity-50 text-white text-[10px] tracking-[0.15em] uppercase px-4 py-2.5 transition-colors shrink-0"
          >
            {isPendingName ? <Loader2 size={12} className="animate-spin" /> : savedName ? <CheckCircle2 size={12} /> : null}
            {savedName ? "Guardado" : "Guardar"}
          </button>
        </div>
      </div>

      {/* Logo upload */}
      <div className="grid grid-cols-3 gap-4 items-start">
        <div>
          <label className="text-xs text-[#8E7A6B]">Logotipo</label>
          <p className="text-[10px] text-[#8E7A6B]/70 mt-1 leading-relaxed">
            PNG, JPG, WebP o SVG. Máx. 5 MB.
          </p>
        </div>
        <div className="col-span-2 space-y-3">

          {/* Preview box */}
          <div className="bg-[#EDE2D8] border border-[#D8BFAE] h-28 flex items-center justify-center relative overflow-hidden">
            {displayUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayUrl}
                  alt="Logotipo"
                  className="max-h-20 max-w-full object-contain"
                />
                {previewUrl && (
                  <span className="absolute top-2 left-2 bg-[#CDA78F] text-white text-[9px] tracking-[0.1em] uppercase px-2 py-0.5">
                    Vista previa
                  </span>
                )}
              </>
            ) : (
              <div className="text-center">
                <ImageIcon size={24} strokeWidth={1} className="text-[#D8BFAE] mx-auto mb-1" />
                <p className="font-heading text-base tracking-widest uppercase text-[#5C4A3E]">Lira de Luna</p>
                <p className="text-[10px] text-[#8E7A6B] mt-0.5">Logo de texto (predeterminado)</p>
              </div>
            )}
          </div>

          {/* Error */}
          {logoError && (
            <p className="text-[10px] text-red-500">{logoError}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* File picker */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleFileChange}
              className="hidden"
              id="logo-upload"
            />
            <label
              htmlFor="logo-upload"
              className="flex items-center gap-1.5 border border-[#D8BFAE] bg-[#EDE2D8] hover:bg-[#D8BFAE] text-[#5C4A3E] text-[10px] tracking-[0.15em] uppercase px-4 py-2.5 cursor-pointer transition-colors"
            >
              <Upload size={12} />
              {currentLogoUrl && !previewUrl ? "Cambiar imagen" : "Seleccionar imagen"}
            </label>

            {/* Upload selected file */}
            {selectedFile && (
              <>
                <button
                  onClick={handleUpload}
                  disabled={isPendingLogo}
                  className="flex items-center gap-1.5 bg-[#CDA78F] hover:bg-[#8E7A6B] disabled:opacity-50 text-white text-[10px] tracking-[0.15em] uppercase px-4 py-2.5 transition-colors"
                >
                  {isPendingLogo ? <Loader2 size={12} className="animate-spin" /> : savedLogo ? <CheckCircle2 size={12} /> : null}
                  {savedLogo ? "Guardado" : "Subir logo"}
                </button>
                <button
                  onClick={handleCancelSelection}
                  className="flex items-center gap-1 text-[10px] tracking-[0.1em] uppercase text-[#8E7A6B] hover:text-red-400 transition-colors px-2 py-2.5"
                >
                  <X size={12} /> Cancelar
                </button>
              </>
            )}

            {/* Remove current logo */}
            {currentLogoUrl && !selectedFile && (
              <button
                onClick={handleRemoveLogo}
                disabled={isPendingLogo}
                className="flex items-center gap-1 text-[10px] tracking-[0.1em] uppercase text-[#8E7A6B] hover:text-red-400 transition-colors px-2 py-2.5 disabled:opacity-50"
              >
                <X size={12} /> Quitar logo
              </button>
            )}

            {selectedFile && (
              <span className="text-[10px] text-[#8E7A6B] truncate max-w-[160px]">{selectedFile.name}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
