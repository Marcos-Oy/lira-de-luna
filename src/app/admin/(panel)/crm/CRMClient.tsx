"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, Plus, X, ChevronDown, Loader2, MessageCircle,
  Phone, Mail, FileText, LayoutList, Columns2, Trash2, Eye,
  Calendar, Activity, Tag, User, ArrowRight, Check,
} from "lucide-react";
import {
  createLead, updateLead, updateLeadStage, addLeadActivity, deleteLead,
} from "@/app/actions/admin/crm";
import {
  PIPELINE_STAGES, SOURCE_LABELS, ACTIVITY_TYPE_LABELS,
} from "@/lib/crm";
import type { StageKey } from "@/lib/crm";

// ── Types ──────────────────────────────────────────────────────

type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  source: string;
  stage: string;
  tags: string[];
  notes: string | null;
  assignedTo: string | null;
  assignedToId: string | null;
  landingPage: string | null;
  activityCount: number;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
};

type Admin = { id: string; name: string };

interface Props {
  leads: Lead[];
  admins: Admin[];
  initialView: "table" | "kanban";
  initialStage: string;
  initialQ: string;
}

// ── Helpers ───────────────────────────────────────────────────

function getStage(key: string) {
  return PIPELINE_STAGES.find((s) => s.key === key) ?? PIPELINE_STAGES[0];
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── Stage Badge ───────────────────────────────────────────────

function StageBadge({ stage }: { stage: string }) {
  const s = getStage(stage);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ── Stage Dropdown ─────────────────────────────────────────────

function StageDropdown({
  current, onSelect, disabled,
}: { current: string; onSelect: (k: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        disabled={disabled}
        className="flex items-center gap-1"
      >
        <StageBadge stage={current} />
        <ChevronDown size={10} className="text-[#8E7A6B]" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-[#D8BFAE] rounded shadow-lg py-1 min-w-[180px]">
          {PIPELINE_STAGES.map((s) => (
            <button
              key={s.key}
              onClick={(e) => { e.stopPropagation(); onSelect(s.key); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[#F7F4F1] ${current === s.key ? "font-medium" : ""}`}
            >
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              {s.label}
              {current === s.key && <Check size={10} className="ml-auto text-[#CDA78F]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── New Lead Modal ─────────────────────────────────────────────

function NewLeadModal({ onClose, admins }: { onClose: () => void; admins: Admin[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", whatsappNumber: "",
    source: "MANUAL", stage: "NEW", notes: "", nextFollowUpAt: "",
  });

  function setField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("El nombre es requerido"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createLead({
        name: form.name, email: form.email || undefined,
        phone: form.phone || undefined, whatsappNumber: form.whatsappNumber || undefined,
        source: form.source, stage: form.stage,
        notes: form.notes || undefined,
        nextFollowUpAt: form.nextFollowUpAt || undefined,
      });
      if ("error" in res) { setError(res.error ?? "Error desconocido"); return; }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded border border-[#D8BFAE] w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D8BFAE]">
          <h2 className="text-sm font-medium text-[#5C4A3E]">Nuevo lead</h2>
          <button onClick={onClose} className="text-[#8E7A6B] hover:text-[#5C4A3E]"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded">{error}</p>}

          <div>
            <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] block mb-1">Nombre *</label>
            <input
              value={form.name} onChange={(e) => setField("name", e.target.value)}
              placeholder="Nombre del lead"
              className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] block mb-1">Email</label>
              <input
                type="email" value={form.email} onChange={(e) => setField("email", e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F]"
              />
            </div>
            <div>
              <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] block mb-1">Teléfono</label>
              <input
                value={form.phone} onChange={(e) => setField("phone", e.target.value)}
                placeholder="+56 9 1234 5678"
                className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F]"
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] block mb-1">WhatsApp</label>
            <input
              value={form.whatsappNumber} onChange={(e) => setField("whatsappNumber", e.target.value)}
              placeholder="+56 9 1234 5678"
              className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] block mb-1">Fuente</label>
              <select
                value={form.source} onChange={(e) => setField("source", e.target.value)}
                className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F] bg-white"
              >
                {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] block mb-1">Etapa</label>
              <select
                value={form.stage} onChange={(e) => setField("stage", e.target.value)}
                className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F] bg-white"
              >
                {PIPELINE_STAGES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] block mb-1">Próximo seguimiento</label>
            <input
              type="date" value={form.nextFollowUpAt} onChange={(e) => setField("nextFollowUpAt", e.target.value)}
              className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F]"
            />
          </div>
          <div>
            <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] block mb-1">Notas</label>
            <textarea
              value={form.notes} onChange={(e) => setField("notes", e.target.value)}
              rows={3} placeholder="Notas adicionales..."
              className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F] resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 border border-[#D8BFAE] rounded px-4 py-2 text-xs text-[#8E7A6B] hover:bg-[#F7F4F1]"
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={isPending}
              className="flex-1 bg-[#5C4A3E] text-white rounded px-4 py-2 text-xs hover:bg-[#4a3a30] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 size={12} className="animate-spin" />}
              Crear lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Lead Modal ─────────────────────────────────────────────────

function LeadModal({
  lead: initialLead, admins, onClose,
}: { lead: Lead; admins: Admin[]; onClose: () => void }) {
  const [lead, setLead] = useState(initialLead);
  const [tab, setTab] = useState<"info" | "activity">("info");
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: lead.name, email: lead.email ?? "", phone: lead.phone ?? "",
    whatsappNumber: lead.whatsappNumber ?? "", notes: lead.notes ?? "",
    nextFollowUpAt: lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 10) : "",
  });
  const [activities, setActivities] = useState<{ id: string; type: string; content: string; adminName: string; createdAt: string }[]>([]);
  const [loadingAct, setLoadingAct] = useState(false);
  const [actType, setActType] = useState("NOTE");
  const [actContent, setActContent] = useState("");
  const [actError, setActError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Load activities when tab = activity
  useEffect(() => {
    if (tab !== "activity") return;
    setLoadingAct(true);
    fetch(`/api/admin/crm/activities?leadId=${lead.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.activities) setActivities(d.activities); })
      .catch(() => {})
      .finally(() => setLoadingAct(false));
  }, [tab, lead.id]);

  function handleStageChange(stage: string) {
    startTransition(async () => {
      const res = await updateLeadStage(lead.id, stage);
      if ("error" in res && res.error) { setError(res.error); return; }
      setLead((l) => ({ ...l, stage }));
    });
  }

  function handleSaveEdit() {
    startTransition(async () => {
      const res = await updateLead(lead.id, {
        name: editForm.name, email: editForm.email || undefined,
        phone: editForm.phone || undefined, whatsappNumber: editForm.whatsappNumber || undefined,
        notes: editForm.notes || undefined,
        nextFollowUpAt: editForm.nextFollowUpAt || null,
      });
      if ("error" in res && res.error) { setError(res.error); return; }
      setLead((l) => ({
        ...l,
        name: editForm.name, email: editForm.email || null,
        phone: editForm.phone || null, whatsappNumber: editForm.whatsappNumber || null,
        notes: editForm.notes || null,
        nextFollowUpAt: editForm.nextFollowUpAt ? new Date(editForm.nextFollowUpAt).toISOString() : null,
      }));
      setEditing(false);
    });
  }

  function handleAddActivity() {
    if (!actContent.trim()) { setActError("El contenido es requerido"); return; }
    setActError(null);
    startTransition(async () => {
      const res = await addLeadActivity({ leadId: lead.id, type: actType, content: actContent });
      if ("error" in res && res.error) { setActError(res.error); return; }
      setActContent("");
      // Reload activities
      const r = await fetch(`/api/admin/crm/activities?leadId=${lead.id}`);
      const d = await r.json();
      if (d.activities) setActivities(d.activities);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteLead(lead.id);
      onClose();
    });
  }

  const activityIcons: Record<string, React.ReactNode> = {
    NOTE:         <FileText size={12} className="text-[#8E7A6B]" />,
    CALL:         <Phone size={12} className="text-blue-500" />,
    EMAIL:        <Mail size={12} className="text-purple-500" />,
    WHATSAPP:     <MessageCircle size={12} className="text-green-500" />,
    STAGE_CHANGE: <ArrowRight size={12} className="text-[#CDA78F]" />,
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded border border-[#D8BFAE] w-full max-w-xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-[#D8BFAE] shrink-0">
          <div>
            <h2 className="text-sm font-medium text-[#5C4A3E]">{lead.name}</h2>
            <div className="mt-1">
              <StageDropdown current={lead.stage} onSelect={handleStageChange} disabled={isPending} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/admin/crm/${lead.id}`)}
              className="text-[#8E7A6B] hover:text-[#5C4A3E] p-1"
              title="Ver detalle completo"
            >
              <Eye size={14} />
            </button>
            <button onClick={onClose} className="text-[#8E7A6B] hover:text-[#5C4A3E] p-1">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#D8BFAE] shrink-0">
          {(["info", "activity"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-[10px] tracking-[0.12em] uppercase font-medium transition-colors ${
                tab === t ? "border-b-2 border-[#CDA78F] text-[#5C4A3E]" : "text-[#8E7A6B] hover:text-[#5C4A3E]"
              }`}
            >
              {t === "info" ? "Información" : "Actividad"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded mb-3">{error}</p>}

          {tab === "info" && (
            <div className="space-y-4">
              {!editing ? (
                <>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-0.5">Email</p>
                      <p className="text-[#5C4A3E]">{lead.email ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-0.5">Teléfono</p>
                      <p className="text-[#5C4A3E]">{lead.phone ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-0.5">WhatsApp</p>
                      <p className="text-[#5C4A3E]">{lead.whatsappNumber ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-0.5">Fuente</p>
                      <p className="text-[#5C4A3E]">{SOURCE_LABELS[lead.source] ?? lead.source}</p>
                    </div>
                    <div>
                      <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-0.5">Próx. seguimiento</p>
                      <p className="text-[#5C4A3E]">{fmtDate(lead.nextFollowUpAt)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-0.5">Creado</p>
                      <p className="text-[#5C4A3E]">{fmtDate(lead.createdAt)}</p>
                    </div>
                  </div>
                  {lead.landingPage && (
                    <div>
                      <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-0.5">Landing page</p>
                      <p className="text-xs text-[#5C4A3E]">{lead.landingPage}</p>
                    </div>
                  )}
                  {lead.tags.length > 0 && (
                    <div>
                      <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-1">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {lead.tags.map((t) => (
                          <span key={t} className="px-2 py-0.5 bg-[#EDE2D8] text-[#5C4A3E] rounded-full text-[10px]">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {lead.notes && (
                    <div>
                      <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-1">Notas</p>
                      <p className="text-xs text-[#5C4A3E] bg-[#F7F4F1] rounded p-3 whitespace-pre-wrap">{lead.notes}</p>
                    </div>
                  )}
                  <button
                    onClick={() => setEditing(true)}
                    className="text-[10px] tracking-[0.08em] uppercase text-[#CDA78F] hover:text-[#5C4A3E]"
                  >
                    Editar información
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] block mb-1">Nombre</label>
                    <input
                      value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] block mb-1">Email</label>
                      <input
                        value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                        className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F]"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] block mb-1">Teléfono</label>
                      <input
                        value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                        className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] block mb-1">WhatsApp</label>
                    <input
                      value={editForm.whatsappNumber} onChange={(e) => setEditForm((f) => ({ ...f, whatsappNumber: e.target.value }))}
                      className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] block mb-1">Próximo seguimiento</label>
                    <input
                      type="date" value={editForm.nextFollowUpAt}
                      onChange={(e) => setEditForm((f) => ({ ...f, nextFollowUpAt: e.target.value }))}
                      className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] block mb-1">Notas</label>
                    <textarea
                      value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                      rows={3}
                      className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F] resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditing(false)}
                      className="flex-1 border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#8E7A6B] hover:bg-[#F7F4F1]"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveEdit} disabled={isPending}
                      className="flex-1 bg-[#5C4A3E] text-white rounded px-3 py-2 text-xs hover:bg-[#4a3a30] disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {isPending && <Loader2 size={12} className="animate-spin" />}
                      Guardar
                    </button>
                  </div>
                </div>
              )}

              {/* Delete */}
              <div className="border-t border-[#D8BFAE] pt-4 mt-4">
                {!deleteConfirm ? (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={12} /> Eliminar lead
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-500">¿Confirmar eliminación?</span>
                    <button onClick={handleDelete} disabled={isPending}
                      className="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      Sí, eliminar
                    </button>
                    <button onClick={() => setDeleteConfirm(false)} className="text-xs text-[#8E7A6B] hover:text-[#5C4A3E]">
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "activity" && (
            <div className="space-y-4">
              {/* Add activity form */}
              <div className="border border-[#D8BFAE] rounded p-3 space-y-2">
                <div className="flex gap-2">
                  <select
                    value={actType} onChange={(e) => setActType(e.target.value)}
                    className="border border-[#D8BFAE] rounded px-2 py-1.5 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F] bg-white"
                  >
                    {Object.entries(ACTIVITY_TYPE_LABELS)
                      .filter(([k]) => k !== "STAGE_CHANGE")
                      .map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                  </select>
                </div>
                <textarea
                  value={actContent} onChange={(e) => setActContent(e.target.value)}
                  placeholder="Escribe una nota, registro de llamada, etc..."
                  rows={2}
                  className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F] resize-none"
                />
                {actError && <p className="text-xs text-red-500">{actError}</p>}
                <button
                  onClick={handleAddActivity} disabled={isPending}
                  className="w-full bg-[#CDA78F] text-white rounded px-3 py-1.5 text-xs hover:bg-[#b8906d] disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {isPending && <Loader2 size={12} className="animate-spin" />}
                  Registrar actividad
                </button>
              </div>

              {/* Activity list */}
              {loadingAct ? (
                <div className="flex justify-center py-4">
                  <Loader2 size={16} className="animate-spin text-[#8E7A6B]" />
                </div>
              ) : activities.length === 0 ? (
                <p className="text-xs text-[#8E7A6B] text-center py-4">Sin actividades registradas</p>
              ) : (
                <div className="space-y-2">
                  {activities.map((a) => (
                    <div key={a.id} className="flex gap-2.5 text-xs">
                      <div className="mt-0.5 shrink-0">
                        {activityIcons[a.type] ?? <Activity size={12} className="text-[#8E7A6B]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-[#5C4A3E]">{ACTIVITY_TYPE_LABELS[a.type] ?? a.type}</span>
                          <span className="text-[10px] text-[#8E7A6B]">{fmtDate(a.createdAt)}</span>
                          <span className="text-[10px] text-[#8E7A6B]">· {a.adminName}</span>
                        </div>
                        <p className="text-[#5C4A3E] whitespace-pre-wrap">{a.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Table View ─────────────────────────────────────────────────

function TableView({
  leads, onOpenLead, onStageChange, isPending,
}: {
  leads: Lead[];
  onOpenLead: (l: Lead) => void;
  onStageChange: (id: string, stage: string) => void;
  isPending: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#D8BFAE]">
            {["Nombre", "Contacto", "Etapa", "Fuente", "Landing page", "Próx. seguimiento", "Actividad", "Creado"].map((h) => (
              <th key={h} className="text-left px-4 py-2.5 text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center py-10 text-[#8E7A6B]">Sin leads</td>
            </tr>
          ) : (
            leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => onOpenLead(lead)}
                className="border-b border-[#D8BFAE]/50 hover:bg-[#F7F4F1] cursor-pointer"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-[#5C4A3E]">{lead.name}</p>
                  {lead.tags.length > 0 && (
                    <div className="flex gap-1 mt-0.5">
                      {lead.tags.slice(0, 2).map((t) => (
                        <span key={t} className="px-1.5 py-0.5 bg-[#EDE2D8] text-[#8E7A6B] rounded text-[9px]">{t}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-[#8E7A6B]">
                  <div className="space-y-0.5">
                    {lead.phone && <p className="flex items-center gap-1"><Phone size={10} />{lead.phone}</p>}
                    {lead.email && <p className="flex items-center gap-1"><Mail size={10} />{lead.email}</p>}
                  </div>
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <StageDropdown current={lead.stage} onSelect={(s) => onStageChange(lead.id, s)} disabled={isPending} />
                </td>
                <td className="px-4 py-3 text-[#8E7A6B]">{SOURCE_LABELS[lead.source] ?? lead.source}</td>
                <td className="px-4 py-3 text-[#8E7A6B]">{lead.landingPage ?? "—"}</td>
                <td className="px-4 py-3 text-[#8E7A6B]">
                  {lead.nextFollowUpAt ? (
                    <span className="flex items-center gap-1"><Calendar size={10} />{fmtDate(lead.nextFollowUpAt)}</span>
                  ) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-[#8E7A6B]">
                    <Activity size={10} />{lead.activityCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#8E7A6B] whitespace-nowrap">{fmtDate(lead.createdAt)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Kanban View ────────────────────────────────────────────────

function KanbanView({
  leads, onOpenLead,
}: {
  leads: Lead[];
  onOpenLead: (l: Lead) => void;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4 px-4 pt-2">
      {PIPELINE_STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => l.stage === stage.key);
        return (
          <div key={stage.key} className="shrink-0 w-56">
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
              <span className="text-[10px] tracking-[0.1em] uppercase font-medium text-[#5C4A3E]">{stage.label}</span>
              <span className="ml-auto text-[10px] text-[#8E7A6B] bg-[#EDE2D8] rounded-full px-1.5 py-0.5">
                {stageLeads.length}
              </span>
            </div>
            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-220px)]">
              {stageLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => onOpenLead(lead)}
                  className="bg-white border border-[#D8BFAE] rounded p-3 cursor-pointer hover:border-[#CDA78F] hover:shadow-sm transition-all"
                >
                  <p className="text-xs font-medium text-[#5C4A3E] mb-1 leading-tight">{lead.name}</p>
                  {lead.phone && (
                    <p className="text-[10px] text-[#8E7A6B] flex items-center gap-1">
                      <Phone size={9} />{lead.phone}
                    </p>
                  )}
                  {lead.email && (
                    <p className="text-[10px] text-[#8E7A6B] flex items-center gap-1 truncate">
                      <Mail size={9} />{lead.email}
                    </p>
                  )}
                  {lead.landingPage && (
                    <p className="text-[9px] text-[#CDA78F] flex items-center gap-1 mt-1 truncate">
                      <LayoutList size={8} />
                      {lead.landingPage}
                    </p>
                  )}
                  {lead.tags.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {lead.tags.slice(0, 2).map((t) => (
                        <span key={t} className="px-1.5 py-0.5 bg-[#EDE2D8] text-[#8E7A6B] rounded text-[9px]">{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#D8BFAE]/50">
                    <span className="text-[9px] text-[#8E7A6B]">{fmtDate(lead.createdAt)}</span>
                    <span className="text-[9px] text-[#8E7A6B] flex items-center gap-0.5">
                      <Activity size={9} />{lead.activityCount}
                    </span>
                  </div>
                </div>
              ))}
              {stageLeads.length === 0 && (
                <div className="border-2 border-dashed border-[#D8BFAE] rounded p-3 text-center">
                  <p className="text-[10px] text-[#8E7A6B]">Sin leads</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export default function CRMClient({
  leads: initialLeads, admins, initialView, initialStage, initialQ,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<"table" | "kanban">(initialView);
  const [q, setQ] = useState(initialQ);
  const [stageFilter, setStageFilter] = useState(initialStage);
  const [leads, setLeads] = useState(initialLeads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // Sync leads from server on filter change
  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  const applyFilters = useCallback(
    (newQ: string, newStage: string, newView: "table" | "kanban") => {
      const params = new URLSearchParams(searchParams.toString());
      if (newQ) params.set("q", newQ); else params.delete("q");
      if (newStage) params.set("stage", newStage); else params.delete("stage");
      params.set("view", newView);
      startTransition(() => {
        router.push(`/admin/crm?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  function handleViewChange(v: "table" | "kanban") {
    setView(v);
    applyFilters(q, stageFilter, v);
  }

  function handleSearch(val: string) {
    setQ(val);
    applyFilters(val, stageFilter, view);
  }

  function handleStageFilter(val: string) {
    setStageFilter(val);
    applyFilters(q, val, view);
  }

  function handleStageChange(id: string, stage: string) {
    startTransition(async () => {
      await updateLeadStage(id, stage);
      setLeads((ls) => ls.map((l) => l.id === id ? { ...l, stage } : l));
    });
  }

  const totalByStage = PIPELINE_STAGES.reduce((acc, s) => {
    acc[s.key] = initialLeads.filter((l) => l.stage === s.key).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col h-full bg-[#F7F4F1]">
      {/* Stats row */}
      <div className="px-6 pt-4 pb-2 flex gap-2 overflow-x-auto shrink-0">
        {PIPELINE_STAGES.map((s) => (
          <button
            key={s.key}
            onClick={() => handleStageFilter(stageFilter === s.key ? "" : s.key)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded border text-[10px] transition-all ${
              stageFilter === s.key
                ? "border-[#CDA78F] bg-[#CDA78F]/10 text-[#5C4A3E] font-medium"
                : "border-[#D8BFAE] bg-white text-[#8E7A6B] hover:border-[#CDA78F]"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
            <span className="ml-1 font-medium text-[#5C4A3E]">{totalByStage[s.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 flex items-center gap-3 border-b border-[#D8BFAE] bg-white shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E7A6B]" />
          <input
            value={q}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar leads..."
            className="w-full pl-8 pr-3 py-2 text-xs border border-[#D8BFAE] rounded focus:outline-none focus:border-[#CDA78F] bg-[#F7F4F1]"
          />
          {q && (
            <button onClick={() => handleSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B]">
              <X size={12} />
            </button>
          )}
        </div>

        {isPending && <Loader2 size={14} className="animate-spin text-[#8E7A6B]" />}

        <div className="ml-auto flex items-center gap-2">
          {/* View toggle */}
          <div className="flex border border-[#D8BFAE] rounded overflow-hidden">
            <button
              onClick={() => handleViewChange("table")}
              className={`px-2.5 py-1.5 ${view === "table" ? "bg-[#5C4A3E] text-white" : "text-[#8E7A6B] hover:bg-[#F7F4F1]"}`}
            >
              <LayoutList size={13} />
            </button>
            <button
              onClick={() => handleViewChange("kanban")}
              className={`px-2.5 py-1.5 ${view === "kanban" ? "bg-[#5C4A3E] text-white" : "text-[#8E7A6B] hover:bg-[#F7F4F1]"}`}
            >
              <Columns2 size={13} />
            </button>
          </div>

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 bg-[#5C4A3E] text-white px-3 py-1.5 rounded text-xs hover:bg-[#4a3a30] transition-colors"
          >
            <Plus size={13} />
            Nuevo lead
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === "table" ? (
          <div className="overflow-auto h-full bg-white">
            <TableView
              leads={leads}
              onOpenLead={setSelectedLead}
              onStageChange={handleStageChange}
              isPending={isPending}
            />
          </div>
        ) : (
          <KanbanView leads={leads} onOpenLead={setSelectedLead} />
        )}
      </div>

      {/* Modals */}
      {showNewModal && (
        <NewLeadModal onClose={() => setShowNewModal(false)} admins={admins} />
      )}
      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          admins={admins}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}
