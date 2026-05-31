"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, X, Check, ChevronDown, FolderOpen, ExternalLink, Tag, DollarSign, Sliders } from "lucide-react";
import {
  createFilterGroup, updateFilterGroup, deleteFilterGroup, toggleFilterGroupActive,
  createFilterOption, updateFilterOption, deleteFilterOption, toggleFilterOptionActive,
} from "@/app/actions/admin/filters";
import { toggleCollectionActive } from "@/app/actions/admin/collections";

// ── Types ──────────────────────────────────────────────────────

type FilterOption = {
  id: string;
  label: string;
  value: string;
  minPrice: number | null;
  maxPrice: number | null;
  isActive: boolean;
  sortOrder: number;
};

type FilterGroup = {
  id: string;
  name: string;
  slug: string;
  kind: "MATERIAL" | "PRICE_RANGE" | "CUSTOM";
  isActive: boolean;
  sortOrder: number;
  options: FilterOption[];
};

type Collection = { id: string; name: string; slug: string; isActive: boolean };

interface Props {
  filterGroups: FilterGroup[];
  collections: Collection[];
}

// ── Kind meta ─────────────────────────────────────────────────

const KIND_META: Record<string, { label: string; hint: string; icon: React.ReactNode }> = {
  MATERIAL:    { label: "Material",         hint: "Filtra por atributos del producto (ej. materiales). Las opciones deben coincidir exactamente con los materiales asignados a cada producto.", icon: <Tag size={13} strokeWidth={1.5} /> },
  PRICE_RANGE: { label: "Rango de precio",  hint: "Filtra por rango de precio. Cada opción lleva precio mínimo y máximo.", icon: <DollarSign size={13} strokeWidth={1.5} /> },
  CUSTOM:      { label: "Personalizado",    hint: "Filtro genérico. Las opciones se comparan con los atributos del producto.", icon: <Sliders size={13} strokeWidth={1.5} /> },
};

// ── New Group Modal ────────────────────────────────────────────

function NewGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: (g: FilterGroup) => void }) {
  const [name, setName]   = useState("");
  const [kind, setKind]   = useState<"MATERIAL" | "PRICE_RANGE" | "CUSTOM">("CUSTOM");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await createFilterGroup({ name, kind });
      if (res.error) { setError(res.error); return; }
      onCreated(res.group!);
    });
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-[#F7F4F1] border border-[#D8BFAE] w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8BFAE]">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">Nuevo grupo de filtros</h2>
          <button onClick={onClose} className="text-[#8E7A6B] hover:text-[#5C4A3E]"><X size={16} strokeWidth={1.5} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] block mb-1.5">Nombre del filtro</label>
            <input
              autoFocus value={name} onChange={(e) => setName(e.target.value)}
              placeholder="ej. Material, Peso, Estilo, Ocasión…"
              className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
              required
            />
          </div>
          <div>
            <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] block mb-1.5">Tipo de filtro</label>
            <div className="space-y-2">
              {(["MATERIAL", "PRICE_RANGE", "CUSTOM"] as const).map((k) => (
                <label key={k} className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${kind === k ? "border-[#CDA78F] bg-[#EDE2D8]/50" : "border-[#D8BFAE] hover:border-[#CDA78F]/50"}`}>
                  <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="mt-0.5 accent-[#CDA78F]" />
                  <div>
                    <p className="text-[10px] tracking-[0.1em] uppercase text-[#5C4A3E] font-medium">{KIND_META[k].label}</p>
                    <p className="text-[9px] text-[#8E7A6B] mt-0.5 leading-relaxed">{KIND_META[k].hint}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-[10px] text-red-500 bg-red-50 border border-red-200 px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-[#D8BFAE] text-[10px] tracking-[0.15em] uppercase text-[#8E7A6B] py-2.5 hover:border-[#CDA78F] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="flex-1 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[10px] tracking-[0.15em] uppercase py-2.5 transition-colors disabled:opacity-50">
              {isPending ? "Creando…" : "Crear filtro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Option Row ─────────────────────────────────────────────────

function OptionRow({
  option,
  kind,
  onUpdated,
  onDeleted,
}: {
  option: FilterOption;
  kind: FilterGroup["kind"];
  onUpdated: (updated: FilterOption) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing]         = useState(false);
  const [label, setLabel]             = useState(option.label);
  const [value, setValue]             = useState(option.value);
  const [minPrice, setMinPrice]       = useState(option.minPrice != null ? String(option.minPrice) : "");
  const [maxPrice, setMaxPrice]       = useState(option.maxPrice != null ? String(option.maxPrice) : "");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isPending, startTransition]  = useTransition();

  function parsePrice(s: string): number | null { const n = parseInt(s); return isNaN(n) ? null : n; }

  function handleSave() {
    startTransition(async () => {
      const res = await updateFilterOption(option.id, {
        label, value: kind === "PRICE_RANGE" ? label : value,
        minPrice: kind === "PRICE_RANGE" ? (parsePrice(minPrice) ?? 0) : null,
        maxPrice: kind === "PRICE_RANGE" ? parsePrice(maxPrice) : null,
      });
      if (res.success) {
        onUpdated({ ...option, label, value: kind === "PRICE_RANGE" ? label : value,
          minPrice: kind === "PRICE_RANGE" ? (parsePrice(minPrice) ?? 0) : null,
          maxPrice: kind === "PRICE_RANGE" ? parsePrice(maxPrice) : null });
        setEditing(false);
      }
    });
  }

  function handleToggle() {
    startTransition(async () => {
      await toggleFilterOptionActive(option.id, !option.isActive);
      onUpdated({ ...option, isActive: !option.isActive });
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteFilterOption(option.id);
      onDeleted(option.id);
    });
  }

  if (editing) {
    return (
      <div className={`px-4 py-3 bg-[#EDE2D8]/40 border-b border-[#EDE2D8]`}>
        {kind === "PRICE_RANGE" ? (
          <div className="space-y-2">
            <input
              autoFocus value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder='ej. "Menos de $10.000"'
              className="w-full bg-white border border-[#D8BFAE] px-2.5 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
            />
            <div className="flex gap-2">
              <input
                type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Mín. CLP"
                className="w-full bg-white border border-[#D8BFAE] px-2.5 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
              />
              <input
                type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Máx. CLP (vacío = sin límite)"
                className="w-full bg-white border border-[#D8BFAE] px-2.5 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              autoFocus value={label} onChange={(e) => { setLabel(e.target.value); setValue(e.target.value); }}
              placeholder="Etiqueta (visible en tienda)"
              className="w-full bg-white border border-[#D8BFAE] px-2.5 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
            />
            <input
              value={value} onChange={(e) => setValue(e.target.value)}
              placeholder="Valor de comparación (por defecto igual a etiqueta)"
              className="w-full bg-white border border-[#D8BFAE]/70 px-2.5 py-1.5 text-xs text-[#8E7A6B] outline-none focus:border-[#CDA78F]"
            />
          </div>
        )}
        <div className="flex gap-1.5 mt-2">
          <button onClick={handleSave} disabled={isPending} className="flex items-center gap-1 bg-[#CDA78F] hover:bg-[#8E7A6B] disabled:opacity-50 text-white text-[9px] uppercase tracking-[0.1em] px-3 py-1.5 transition-colors">
            <Check size={11} /> Guardar
          </button>
          <button onClick={() => setEditing(false)} className="flex items-center gap-1 border border-[#D8BFAE] text-[#8E7A6B] text-[9px] uppercase tracking-[0.1em] px-3 py-1.5 transition-colors hover:border-[#CDA78F]">
            <X size={11} /> Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 border-b border-[#EDE2D8] group transition-colors hover:bg-[#EDE2D8]/20 ${!option.isActive ? "opacity-40" : ""}`}>
      <div className="flex-1 min-w-0">
        <span className="text-xs text-[#5C4A3E]">{option.label}</span>
        {kind === "PRICE_RANGE" && (
          <span className="text-[10px] text-[#8E7A6B] ml-2">
            ${(option.minPrice ?? 0).toLocaleString("es-CL")} – {option.maxPrice != null ? `$${option.maxPrice.toLocaleString("es-CL")}` : "sin límite"}
          </span>
        )}
        {kind !== "PRICE_RANGE" && option.value !== option.label && (
          <span className="text-[9px] text-[#8E7A6B]/60 ml-2">({option.value})</span>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={handleToggle} disabled={isPending} className={`text-[9px] uppercase tracking-[0.08em] px-2 py-1 transition-colors ${option.isActive ? "bg-emerald-50 text-emerald-600 hover:bg-[#EDE2D8] hover:text-[#8E7A6B]" : "bg-[#EDE2D8] text-[#8E7A6B] hover:bg-emerald-50 hover:text-emerald-600"}`}>
          {option.isActive ? "Activo" : "Inactivo"}
        </button>
        <button onClick={() => setEditing(true)} className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] hover:text-[#5C4A3E] transition-colors">
          <Pencil size={11} strokeWidth={1.5} />
        </button>
        {deleteConfirm ? (
          <div className="flex gap-1">
            <button onClick={handleDelete} disabled={isPending} className="w-7 h-7 flex items-center justify-center bg-red-50 border border-red-200 text-red-400 hover:bg-red-100 transition-colors">
              <Check size={11} strokeWidth={1.5} />
            </button>
            <button onClick={() => setDeleteConfirm(false)} className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] transition-colors">
              <X size={11} strokeWidth={1.5} />
            </button>
          </div>
        ) : (
          <button onClick={() => setDeleteConfirm(true)} className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] hover:border-red-300 hover:text-red-400 transition-colors">
            <Trash2 size={11} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Add Option Row ─────────────────────────────────────────────

function AddOptionRow({
  groupId,
  kind,
  onCreated,
  onCancel,
}: {
  groupId: string;
  kind: FilterGroup["kind"];
  onCreated: (opt: FilterOption) => void;
  onCancel: () => void;
}) {
  const [label, setLabel]       = useState("");
  const [value, setValue]       = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [error, setError]       = useState("");
  const [isPending, startTransition] = useTransition();

  function parsePrice(s: string): number | null { const n = parseInt(s); return isNaN(n) ? null : n; }

  function handleSave() {
    if (!label.trim()) { setError("La etiqueta es requerida"); return; }
    setError("");
    startTransition(async () => {
      const res = await createFilterOption(groupId, {
        label: label.trim(),
        value: kind === "PRICE_RANGE" ? label.trim() : (value.trim() || label.trim()),
        minPrice: kind === "PRICE_RANGE" ? (parsePrice(minPrice) ?? 0) : null,
        maxPrice: kind === "PRICE_RANGE" ? parsePrice(maxPrice) : null,
      });
      if (res.error) { setError(res.error); return; }
      onCreated(res.option!);
    });
  }

  return (
    <div className="px-4 py-3 bg-[#EDE2D8]/50 border-b border-[#D8BFAE]">
      {kind === "PRICE_RANGE" ? (
        <div className="space-y-2">
          <input
            autoFocus value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder='ej. "Menos de $10.000"'
            onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}
            className="w-full bg-white border border-[#D8BFAE] px-2.5 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
          />
          <div className="flex gap-2">
            <input
              type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Precio mínimo CLP"
              className="w-full bg-white border border-[#D8BFAE] px-2.5 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
            />
            <input
              type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Precio máximo CLP (vacío = sin límite)"
              className="w-full bg-white border border-[#D8BFAE] px-2.5 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            autoFocus value={label} onChange={(e) => { setLabel(e.target.value); if (!value) setValue(e.target.value); }}
            placeholder="Etiqueta (visible en tienda)"
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onCancel(); }}
            className="w-full bg-white border border-[#D8BFAE] px-2.5 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
          />
          <input
            value={value} onChange={(e) => setValue(e.target.value)}
            placeholder="Valor de comparación (opcional, por defecto igual a etiqueta)"
            className="w-full bg-white border border-[#D8BFAE]/70 px-2.5 py-1.5 text-xs text-[#8E7A6B] outline-none focus:border-[#CDA78F]"
          />
        </div>
      )}
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
      <div className="flex gap-1.5 mt-2">
        <button onClick={handleSave} disabled={isPending} className="flex items-center gap-1 bg-[#CDA78F] hover:bg-[#8E7A6B] disabled:opacity-50 text-white text-[9px] uppercase tracking-[0.1em] px-3 py-1.5 transition-colors">
          <Check size={11} /> Guardar
        </button>
        <button onClick={onCancel} className="flex items-center gap-1 border border-[#D8BFAE] text-[#8E7A6B] text-[9px] uppercase tracking-[0.1em] px-3 py-1.5 hover:border-[#CDA78F] transition-colors">
          <X size={11} /> Cancelar
        </button>
      </div>
    </div>
  );
}

// ── Filter Group Card ──────────────────────────────────────────

function FilterGroupCard({
  group: initial,
  onDeleted,
}: {
  group: FilterGroup;
  onDeleted: (id: string) => void;
}) {
  const [group, setGroup]           = useState(initial);
  const [open, setOpen]             = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput]   = useState(group.name);
  const [addingOption, setAddingOption] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError]           = useState("");
  const [isPending, startTransition] = useTransition();

  const meta = KIND_META[group.kind];
  const activeCount = group.options.filter((o) => o.isActive).length;

  function handleToggleActive() {
    startTransition(async () => {
      await toggleFilterGroupActive(group.id, !group.isActive);
      setGroup((g) => ({ ...g, isActive: !g.isActive }));
    });
  }

  function handleSaveName() {
    if (!nameInput.trim()) return;
    startTransition(async () => {
      const res = await updateFilterGroup(group.id, { name: nameInput.trim() });
      if (res.error) { setError(res.error); return; }
      setGroup((g) => ({ ...g, name: nameInput.trim() }));
      setEditingName(false);
      setError("");
    });
  }

  function handleDeleteGroup() {
    startTransition(async () => {
      const res = await deleteFilterGroup(group.id);
      if (res.error) { setError(res.error); return; }
      onDeleted(group.id);
    });
  }

  function handleOptionCreated(opt: FilterOption) {
    setGroup((g) => ({ ...g, options: [...g.options, opt] }));
    setAddingOption(false);
  }

  function handleOptionUpdated(updated: FilterOption) {
    setGroup((g) => ({ ...g, options: g.options.map((o) => o.id === updated.id ? updated : o) }));
  }

  function handleOptionDeleted(id: string) {
    setGroup((g) => ({ ...g, options: g.options.filter((o) => o.id !== id) }));
  }

  return (
    <div className={`bg-[#F7F4F1] border border-[#D8BFAE] transition-opacity ${!group.isActive ? "opacity-60" : ""}`}>
      {/* Group header */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <ChevronDown size={14} strokeWidth={1.5} className={`text-[#8E7A6B] transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
          <span className="text-brand-taupe">{meta.icon}</span>
          {editingName ? (
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") { setEditingName(false); setNameInput(group.name); } }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-white border border-[#CDA78F] px-2 py-0.5 text-sm text-[#5C4A3E] outline-none"
            />
          ) : (
            <span className="text-sm font-medium text-[#5C4A3E] truncate">{group.name}</span>
          )}
          <span className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B] bg-[#EDE2D8] px-2 py-0.5 shrink-0">
            {meta.label}
          </span>
          <span className="text-[10px] text-[#8E7A6B] shrink-0">{activeCount}/{group.options.length} opciones</span>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {editingName ? (
            <>
              <button onClick={handleSaveName} disabled={isPending} className="w-7 h-7 flex items-center justify-center bg-emerald-50 border border-emerald-200 text-emerald-500 hover:bg-emerald-100 transition-colors">
                <Check size={12} strokeWidth={1.5} />
              </button>
              <button onClick={() => { setEditingName(false); setNameInput(group.name); }} className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] transition-colors">
                <X size={12} strokeWidth={1.5} />
              </button>
            </>
          ) : (
            <button onClick={() => { setEditingName(true); setOpen(true); }} className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] hover:text-[#5C4A3E] transition-colors" title="Renombrar">
              <Pencil size={11} strokeWidth={1.5} />
            </button>
          )}
          <button onClick={handleToggleActive} disabled={isPending} className={`text-[9px] uppercase tracking-[0.08em] px-2 py-1 transition-colors ${group.isActive ? "bg-emerald-50 text-emerald-600 hover:bg-[#EDE2D8] hover:text-[#8E7A6B]" : "bg-[#EDE2D8] text-[#8E7A6B] hover:bg-emerald-50 hover:text-emerald-600"}`}>
            {group.isActive ? "Activo" : "Inactivo"}
          </button>
          {deleteConfirm ? (
            <div className="flex gap-1">
              <button onClick={handleDeleteGroup} disabled={isPending} className="flex items-center gap-1 bg-red-50 border border-red-200 text-red-500 text-[9px] uppercase tracking-[0.08em] px-2 py-1 hover:bg-red-100 transition-colors">
                <Check size={10} /> Confirmar
              </button>
              <button onClick={() => setDeleteConfirm(false)} className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] transition-colors">
                <X size={11} strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <button onClick={() => setDeleteConfirm(true)} className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] hover:border-red-300 hover:text-red-400 transition-colors" title="Eliminar grupo">
              <Trash2 size={11} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-[10px] text-red-500 px-4 pb-2">{error}</p>}

      {/* Options */}
      {open && (
        <div className="border-t border-[#D8BFAE]">
          {/* Hint */}
          <p className="px-4 py-2.5 text-[10px] text-[#8E7A6B] bg-[#EDE2D8]/40 border-b border-[#EDE2D8]">
            {meta.hint}
          </p>

          {group.options.length === 0 && !addingOption && (
            <p className="px-4 py-6 text-center text-[10px] text-[#8E7A6B]">Sin opciones todavía — agrega la primera</p>
          )}

          {group.options.map((opt) => (
            <OptionRow
              key={opt.id}
              option={opt}
              kind={group.kind}
              onUpdated={handleOptionUpdated}
              onDeleted={handleOptionDeleted}
            />
          ))}

          {addingOption && (
            <AddOptionRow
              groupId={group.id}
              kind={group.kind}
              onCreated={handleOptionCreated}
              onCancel={() => setAddingOption(false)}
            />
          )}

          <div className="px-4 py-3 border-t border-[#EDE2D8]">
            <button
              onClick={() => setAddingOption(true)}
              disabled={addingOption}
              className="flex items-center gap-1.5 text-[10px] tracking-[0.12em] uppercase text-[#CDA78F] hover:text-[#8E7A6B] disabled:opacity-40 transition-colors"
            >
              <Plus size={12} strokeWidth={2} /> Agregar opción
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Categories Section ─────────────────────────────────────────

function CategoriesSection({ initial }: { initial: Collection[] }) {
  const [items, setItems]           = useState(initial);
  const [isPending, startTransition] = useTransition();

  function handleToggle(id: string, isActive: boolean) {
    startTransition(async () => {
      await toggleCollectionActive(id, isActive);
      setItems((prev) => prev.map((c) => c.id === id ? { ...c, isActive } : c));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen size={14} strokeWidth={1.5} className="text-[#CDA78F]" />
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">
            Categorías — {items.filter((c) => c.isActive).length} activas de {items.length}
          </h2>
        </div>
        <a href="/admin/colecciones" className="flex items-center gap-1.5 text-[10px] tracking-[0.1em] uppercase text-[#8E7A6B] hover:text-[#5C4A3E] border border-[#D8BFAE] px-3 py-2 transition-colors hover:border-[#CDA78F]">
          <ExternalLink size={11} strokeWidth={1.5} /> Gestionar colecciones
        </a>
      </div>
      <p className="text-[10px] text-[#8E7A6B]">
        Las categorías activas aparecen como filtro en la tienda. Para crear o editar colecciones, usa el módulo de Colecciones.
      </p>
      <div className="bg-[#F7F4F1] border border-[#D8BFAE] divide-y divide-[#EDE2D8]">
        {items.length === 0 && <p className="py-8 text-center text-xs text-[#8E7A6B]">Sin colecciones creadas</p>}
        {items.map((col) => (
          <div key={col.id} className={`flex items-center gap-3 px-4 py-3 ${!col.isActive ? "opacity-50" : ""}`}>
            <div className="flex-1">
              <p className="text-xs text-[#5C4A3E] font-medium">{col.name}</p>
              <p className="text-[10px] text-[#8E7A6B]">/{col.slug}</p>
            </div>
            <button
              onClick={() => handleToggle(col.id, !col.isActive)}
              disabled={isPending}
              className={`text-[9px] uppercase tracking-[0.08em] px-3 py-1.5 transition-colors disabled:opacity-50 ${col.isActive ? "bg-emerald-50 text-emerald-600 hover:bg-[#EDE2D8] hover:text-[#8E7A6B]" : "bg-[#EDE2D8] text-[#8E7A6B] hover:bg-emerald-50 hover:text-emerald-600"}`}
            >
              {col.isActive ? "Visible" : "Oculta"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

export default function AdminFiltrosClient({ filterGroups: initial, collections }: Props) {
  const [groups, setGroups] = useState(initial);
  const [showNewModal, setShowNewModal] = useState(false);
  const [tab, setTab] = useState<"grupos" | "categorias">("grupos");

  function handleGroupCreated(g: FilterGroup) {
    setGroups((prev) => [...prev, g]);
    setShowNewModal(false);
  }

  function handleGroupDeleted(id: string) {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-[#5C4A3E] tracking-wide">Filtros</h1>
          <p className="text-[11px] text-[#8E7A6B] mt-1">
            Crea y administra los grupos de filtros que aparecen en la tienda. Puedes agregar cualquier tipo de filtro nuevo.
          </p>
        </div>
        {tab === "grupos" && (
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[10px] tracking-[0.15em] uppercase px-4 py-2.5 transition-colors shrink-0"
          >
            <Plus size={13} strokeWidth={2} /> Nuevo filtro
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#D8BFAE] pb-0">
        {([["grupos", "Grupos de filtros"], ["categorias", "Categorías"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-3 text-[10px] tracking-[0.12em] uppercase transition-colors border-b-2 -mb-px ${
              tab === key ? "border-[#CDA78F] text-[#5C4A3E]" : "border-transparent text-[#8E7A6B] hover:text-[#5C4A3E]"
            }`}
          >
            {label}
            {key === "grupos" && (
              <span className={`ml-2 text-[9px] px-1.5 py-0.5 ${tab === key ? "bg-[#CDA78F] text-white" : "bg-[#EDE2D8] text-[#8E7A6B]"}`}>
                {groups.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "categorias" && <CategoriesSection initial={collections} />}

      {tab === "grupos" && (
        <div className="space-y-3">
          {groups.length === 0 ? (
            <div className="bg-[#F7F4F1] border border-[#D8BFAE] py-16 text-center">
              <Sliders size={24} strokeWidth={1} className="text-[#D8BFAE] mx-auto mb-3" />
              <p className="text-xs text-[#8E7A6B] mb-4">Sin grupos de filtros todavía</p>
              <button
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-2 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[10px] tracking-[0.15em] uppercase px-5 py-2.5 transition-colors mx-auto"
              >
                <Plus size={13} strokeWidth={2} /> Crear primer filtro
              </button>
            </div>
          ) : (
            groups.map((g) => (
              <FilterGroupCard key={g.id} group={g} onDeleted={handleGroupDeleted} />
            ))
          )}
        </div>
      )}

      {showNewModal && (
        <NewGroupModal onClose={() => setShowNewModal(false)} onCreated={handleGroupCreated} />
      )}
    </div>
  );
}
