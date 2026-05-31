"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Check, X, ArrowLeft,
  Pencil, ExternalLink, Users, Calendar, MapPin,
  CheckCircle2, XCircle, AlertCircle, Download, UserPlus, Clock,
} from "lucide-react";
import {
  confirmTransferPayment,
  cancelRegistration,
  markAttended,
} from "@/app/actions/admin/events";
import { registerForEvent } from "@/app/actions/public/registerEvent";
import type { EventConfig } from "@/lib/crm";

type Registration = {
  id:            string;
  ticketCode:    string;
  name:          string;
  email:         string;
  phone:         string | null;
  whatsapp:      string | null;
  ticketMode:    string;
  paymentMethod: string | null;
  paymentStatus: string;
  amount:        number;
  paymentNotes:  string | null;
  attended:      boolean;
  attendedAt:    string | null;
  createdAt:     string;
};

interface Props {
  event: {
    id:       string;
    title:    string;
    slug:     string;
    isActive: boolean;
    config:   EventConfig;
  };
  registrations: Registration[];
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  CONFIRMED:        { label: "Confirmado",        color: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 size={11} /> },
  PAID:             { label: "Pagado",             color: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 size={11} /> },
  PENDING_TRANSFER: { label: "Pago pendiente",    color: "bg-amber-100  text-amber-700",    icon: <AlertCircle  size={11} /> },
  PENDING_GATEWAY:  { label: "Pendiente pasarela",color: "bg-blue-100   text-blue-700",     icon: <Clock        size={11} /> },
  CANCELLED:        { label: "Cancelado",          color: "bg-red-100    text-red-600",      icon: <XCircle      size={11} /> },
};

