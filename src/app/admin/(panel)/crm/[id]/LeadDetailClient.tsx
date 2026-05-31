"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, Phone, Mail, MessageCircle, FileText, Activity,
  ArrowRight, Loader2, Calendar, User, Tag, ChevronDown, Check,
  Globe, Pencil, X,
} from "lucide-react";
import { updateLead, updateLeadStage, addLeadActivity } from "@/app/actions/admin/crm";
import {
  PIPELINE_STAGES, SOURCE_LABELS, ACTIVITY_TYPE_LABELS,
} from "@/lib/crm";

// ── Types ──────────────────────────────────────────────────────

type Activity = {
  id: string; type: string; content: string;
  adminName: string; createdAt: string;
};

type Lead = {
  id: string; name: string; email: string | null; phone: string | null;
  whatsappNumber: string | null; source: string; stage: string;
  tags: string[]; notes: string | null; assignedToId: string | null;
  landingPage: { title: string; slug: string } | null;
  lastContactedAt: string | null; nextFollowUpAt: string | null;
  createdAt: string; activities: Activity[];
};

type Admin = { id: string; name: string };

interface Props { lead: Lead; admins: Admin[] }

// ── Helpers ───────────────────────────────────────────────────

function getStage(key: string) {
  return PIPELINE_STAGES.find((s) => s.key === key) ?? PIPELINE_STAGES[0];
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  NOTE:         <FileText size={14} className="text-[#8E7A6B]" />,
  CALL:         <Phone size={14} className="text-blue-500" />,
  EMAIL:        <Mail size={14} className="text-purple-500" />,
  WHATSAPP:     <MessageCircle size={14} className="text-green-500" />,
  STAGE_CHANGE: <ArrowRight size={14} className="text-[#CDA78F]" />,
};

// ── Stage Badge ───────────────────────────────────────────────

