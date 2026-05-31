"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search, CheckCircle2, XCircle, AlertCircle, Clock,
  Check, X, Users, ExternalLink, Download, Pencil,
  ChevronDown, Filter,
} from "lucide-react";
import {
  confirmTransferPayment,
  cancelRegistration,
  markAttended,
} from "@/app/actions/admin/events";

type EventMeta = { id: string; title: string; slug: string };

type Registration = {
  id: string; ticketCode: string; name: string; email: string;
  phone: string | null; whatsapp: string | null;
  ticketMode: string; paymentMethod: string | null;
  paymentStatus: string; amount: number; paymentNotes: string | null;
  attended: boolean; attendedAt: string | null; createdAt: string;
  eventId: string; eventTitle: string; eventSlug: string;
};

interface Props {
  events:        EventMeta[];
  registrations: Registration[];
}

const STATUS_META: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  CONFIRMED:        { label: "Confirmado",    bg: "bg-emerald-100", text: "text-emerald-700", icon: <CheckCircle2 size={11} /> },
  PAID:             { label: "Pagado",         bg: "bg-emerald-100", text: "text-emerald-700", icon: <CheckCircle2 size={11} /> },
  PENDING_TRANSFER: { label: "Pago pendiente", bg: "bg-amber-100",  text: "text-amber-700",   icon: <AlertCircle  size={11} /> },
  CANCELLED:        { label: "Cancelado",      bg: "bg-red-100",    text: "text-red-600",      icon: <XCircle      size={11} /> },
};