const METHOD_LABELS: Record<string, string> = {
  transfer:    "Transferencia",
  mercadoPago: "MercadoPago",
  flowPay:     "Flow",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtMoney(n: number) {
  return `$${n.toLocaleString("es-CL")}`;
}

function fmtEventDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function AsistentesClient({ event, registrations: initialRegs }: Props) {
  const router = useRouter();
  const [regs, setRegs]             = useState(initialRegs);
  const [search, setSearch]         = useState("");
  const [filterStatus, setStatus]   = useState("ALL");
  const [isPending, start]          = useTransition();
  const [error, setError]           = useState("");
  const [detailId, setDetailId]     = useState<string | null>(null);

  const cfg = event.config;

  // Manual registration modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName]     = useState("");
  const [addEmail, setAddEmail]   = useState("");
  const [addPhone, setAddPhone]   = useState("");
  const [addWhatsapp, setAddWhatsapp] = useState("");
  const [addPayMethod, setAddPayMethod] = useState(cfg.enabledPayments[0] ?? "transfer");
  const [addSelectedDays, setAddSelectedDays] = useState<string[]>([]);
  const [addError, setAddError]   = useState("");
  const [addPending, startAdd]    = useTransition();

  function resetAddForm() {
    setAddName(""); setAddEmail(""); setAddPhone(""); setAddWhatsapp("");
    setAddPayMethod(cfg.enabledPayments[0] ?? "transfer");
    setAddSelectedDays([]); setAddError("");
  }

  function handleAddRegistration(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    if (cfg.collectName && !addName.trim())   { setAddError("El nombre es requerido."); return; }
    if (cfg.requireEmail && !addEmail.trim()) { setAddError("El email es requerido."); return; }
    if (cfg.requirePhone && !addPhone.trim()) { setAddError("El teléfono es requerido."); return; }
    if (cfg.ticketMode === "PAID_BY_DAY" && addSelectedDays.length === 0) {
      setAddError("Selecciona al menos un día."); return;
    }

    startAdd(async () => {
      const res = await registerForEvent({
        landingPageId: event.id,
        name:          addName.trim(),
        email:         addEmail.trim(),
        phone:         addPhone.trim() || undefined,
        whatsapp:      addWhatsapp.trim() || undefined,
        paymentMethod: (cfg.ticketMode === "PAID" || cfg.ticketMode === "PAID_BY_DAY") ? addPayMethod : undefined,
        selectedDays:  cfg.ticketMode === "PAID_BY_DAY" ? addSelectedDays : undefined,
      });
      if ("error" in res && res.error) { setAddError(res.error); return; }
      if ("success" in res && res.success) {
        // Optimistically add to list; page will re-fetch on next load for full data
        setRegs((prev) => [{
          id:            crypto.randomUUID(),
          ticketCode:    res.ticketCode,
          name:          addName.trim(),
          email:         addEmail.trim(),
          phone:         addPhone.trim() || null,
          whatsapp:      addWhatsapp.trim() || null,
          ticketMode:    cfg.ticketMode === "FREE" ? "FREE" : cfg.ticketMode === "PAID_BY_DAY" ? "PAID_BY_DAY" : "PAID",
          paymentMethod: (cfg.ticketMode === "PAID" || cfg.ticketMode === "PAID_BY_DAY") ? addPayMethod : null,
          paymentStatus: res.paymentStatus,
          amount:        cfg.ticketMode === "PAID_BY_DAY"
            ? cfg.dayTickets.filter((d) => addSelectedDays.includes(d.date)).reduce((s, d) => s + d.price, 0)
            : cfg.ticketMode === "FREE" ? 0 : cfg.ticketPrice,
          paymentNotes:  cfg.ticketMode === "PAID_BY_DAY"
            ? `Días: ${cfg.dayTickets.filter((d) => addSelectedDays.includes(d.date)).map((d) => d.label || d.date).join(", ")}`
            : null,
          attended:      false,
          attendedAt:    null,
          createdAt:     new Date().toISOString(),
        }, ...prev]);
        resetAddForm();
        setShowAddModal(false);
      }
    });
  }

  // Filter + search
  const filtered = useMemo(() => {
    return regs.filter((r) => {
      const matchSearch = !search || [r.name, r.email, r.ticketCode, r.phone ?? ""].some(
        (f) => f.toLowerCase().includes(search.toLowerCase())
      );
      const matchStatus =
        filterStatus === "ALL" ||
        (filterStatus === "PENDING"   && ["PENDING_TRANSFER", "PENDING_GATEWAY"].includes(r.paymentStatus)) ||
        (filterStatus === "CONFIRMED" && ["CONFIRMED", "PAID"].includes(r.paymentStatus)) ||
        (filterStatus === "ATTENDED"  && r.attended) ||
        (filterStatus === "CANCELLED" && r.paymentStatus === "CANCELLED");
      return matchSearch && matchStatus;
    });
  }, [regs, search, filterStatus]);

  // Stats
  const stats = useMemo(() => ({
    total:     regs.length,
    confirmed: regs.filter((r) => ["CONFIRMED", "PAID"].includes(r.paymentStatus)).length,
    pending:   regs.filter((r) => ["PENDING_TRANSFER", "PENDING_GATEWAY"].includes(r.paymentStatus)).length,
    attended:  regs.filter((r) => r.attended).length,
    revenue:   regs.filter((r) => ["CONFIRMED", "PAID"].includes(r.paymentStatus)).reduce((s, r) => s + r.amount, 0),
  }), [regs]);

  function handleConfirmTransfer(id: string) {
    setError("");
    start(async () => {
      const res = await confirmTransferPayment(id);
      if (res.error) { setError(res.error); return; }
      setRegs((r) => r.map((x) => x.id === id ? { ...x, paymentStatus: "PAID" } : x));
    });
  }

  function handleCancel(id: string) {
    setError("");
    start(async () => {
      const res = await cancelRegistration(id);
      if (res.error) { setError(res.error); return; }
      setRegs((r) => r.map((x) => x.id === id ? { ...x, paymentStatus: "CANCELLED" } : x));
    });
  }

  function handleAttended(id: string, current: boolean) {
    start(async () => {
      await markAttended(id, !current);
      setRegs((r) => r.map((x) => x.id === id ? { ...x, attended: !current } : x));
    });
  }

  function exportCSV() {
    const headers = ["Código","Nombre","Email","Teléfono","Estado","Método","Monto","Asistió","Registro"];
    const rows = regs.map((r) => [
      r.ticketCode, r.name, r.email, r.phone ?? "",
      r.paymentStatus, r.paymentMethod ?? "GRATIS",
      r.amount, r.attended ? "Sí" : "No",
      new Date(r.createdAt).toLocaleDateString("es-CL"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asistentes-${event.slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const detail = detailId ? regs.find((r) => r.id === detailId) ?? null : null;

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Back + Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.push("/admin/eventos")}
          className="mt-1 text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-heading text-2xl text-[#5C4A3E] tracking-wide">{event.title}</h1>
            <span className={`text-[9px] tracking-[0.12em] uppercase px-2 py-0.5 ${
              event.isActive ? "bg-emerald-100 text-emerald-700" : "bg-[#EDE2D8] text-[#8E7A6B]"
            }`}>
              {event.isActive ? "Activo" : "Inactivo"}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            {cfg.eventDate && (
              <span className="flex items-center gap-1.5 text-[10px] text-[#8E7A6B]">
                <Calendar size={11} strokeWidth={1.5} />
                {fmtEventDate(cfg.eventDate)} {cfg.eventTime && `· ${cfg.eventTime}`}
              </span>
            )}
            {cfg.eventLocation && (
              <span className="flex items-center gap-1.5 text-[10px] text-[#8E7A6B]">
                <MapPin size={11} strokeWidth={1.5} />
                {cfg.eventLocation}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => router.push(`/admin/eventos/${event.id}/editar`)}
            className="flex items-center gap-1.5 border border-[#D8BFAE] text-[10px] tracking-[0.12em] uppercase text-[#8E7A6B] px-3 py-2 hover:border-[#CDA78F] transition-colors"
          >
            <Pencil size={12} strokeWidth={1.5} />
            Editar evento
          </button>
          <a
            href={`/lp/${event.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 border border-[#D8BFAE] text-[10px] tracking-[0.12em] uppercase text-[#8E7A6B] px-3 py-2 hover:border-[#CDA78F] transition-colors"
          >
            <ExternalLink size={12} strokeWidth={1.5} />
            Ver landing
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total,     color: "text-[#5C4A3E]" },
          { label: "Confirmados", value: stats.confirmed, color: "text-emerald-700" },
          { label: "Pendientes", value: stats.pending,   color: "text-amber-700" },
          { label: "Asistentes", value: stats.attended,  color: "text-[#5C4A3E]" },
          { label: "Recaudado",  value: cfg.ticketMode === "FREE" ? "Gratis" : fmtMoney(stats.revenue),  color: "text-[#5C4A3E]" },
        ].map((s) => (
          <div key={s.label} className="bg-[#F7F4F1] border border-[#D8BFAE] px-4 py-3 text-center">
            <p className={`text-xl font-medium ${s.color}`}>{s.value}</p>
            <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {error && <p className="text-[10px] text-red-500 bg-red-50 border border-red-200 px-3 py-2">{error}</p>}

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2.5 w-64">
          <Search size={13} strokeWidth={1.5} className="text-[#8E7A6B]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nombre, email, código…"
            className="bg-transparent text-xs text-[#5C4A3E] placeholder:text-[#8E7A6B] outline-none w-full"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {[
            { key: "ALL",       label: "Todos" },
            { key: "CONFIRMED", label: "Confirmados" },
            { key: "PENDING",   label: "Pendientes" },
            { key: "ATTENDED",  label: "Asistentes" },
            { key: "CANCELLED", label: "Cancelados" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={`text-[10px] tracking-[0.1em] uppercase px-3 py-2 transition-colors ${
                filterStatus === f.key
                  ? "bg-[#CDA78F] text-white"
                  : "bg-[#F7F4F1] border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 border border-[#D8BFAE] text-[10px] tracking-[0.12em] uppercase text-[#8E7A6B] px-3 py-2.5 hover:border-[#CDA78F] transition-colors"
          >
            <Download size={12} strokeWidth={1.5} />
            Exportar CSV
          </button>
          <button
            onClick={() => { resetAddForm(); setShowAddModal(true); }}
            className="flex items-center gap-1.5 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[10px] tracking-[0.12em] uppercase px-3 py-2.5 transition-colors"
          >
            <UserPlus size={12} strokeWidth={1.5} />
            Agregar asistente
          </button>
        </div>
      </div>

      {/* Add registration modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#D8BFAE] shrink-0">
              <h2 className="text-sm font-semibold text-[#5C4A3E]">Agregar asistente manualmente</h2>
              <button onClick={() => setShowAddModal(false)} className="text-[#8E7A6B] hover:text-[#5C4A3E]">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddRegistration} className="flex-1 overflow-y-auto p-5 space-y-3">
              {cfg.collectName && (
                <div>
                  <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] block mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                  />
                </div>
              )}
              {cfg.collectEmail && (
                <div>
                  <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] block mb-1">
                    Email {cfg.requireEmail && "*"}
                  </label>
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                  />
                </div>
              )}
              {cfg.collectPhone && (
                <div>
                  <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] block mb-1">
                    Teléfono {cfg.requirePhone && "*"}
                  </label>
                  <input
                    type="tel"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                  />
                </div>
              )}
              {cfg.collectWhatsapp && (
                <div>
                  <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] block mb-1">WhatsApp</label>
                  <input
                    type="tel"
                    value={addWhatsapp}
                    onChange={(e) => setAddWhatsapp(e.target.value)}
                    placeholder="+56 9 1234 5678"
                    className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                  />
                </div>
              )}

              {/* Day selector for PAID_BY_DAY */}
              {cfg.ticketMode === "PAID_BY_DAY" && cfg.dayTickets.length > 0 && (
                <div>
                  <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] block mb-1">Días *</label>
                  <div className="space-y-1.5">
                    {cfg.dayTickets.map((day) => (
                      <label key={day.date} className="flex items-center justify-between gap-2 border border-[#D8BFAE] px-3 py-2 cursor-pointer hover:border-[#CDA78F]">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={addSelectedDays.includes(day.date)}
                            onChange={(e) => setAddSelectedDays(
                              e.target.checked
                                ? [...addSelectedDays, day.date]
                                : addSelectedDays.filter((d) => d !== day.date)
                            )}
                            className="w-3.5 h-3.5 accent-[#CDA78F]"
                          />
                          <span className="text-xs text-[#5C4A3E]">{day.label || day.date}</span>
                        </div>
                        <span className="text-xs font-medium text-[#CDA78F]">${day.price.toLocaleString("es-CL")}</span>
                      </label>
                    ))}
                  </div>
                  {addSelectedDays.length > 0 && (
                    <div className="mt-2 flex justify-between text-xs border-t border-[#EDE2D8] pt-2">
                      <span className="text-[#8E7A6B]">Total</span>
                      <span className="font-medium text-[#CDA78F]">
                        ${cfg.dayTickets.filter((d) => addSelectedDays.includes(d.date)).reduce((s, d) => s + d.price, 0).toLocaleString("es-CL")} CLP
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Payment method */}
              {(cfg.ticketMode === "PAID" || (cfg.ticketMode === "PAID_BY_DAY" && addSelectedDays.length > 0)) && cfg.enabledPayments.length > 0 && (
                <div>
                  <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] block mb-1">Método de pago</label>
                  <select
                    value={addPayMethod}
                    onChange={(e) => setAddPayMethod(e.target.value)}
                    className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                  >
                    {cfg.enabledPayments.map((m) => (
                      <option key={m} value={m}>
                        {m === "transfer" ? "Transferencia bancaria" : m === "mercadoPago" ? "MercadoPago" : "Flow Pay"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {cfg.ticketMode === "FREE" && (
                <p className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-2">
                  Entrada gratuita — se confirmará automáticamente.
                </p>
              )}

              {addError && (
                <p className="text-[10px] text-red-500 bg-red-50 border border-red-200 px-3 py-2">{addError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-[#D8BFAE] text-[10px] tracking-[0.12em] uppercase text-[#8E7A6B] py-2.5 hover:border-[#CDA78F] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addPending}
                  className="flex-1 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[10px] tracking-[0.12em] uppercase py-2.5 transition-colors disabled:opacity-50"
                >
                  {addPending ? "Registrando…" : "Registrar asistente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#F7F4F1] border border-[#D8BFAE] overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#8E7A6B]">
            {regs.length === 0 ? "Sin registros aún" : "Sin resultados para este filtro"}
          </div>
        ) : (
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-[#D8BFAE] bg-[#EDE2D8]/40">
                {["Código", "Nombre", "Contacto", "Estado pago", "Monto", "Asistió", "Registro", "Acciones"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDE2D8]">
              {filtered.map((r) => {
                const statusMeta = STATUS_META[r.paymentStatus] ?? { label: r.paymentStatus, color: "bg-[#EDE2D8] text-[#8E7A6B]", icon: null };
                return (
                  <tr key={r.id} className={`transition-colors hover:bg-[#EDE2D8]/20 ${r.paymentStatus === "CANCELLED" ? "opacity-50" : ""}`}>
                    {/* Code */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-[#5C4A3E] bg-[#EDE2D8] px-1.5 py-0.5 tracking-wider">
                          {r.ticketCode}
                        </span>
                        <a
                          href={`/lp/${event.slug}/ticket/${r.ticketCode}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Ver entrada"
                          className="text-[#8E7A6B] hover:text-[#CDA78F]"
                        >
                          <ExternalLink size={10} strokeWidth={1.5} />
                        </a>
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <p className="text-xs text-[#5C4A3E] font-medium">{r.name}</p>
                      {r.ticketMode === "FREE"
                        ? <span className="text-[9px] text-emerald-600">Entrada gratis</span>
                        : <span className="text-[9px] text-[#8E7A6B]">{METHOD_LABELS[r.paymentMethod ?? ""] ?? r.paymentMethod ?? ""}</span>}
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <p className="text-[10px] text-[#8E7A6B]">{r.email}</p>
                      {r.phone && <p className="text-[10px] text-[#8E7A6B]">{r.phone}</p>}
                    </td>

                    {/* Payment status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[9px] tracking-[0.08em] uppercase px-2 py-0.5 ${statusMeta.color}`}>
                        {statusMeta.icon}
                        {statusMeta.label}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 text-xs text-[#5C4A3E]">
                      {r.amount > 0 ? fmtMoney(r.amount) : "—"}
                    </td>

                    {/* Attended */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleAttended(r.id, r.attended)}
                        disabled={isPending || r.paymentStatus === "CANCELLED"}
                        className={`w-7 h-7 flex items-center justify-center transition-colors ${
                          r.attended
                            ? "bg-emerald-500 text-white hover:bg-emerald-600"
                            : "bg-[#EDE2D8] text-[#8E7A6B] hover:bg-[#D8BFAE]"
                        }`}
                      >
                        <Check size={13} strokeWidth={2} />
                      </button>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-[10px] text-[#8E7A6B] whitespace-nowrap">
                      {fmtDate(r.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {(r.paymentStatus === "PENDING_TRANSFER" || r.paymentStatus === "PENDING_GATEWAY") && (
                          <button
                            onClick={() => handleConfirmTransfer(r.id)}
                            disabled={isPending}
                            title={r.paymentStatus === "PENDING_GATEWAY" ? "Confirmar pago de pasarela" : "Confirmar pago por transferencia"}
                            className="text-[9px] uppercase tracking-wide bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 transition-colors"
                          >
                            Confirmar pago
                          </button>
                        )}
                        {!["CANCELLED"].includes(r.paymentStatus) && (
                          <button
                            onClick={() => handleCancel(r.id)}
                            disabled={isPending}
                            title="Cancelar registro"
                            className="text-[#8E7A6B] hover:text-red-500 transition-colors"
                          >
                            <X size={13} strokeWidth={1.5} />
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
        <div className="px-4 py-3 border-t border-[#D8BFAE]">
          <p className="text-[10px] text-[#8E7A6B]">{filtered.length} de {regs.length} registros</p>
        </div>
      </div>
    </div>
  );
}
