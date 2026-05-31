"use client";

import { useState, useTransition, useMemo } from "react";
import { TrendingDown, Plus, X, Check, Pencil, Trash2, ChevronDown } from "lucide-react";
import { createLoss, updateLoss, deleteLoss } from "@/app/actions/admin/losses";

// ─── Types ────────────────────────────────────────────────────

type Loss = {
  id:          string;
  description: string;
  amount:      number;
  category:    string;
  notes:       string | null;
  date:        string;
  createdAt:   string;
};

interface Props {
  losses:         Loss[];
  totalLoss:      number;
  thisMonthLoss:  number;
}

// ─── Constants ───────────────────────────────────────────────

const CATEGORIES = [
  "Robo / hurto",
  "Daño en almacén",
  "Producto defectuoso",
  "Pérdida en envío",
  "Error operacional",
  "Otro",
];

const emptyForm = () => ({
  description: "",
  amount: "",
  category: CATEGORIES[0],
  notes: "",
  date: new Date().toISOString().slice(0, 10),
});

// ─── Main component ───────────────────────────────────────────

export default function PerdidasClient({ losses: initialLosses, totalLoss, thisMonthLoss }: Props) {
  const [losses, setLosses]         = useState<Loss[]>(initialLosses);
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm]             = useState(emptyForm());
  const [formError, setFormError]   = useState("");
  const [formSaved, setFormSaved]   = useState(false);
  const [catFilter, setCatFilter]   = useState("ALL");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (catFilter === "ALL") return losses;
    return losses.filter((l) => l.category === catFilter);
  }, [losses, catFilter]);

  const filteredTotal = filtered.reduce((s, l) => s + l.amount, 0);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError("");
    setShowForm(true);
  }

  function openEdit(l: Loss) {
    setEditingId(l.id);
    setForm({
      description: l.description,
      amount:      String(l.amount),
      category:    l.category,
      notes:       l.notes ?? "",
      date:        l.date.slice(0, 10),
    });
    setFormError("");
    setShowForm(true);
  }

  function handleSubmit() {
    if (!form.description.trim() || !form.amount || parseInt(form.amount) <= 0) {
      setFormError("Descripción y monto son obligatorios"); return;
    }
    setFormError("");
    startTransition(async () => {
      const payload = {
        description: form.description,
        amount:      parseInt(form.amount),
        category:    form.category,
        notes:       form.notes || undefined,
        date:        form.date,
      };

      if (editingId) {
        const res = await updateLoss(editingId, payload);
        if ("error" in res) { setFormError(res.error ?? "Error desconocido"); return; }
        setLosses((prev) => prev.map((l) =>
          l.id === editingId ? { ...l, ...payload, notes: payload.notes ?? null } : l
        ));
      } else {
        const res = await createLoss(payload);
        if ("error" in res) { setFormError(res.error ?? "Error desconocido"); return; }
        window.location.reload();
        return;
      }

      setFormSaved(true);
      setTimeout(() => { setFormSaved(false); setShowForm(false); }, 1200);
    });
  }

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar este registro de pérdida?")) return;
    startTransition(async () => {
      await deleteLoss(id);
      setLosses((prev) => prev.filter((l) => l.id !== id));
    });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">Registro de pérdidas</h1>
          <p className="text-xs text-[#8E7A6B] mt-0.5">Registra y controla las pérdidas del negocio</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[9px] tracking-[0.15em] uppercase transition-colors"
        >
          <Plus size={12} strokeWidth={1.75} />
          Registrar pérdida
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total registros",   value: losses.length, sub: "pérdidas" },
          { label: "Total acumulado",   value: `$${totalLoss.toLocaleString("es-CL")}`, sub: "CLP" },
          { label: "Este mes",          value: `$${thisMonthLoss.toLocaleString("es-CL")}`, sub: "CLP" },
        ].map((k) => (
          <div key={k.label} className="bg-[#F7F4F1] border border-[#D8BFAE] px-4 py-3">
            <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">{k.label}</p>
            <p className="font-heading text-xl text-[#5C4A3E] mt-0.5">{k.value}</p>
            <p className="text-[10px] text-[#8E7A6B]">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="appearance-none bg-[#F7F4F1] border border-[#D8BFAE] pl-3 pr-7 py-1.5 text-[10px] tracking-[0.1em] uppercase text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
          >
            <option value="ALL">Todas las categorías</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
        </div>
        {catFilter !== "ALL" && (
          <span className="text-[10px] text-[#8E7A6B]">
            Total filtrado: <strong className="text-[#5C4A3E]">${filteredTotal.toLocaleString("es-CL")} CLP</strong>
          </span>
        )}
        <span className="text-[10px] text-[#8E7A6B] ml-auto">{filtered.length} registros</span>
      </div>

      {/* Table */}
      <div className="border border-[#D8BFAE] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <TrendingDown size={28} strokeWidth={1} className="mx-auto text-[#D8BFAE] mb-3" />
            <p className="text-xs text-[#8E7A6B]">Sin registros de pérdidas</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[#F7F4F1] border-b border-[#D8BFAE]">
                {["Fecha", "Categoría", "Descripción", "Monto", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] text-left font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8BFAE]">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-[#F7F4F1]/50 transition-colors">
                  <td className="px-4 py-3 text-[11px] text-[#8E7A6B] whitespace-nowrap">
                    {new Date(l.date).toLocaleDateString("es-CL")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[9px] tracking-[0.1em] uppercase bg-[#EDE2D8] text-[#8E7A6B] px-2 py-0.5">
                      {l.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#5C4A3E] max-w-xs">
                    <p className="truncate">{l.description}</p>
                    {l.notes && <p className="text-[10px] text-[#8E7A6B] truncate">{l.notes}</p>}
                  </td>
                  <td className="px-4 py-3 font-heading text-sm text-[#5C4A3E] whitespace-nowrap">
                    ${l.amount.toLocaleString("es-CL")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(l)}
                        className="w-7 h-7 flex items-center justify-center text-[#8E7A6B] hover:text-[#5C4A3E] border border-transparent hover:border-[#D8BFAE] transition-colors"
                        title="Editar"
                      >
                        <Pencil size={11} strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => handleDelete(l.id)}
                        disabled={isPending}
                        className="w-7 h-7 flex items-center justify-center text-[#D8BFAE] hover:text-red-400 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={11} strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8BFAE]">
              <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E]">
                {editingId ? "Editar pérdida" : "Registrar pérdida"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-[#8E7A6B] hover:text-[#5C4A3E]">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {formError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2">{formError}</p>}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Fecha</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Monto (CLP) *</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0"
                    className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Categoría</label>
                <div className="relative">
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full appearance-none bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Descripción *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Describe la pérdida..."
                  className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Notas internas</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Opcional..."
                  className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#D8BFAE] flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2 text-[10px] tracking-[0.12em] uppercase text-[#8E7A6B] border border-[#D8BFAE] hover:border-[#CDA78F] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="flex items-center gap-1.5 px-5 py-2 text-[10px] tracking-[0.12em] uppercase bg-[#CDA78F] hover:bg-[#8E7A6B] text-white transition-colors disabled:opacity-50"
              >
                {formSaved ? <><Check size={11} /> Guardado</> : isPending ? "Guardando..." : editingId ? "Actualizar" : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
