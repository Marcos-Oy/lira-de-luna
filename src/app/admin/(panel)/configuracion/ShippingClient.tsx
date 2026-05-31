"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { updateShipping } from "@/app/actions/admin/settings";

interface Props {
  freeShippingFrom: number;
  standardShipping: number;
  processingDays: string;
}

export default function ShippingClient({ freeShippingFrom, standardShipping, processingDays }: Props) {
  const [form, setForm] = useState({
    freeShippingFrom: String(freeShippingFrom),
    standardShipping: String(standardShipping),
    processingDays,
  });
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(""); setSaved(false);
    startTransition(async () => {
      const res = await updateShipping({
        freeShippingFrom: parseInt(form.freeShippingFrom) || 0,
        standardShipping: parseInt(form.standardShipping) || 0,
        processingDays: form.processingDays.trim() || "1-2",
      });
      if (res.success) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
      else setError("Error al guardar");
    });
  }

  const Row = ({ label, field, suffix }: { label: string; field: keyof typeof form; suffix?: string }) => (
    <div className="grid grid-cols-3 gap-4 items-center">
      <label className="text-xs text-[#8E7A6B]">{label}</label>
      <div className="col-span-2 flex gap-2">
        <input
          type={field === "processingDays" ? "text" : "number"}
          value={form[field]}
          onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
          className="flex-1 bg-[#EDE2D8] border border-[#D8BFAE] text-[#5C4A3E] text-xs px-3 py-2.5 outline-none focus:border-[#CDA78F] transition-colors"
        />
        {suffix && <span className="text-xs text-[#8E7A6B] self-center shrink-0">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-5">
      <Row label="Envío gratis desde"      field="freeShippingFrom" suffix="CLP" />
      <Row label="Costo de envío estándar" field="standardShipping"  suffix="CLP" />
      <Row label="Días de procesamiento"   field="processingDays"    suffix="días hábiles" />
      {error && <p className="text-[10px] text-red-500">{error}</p>}
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