const METHOD_LABELS: Record<string, string> = {
  transfer:    "Transferencia",
  mercadoPago: "MercadoPago",
  flowPay:     "Flow Pay",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function exportCSV(rows: Registration[]) {
  const cols = ["Evento","Código","Nombre","Email","Teléfono","Tipo","Método pago","Estado","Monto","Asistió","Fecha"];
  const lines = rows.map((r) => [
    r.eventTitle, r.ticketCode, r.name, r.email, r.phone ?? "",
    r.ticketMode, r.paymentMethod ?? "", r.paymentStatus,
    r.amount, r.attended ? "Sí" : "No", fmtDate(r.createdAt),
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [cols.join(","), ...lines].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "asistentes.csv"; a.click();
  URL.revokeObjectURL(url);
}

export default function EventosAdminClient({ events, registrations: initial }: Props) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [regs, setRegs] = useState(initial);
  const [eventFilter, setEventFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [attendedFilter, setAttendedFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = regs;
    if (eventFilter !== "ALL")   list = list.filter((r) => r.eventId === eventFilter);
    if (statusFilter !== "ALL")  list = list.filter((r) => r.paymentStatus === statusFilter);
    if (attendedFilter === "YES") list = list.filter((r) => r.attended);
    if (attendedFilter === "NO")  list = list.filter((r) => !r.attended && r.paymentStatus !== "CANCELLED");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.ticketCode.toLowerCase().includes(q) ||
        r.eventTitle.toLowerCase().includes(q)
      );
    }
    return list;
  }, [regs, eventFilter, statusFilter, attendedFilter, search]);

  const stats = useMemo(() => ({
    total:     regs.length,
    confirmed: regs.filter((r) => ["CONFIRMED","PAID"].includes(r.paymentStatus)).length,
    pending:   regs.filter((r) => r.paymentStatus === "PENDING_TRANSFER").length,
    attended:  regs.filter((r) => r.attended).length,
    revenue:   regs.filter((r) => ["CONFIRMED","PAID"].includes(r.paymentStatus)).reduce((s, r) => s + r.amount, 0),
  }), [regs]);

  function handleConfirm(id: string) {
    if (confirmId !== id) { setConfirmId(id); return; }
    start(async () => {
      await confirmTransferPayment(id);
      setRegs((rs) => rs.map((r) => r.id === id ? { ...r, paymentStatus: "PAID" } : r));
      setConfirmId(null);
    });
  }

  function handleCancel(id: string) {
    if (cancelId !== id) { setCancelId(id); return; }
    start(async () => {
      await cancelRegistration(id);
      setRegs((rs) => rs.map((r) => r.id === id ? { ...r, paymentStatus: "CANCELLED" } : r));
      setCancelId(null);
    });
  }

  function handleToggleAttended(id: string, current: boolean) {
    start(async () => {
      await markAttended(id, !current);
      setRegs((rs) => rs.map((r) => r.id === id ? { ...r, attended: !current } : r));
    });
  }

  return (
    <div className="flex flex-col h-full bg-[#F7F4F1]">

      {/* Header */}
      <div className="bg-white border-b border-[#D8BFAE] px-6 py-4 shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-heading text-xl text-[#5C4A3E] tracking-wide">Asistentes</h1>
            <p className="text-[10px] text-[#8E7A6B] mt-0.5">
              {events.length} evento{events.length !== 1 ? "s" : ""} · {regs.length} registros totales
            </p>
          </div>
          <button
            onClick={() => exportCSV(filtered)}
            className="flex items-center gap-1.5 border border-[#D8BFAE] text-[#8E7A6B] hover:text-[#5C4A3E] px-3 py-2 text-[10px] tracking-[0.1em] uppercase transition-colors"
          >
            <Download size={12} />
            Exportar CSV
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3 mt-4">
          {[
            { label: "Total",       value: stats.total },
            { label: "Confirmados", value: stats.confirmed, color: "text-emerald-600" },
            { label: "Pendientes",  value: stats.pending,   color: stats.pending > 0 ? "text-amber-600" : undefined },
            { label: "Asistieron",  value: stats.attended },
            { label: "Ingresos",    value: `$${stats.revenue.toLocaleString("es-CL")}` },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#F7F4F1] border border-[#EDE2D8] px-3 py-2 text-center">
              <p className={`text-base font-semibold ${color ?? "text-[#5C4A3E]"}`}>{value}</p>
              <p className="text-[9px] text-[#8E7A6B] uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-[#D8BFAE] px-6 py-3 flex flex-wrap gap-3 shrink-0">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8E7A6B]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nombre, email, código…"
            className="w-full pl-7 pr-3 py-1.5 border border-[#D8BFAE] text-xs bg-white focus:outline-none focus:border-[#CDA78F] placeholder:text-[#8E7A6B]/60"
          />
        </div>

        {/* Event filter */}
        <div className="relative">
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="appearance-none pl-3 pr-7 py-1.5 border border-[#D8BFAE] text-[10px] text-[#5C4A3E] bg-white focus:outline-none focus:border-[#CDA78F] cursor-pointer"
          >
            <option value="ALL">Todos los eventos</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-3 pr-7 py-1.5 border border-[#D8BFAE] text-[10px] text-[#5C4A3E] bg-white focus:outline-none focus:border-[#CDA78F] cursor-pointer"
          >
            <option value="ALL">Todos los estados</option>
            <option value="CONFIRMED">Confirmados</option>
            <option value="PAID">Pagados</option>
            <option value="PENDING_TRANSFER">Pago pendiente</option>
            <option value="CANCELLED">Cancelados</option>
          </select>
          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
        </div>

        {/* Attended filter */}
        <div className="relative">
          <select
            value={attendedFilter}
            onChange={(e) => setAttendedFilter(e.target.value)}
            className="appearance-none pl-3 pr-7 py-1.5 border border-[#D8BFAE] text-[10px] text-[#5C4A3E] bg-white focus:outline-none focus:border-[#CDA78F] cursor-pointer"
          >
            <option value="ALL">Todos</option>
            <option value="YES">Asistieron</option>
            <option value="NO">No asistieron</option>
          </select>
          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
        </div>

        {/* Clear filters */}
        {(eventFilter !== "ALL" || statusFilter !== "ALL" || attendedFilter !== "ALL" || search) && (
          <button
            onClick={() => { setEventFilter("ALL"); setStatusFilter("ALL"); setAttendedFilter("ALL"); setSearch(""); }}
            className="flex items-center gap-1 text-[10px] text-[#8E7A6B] hover:text-red-500 transition-colors"
          >
            <X size={11} /> Limpiar
          </button>
        )}

        <p className="ml-auto text-[10px] text-[#8E7A6B] self-center whitespace-nowrap">
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users size={36} className="text-[#D8BFAE] mb-3" strokeWidth={1.2} />
            <p className="text-sm text-[#5C4A3E] font-medium">
              {regs.length === 0 ? "Sin registros aún" : "Sin resultados para los filtros aplicados"}
            </p>
            <p className="text-[11px] text-[#8E7A6B] mt-1">
              {regs.length === 0
                ? "Los registros aparecerán aquí cuando alguien se inscriba en un evento."
                : "Prueba ajustando los filtros."}
            </p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-white border-b border-[#D8BFAE] sticky top-0 z-10">
              <tr>
                {["Evento", "Código", "Asistente", "Contacto", "Tipo / Método", "Estado", "Monto", "Asistencia", "Fecha", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const meta = STATUS_META[r.paymentStatus] ?? STATUS_META.CONFIRMED;
                const isPendingTransfer = r.paymentStatus === "PENDING_TRANSFER";
                const isCancelled = r.paymentStatus === "CANCELLED";
                return (
                  <tr key={r.id} className="border-b border-[#D8BFAE]/40 hover:bg-white transition-colors">
                    {/* Evento */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-[#5C4A3E] max-w-[140px] truncate">{r.eventTitle}</p>
                        <a
                          href={`/lp/${r.eventSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#8E7A6B] hover:text-[#CDA78F] shrink-0"
                        >
                          <ExternalLink size={10} />
                        </a>
                      </div>
                      <button
                        onClick={() => router.push(`/admin/eventos/${r.eventId}`)}
                        className="text-[9px] text-[#8E7A6B] hover:text-[#CDA78F] transition-colors mt-0.5"
                      >
                        Ver asistentes →
                      </button>
                    </td>

                    {/* Código */}
                    <td className="px-4 py-3">
                      <a
                        href={`/lp/${r.eventSlug}/ticket/${r.ticketCode}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono font-bold text-[#CDA78F] hover:underline"
                      >
                        {r.ticketCode}
                      </a>
                    </td>

                    {/* Asistente */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#5C4A3E]">{r.name}</p>
                      <p className="text-[#8E7A6B] text-[10px]">{r.email}</p>
                    </td>

                    {/* Contacto */}
                    <td className="px-4 py-3 text-[#8E7A6B]">
                      {r.phone && <p>{r.phone}</p>}
                      {r.whatsapp && r.whatsapp !== r.phone && <p className="text-[10px]">WA: {r.whatsapp}</p>}
                      {!r.phone && !r.whatsapp && <span className="text-[#D8BFAE]">—</span>}
                    </td>

                    {/* Tipo / método */}
                    <td className="px-4 py-3">
                      <span className={`text-[9px] px-1.5 py-0.5 ${r.ticketMode === "PAID" ? "bg-[#5C4A3E] text-white" : "bg-emerald-100 text-emerald-700"}`}>
                        {r.ticketMode === "PAID" ? "Pago" : "Gratis"}
                      </span>
                      {r.paymentMethod && (
                        <p className="text-[10px] text-[#8E7A6B] mt-0.5">
                          {METHOD_LABELS[r.paymentMethod] ?? r.paymentMethod}
                        </p>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 ${meta.bg} ${meta.text}`}>
                        {meta.icon} {meta.label}
                      </span>
                    </td>

                    {/* Monto */}
                    <td className="px-4 py-3 text-[#5C4A3E] font-medium whitespace-nowrap">
                      {r.amount > 0 ? `$${r.amount.toLocaleString("es-CL")}` : <span className="text-[#D8BFAE]">—</span>}
                    </td>

                    {/* Asistencia */}
                    <td className="px-4 py-3">
                      {!isCancelled && (
                        <button
                          onClick={() => handleToggleAttended(r.id, r.attended)}
                          disabled={isPending}
                          className={`flex items-center gap-1 text-[9px] px-2 py-1 border transition-colors ${
                            r.attended
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "bg-white text-[#8E7A6B] border-[#D8BFAE] hover:border-[#CDA78F]"
                          }`}
                        >
                          {r.attended ? <><Check size={10} /> Asistió</> : <><Clock size={10} /> Pendiente</>}
                        </button>
                      )}
                    </td>

                    {/* Fecha */}
                    <td className="px-4 py-3 text-[#8E7A6B] whitespace-nowrap">{fmtDate(r.createdAt)}</td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {isPendingTransfer && (
                          confirmId === r.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleConfirm(r.id)}
                                disabled={isPending}
                                className="text-[9px] bg-emerald-500 text-white px-2 py-1 hover:bg-emerald-600 disabled:opacity-50"
                              >
                                Confirmar
                              </button>
                              <button onClick={() => setConfirmId(null)} className="text-[9px] text-[#8E7A6B]">
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleConfirm(r.id)}
                              className="text-[9px] text-emerald-600 hover:text-emerald-800 transition-colors flex items-center gap-1"
                            >
                              <Check size={11} /> Confirmar pago
                            </button>
                          )
                        )}
                        {!isCancelled && (
                          cancelId === r.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleCancel(r.id)}
                                disabled={isPending}
                                className="text-[9px] bg-red-500 text-white px-2 py-1 hover:bg-red-600 disabled:opacity-50"
                              >
                                Cancelar
                              </button>
                              <button onClick={() => setCancelId(null)} className="text-[9px] text-[#8E7A6B]">
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleCancel(r.id)}
                              title="Cancelar registro"
                              className="text-[#8E7A6B] hover:text-red-500 transition-colors"
                            >
                              <X size={13} strokeWidth={1.5} />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