function StageBadge({ stage }: { stage: string }) {
  const s = getStage(stage);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>
      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ── Main ──────────────────────────────────────────────────────

export default function LeadDetailClient({ lead: initialLead, admins }: Props) {
  const [lead, setLead] = useState(initialLead);
  const [activities, setActivities] = useState(initialLead.activities);
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: lead.name, email: lead.email ?? "", phone: lead.phone ?? "",
    whatsappNumber: lead.whatsappNumber ?? "", notes: lead.notes ?? "",
    nextFollowUpAt: lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 10) : "",
    assignedToId: lead.assignedToId ?? "",
  });
  const [actType, setActType] = useState("NOTE");
  const [actContent, setActContent] = useState("");
  const [actError, setActError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stageOpen, setStageOpen] = useState(false);

  function handleStageChange(stage: string) {
    setStageOpen(false);
    startTransition(async () => {
      const res = await updateLeadStage(lead.id, stage);
      if ("error" in res && res.error) { setError(res.error); return; }
      const stageLabel = getStage(stage).label;
      setLead((l) => ({ ...l, stage }));
      setActivities((prev) => [{
        id: `tmp-${Date.now()}`,
        type: "STAGE_CHANGE",
        content: `Etapa cambiada a: ${stage}`,
        adminName: "Tú",
        createdAt: new Date().toISOString(),
      }, ...prev]);
      void stageLabel;
    });
  }

  function handleSaveEdit() {
    if (!editForm.name.trim()) { setError("El nombre es requerido"); return; }
    startTransition(async () => {
      const res = await updateLead(lead.id, {
        name: editForm.name, email: editForm.email || undefined,
        phone: editForm.phone || undefined,
        whatsappNumber: editForm.whatsappNumber || undefined,
        notes: editForm.notes || undefined,
        nextFollowUpAt: editForm.nextFollowUpAt || null,
        assignedToId: editForm.assignedToId || null,
      });
      if ("error" in res && res.error) { setError(res.error); return; }
      setLead((l) => ({
        ...l,
        name: editForm.name,
        email: editForm.email || null,
        phone: editForm.phone || null,
        whatsappNumber: editForm.whatsappNumber || null,
        notes: editForm.notes || null,
        nextFollowUpAt: editForm.nextFollowUpAt ? new Date(editForm.nextFollowUpAt).toISOString() : null,
        assignedToId: editForm.assignedToId || null,
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
      setActivities((prev) => [{
        id: `tmp-${Date.now()}`,
        type: actType,
        content: actContent,
        adminName: "Tú",
        createdAt: new Date().toISOString(),
      }, ...prev]);
      setActContent("");
    });
  }

  return (
    <div className="flex flex-col h-full bg-[#F7F4F1]">
      {/* Header */}
      <div className="bg-white border-b border-[#D8BFAE] px-6 py-4 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <Link
            href="/admin/crm"
            className="flex items-center gap-1.5 text-xs text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors"
          >
            <ArrowLeft size={13} />
            Volver al CRM
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-medium text-[#5C4A3E]">{lead.name}</h1>
            <StageBadge stage={lead.stage} />
          </div>
          <div className="flex items-center gap-2">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 border border-[#D8BFAE] rounded px-3 py-1.5 text-xs text-[#8E7A6B] hover:bg-[#F7F4F1] transition-colors"
              >
                <Pencil size={12} />
                Editar
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditing(false); setError(null); }}
                  className="flex items-center gap-1 border border-[#D8BFAE] rounded px-3 py-1.5 text-xs text-[#8E7A6B] hover:bg-[#F7F4F1]"
                >
                  <X size={12} /> Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isPending}
                  className="flex items-center gap-1 bg-[#5C4A3E] text-white rounded px-3 py-1.5 text-xs hover:bg-[#4a3a30] disabled:opacity-50"
                >
                  {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Guardar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Info + Activities */}
          <div className="lg:col-span-2 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-2 rounded">
                {error}
              </div>
            )}

            {/* Info Card */}
            <div className="bg-white border border-[#D8BFAE] rounded p-5">
              <h2 className="text-[9px] tracking-[0.15em] uppercase font-medium text-[#8E7A6B] mb-4">
                Información del lead
              </h2>
              {!editing ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
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
                  {lead.landingPage && (
                    <div className="col-span-2">
                      <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-0.5">Landing page</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[#5C4A3E]">{lead.landingPage.title}</p>
                        <a
                          href={`/lp/${lead.landingPage.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#CDA78F] hover:text-[#5C4A3E]"
                        >
                          <Globe size={12} />
                        </a>
                      </div>
                    </div>
                  )}
                  {lead.tags.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-1">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {lead.tags.map((t) => (
                          <span key={t} className="px-2 py-0.5 bg-[#EDE2D8] text-[#5C4A3E] rounded-full text-xs">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {lead.notes && (
                    <div className="col-span-2">
                      <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-1">Notas</p>
                      <p className="text-[#5C4A3E] bg-[#F7F4F1] rounded p-3 text-sm whitespace-pre-wrap">{lead.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] block mb-1">Nombre *</label>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-sm text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] block mb-1">Email</label>
                      <input
                        type="email" value={editForm.email}
                        onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                        className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-sm text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F]"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] block mb-1">Teléfono</label>
                      <input
                        value={editForm.phone}
                        onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                        className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-sm text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] block mb-1">WhatsApp</label>
                    <input
                      value={editForm.whatsappNumber}
                      onChange={(e) => setEditForm((f) => ({ ...f, whatsappNumber: e.target.value }))}
                      className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-sm text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] block mb-1">Notas</label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                      rows={4}
                      className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-sm text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F] resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Activities */}
            <div className="bg-white border border-[#D8BFAE] rounded p-5">
              <h2 className="text-[9px] tracking-[0.15em] uppercase font-medium text-[#8E7A6B] mb-4">
                Historial de actividad
              </h2>

              {/* Add activity */}
              <div className="border border-[#D8BFAE] rounded p-3 mb-5 space-y-2">
                <div className="flex gap-2">
                  <select
                    value={actType}
                    onChange={(e) => setActType(e.target.value)}
                    className="border border-[#D8BFAE] rounded px-3 py-1.5 text-xs text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F] bg-white"
                  >
                    {Object.entries(ACTIVITY_TYPE_LABELS)
                      .filter(([k]) => k !== "STAGE_CHANGE")
                      .map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                  </select>
                </div>
                <textarea
                  value={actContent}
                  onChange={(e) => setActContent(e.target.value)}
                  placeholder="Registra una nota, llamada, correo..."
                  rows={3}
                  className="w-full border border-[#D8BFAE] rounded px-3 py-2 text-sm text-[#5C4A3E] focus:outline-none focus:border-[#CDA78F] resize-none"
                />
                {actError && <p className="text-xs text-red-500">{actError}</p>}
                <button
                  onClick={handleAddActivity}
                  disabled={isPending}
                  className="flex items-center gap-1.5 bg-[#CDA78F] text-white rounded px-4 py-1.5 text-xs hover:bg-[#b8906d] disabled:opacity-50"
                >
                  {isPending && <Loader2 size={12} className="animate-spin" />}
                  Registrar
                </button>
              </div>

              {/* Activity list */}
              {activities.length === 0 ? (
                <p className="text-sm text-[#8E7A6B] text-center py-4">Sin actividades registradas</p>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[15px] top-0 bottom-0 w-px bg-[#D8BFAE]" />
                  <div className="space-y-4">
                    {activities.map((a) => (
                      <div key={a.id} className="flex gap-3 relative">
                        <div className="w-8 h-8 rounded-full bg-[#F7F4F1] border border-[#D8BFAE] flex items-center justify-center shrink-0 z-10">
                          {ACTIVITY_ICONS[a.type] ?? <Activity size={14} className="text-[#8E7A6B]" />}
                        </div>
                        <div className="flex-1 pt-1 pb-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-[#5C4A3E]">
                              {ACTIVITY_TYPE_LABELS[a.type] ?? a.type}
                            </span>
                            <span className="text-[10px] text-[#8E7A6B]">{fmtDateTime(a.createdAt)}</span>
                            <span className="text-[10px] text-[#8E7A6B]">· {a.adminName}</span>
                          </div>
                          <p className="text-sm text-[#5C4A3E] whitespace-pre-wrap">{a.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-4">
            {/* Stage */}
            <div className="bg-white border border-[#D8BFAE] rounded p-4">
              <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-2">Etapa del pipeline</p>
              <div className="relative">
                <button
                  onClick={() => setStageOpen((o) => !o)}
                  className="w-full flex items-center justify-between border border-[#D8BFAE] rounded px-3 py-2 text-sm text-[#5C4A3E] hover:border-[#CDA78F] bg-white"
                >
                  <StageBadge stage={lead.stage} />
                  <ChevronDown size={13} className="text-[#8E7A6B]" />
                </button>
                {stageOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-[#D8BFAE] rounded shadow-lg py-1">
                    {PIPELINE_STAGES.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => handleStageChange(s.key)}
                        disabled={isPending}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#F7F4F1] ${
                          lead.stage === s.key ? "font-medium" : ""
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                        {s.label}
                        {lead.stage === s.key && <Check size={10} className="ml-auto text-[#CDA78F]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Contact info */}
            <div className="bg-white border border-[#D8BFAE] rounded p-4 space-y-3">
              <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Contacto rápido</p>
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-sm text-[#5C4A3E] hover:text-[#CDA78F]">
                  <Phone size={13} className="text-[#8E7A6B]" />
                  {lead.phone}
                </a>
              )}
              {lead.whatsappNumber && (
                <a
                  href={`https://wa.me/${lead.whatsappNumber.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[#5C4A3E] hover:text-green-600"
                >
                  <MessageCircle size={13} className="text-green-500" />
                  {lead.whatsappNumber}
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm text-[#5C4A3E] hover:text-[#CDA78F]">
                  <Mail size={13} className="text-[#8E7A6B]" />
                  {lead.email}
                </a>
              )}
              {!lead.phone && !lead.whatsappNumber && !lead.email && (
                <p className="text-xs text-[#8E7A6B]">Sin datos de contacto</p>
              )}
            </div>

            {/* Meta */}
            <div className="bg-white border border-[#D8BFAE] rounded p-4 space-y-3">
              <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Detalles</p>
              <div>
                <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-0.5">Asignado a</p>
                {editing ? (
                  <select
                    value={editForm.assignedToId}
                    onChange={(e) => setEditForm((f) => ({ ...f, assignedToId: e.target.value }))}
                    className="w-full border border-[#D8BFAE] rounded px-2 py-1 text-xs text-[#5C4A3E] bg-white focus:outline-none"
                  >
                    <option value="">Sin asignar</option>
                    {admins.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-[#5C4A3E] flex items-center gap-1">
                    <User size={11} className="text-[#8E7A6B]" />
                    {admins.find((a) => a.id === lead.assignedToId)?.name ?? "Sin asignar"}
                  </p>
                )}
              </div>
              <div>
                <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-0.5">Próximo seguimiento</p>
                {editing ? (
                  <input
                    type="date"
                    value={editForm.nextFollowUpAt}
                    onChange={(e) => setEditForm((f) => ({ ...f, nextFollowUpAt: e.target.value }))}
                    className="w-full border border-[#D8BFAE] rounded px-2 py-1 text-xs text-[#5C4A3E] focus:outline-none"
                  />
                ) : (
                  <p className="text-xs text-[#5C4A3E] flex items-center gap-1">
                    <Calendar size={11} className="text-[#8E7A6B]" />
                    {fmtDate(lead.nextFollowUpAt)}
                  </p>
                )}
              </div>
              <div>
                <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-0.5">Último contacto</p>
                <p className="text-xs text-[#5C4A3E]">{fmtDate(lead.lastContactedAt)}</p>
              </div>
              <div>
                <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-0.5">Creado</p>
                <p className="text-xs text-[#5C4A3E]">{fmtDate(lead.createdAt)}</p>
              </div>
              <div>
                <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-0.5">Fuente</p>
                <p className="text-xs text-[#5C4A3E]">{SOURCE_LABELS[lead.source] ?? lead.source}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
