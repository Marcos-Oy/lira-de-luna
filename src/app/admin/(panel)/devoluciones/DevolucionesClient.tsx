"use client";

import { useState, useTransition, useMemo } from "react";
import {
  RotateCcw, Plus, X, Check, Trash2, ChevronDown,
  AlertTriangle, Package, DollarSign, RefreshCw,
} from "lucide-react";
import { createReturn, updateReturnStatus, deleteReturn } from "@/app/actions/admin/returns";

// ─── Types ────────────────────────────────────────────────────

type ReturnType   = "PRODUCT_RETURN" | "MONEY_REFUND" | "DEFECTIVE" | "EXCHANGE";
type ReturnStatus = "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED";

type ReturnRecord = {
  id:          string;
  orderId:     string;
  type:        ReturnType;
  status:      ReturnStatus;
  amount:      number | null;
  description: string;
  notes:       string | null;
  createdAt:   string;
  order: {
    orderNumber:   string;
    total:         number;
    customerName:  string;
    customerEmail: string | null;
  };
};

type OrderOption = {
  id:           string;
  orderNumber:  string;
  total:        number;
  createdAt:    string;
  customerName: string;
};

interface Props {
  returns:      ReturnRecord[];
  orders:       OrderOption[];
  summaryStats: { total: number; pending: number; completed: number; refunded: number };
}

// ─── Constants ────────────────────────────────────────────────

const TYPE_LABELS: Record<ReturnType, string> = {
  PRODUCT_RETURN: "Devolución de producto",
  MONEY_REFUND:   "Reembolso de dinero",
  DEFECTIVE:      "Producto defectuoso",
  EXCHANGE:       "Cambio de producto",
};
const TYPE_ICONS: Record<ReturnType, React.ElementType> = {
  PRODUCT_RETURN: Package,
  MONEY_REFUND:   DollarSign,
  DEFECTIVE:      AlertTriangle,
  EXCHANGE:       RefreshCw,
};
const TYPE_STYLES: Record<ReturnType, string> = {
  PRODUCT_RETURN: "bg-[#EDE2D8] text-[#8E7A6B]",
  MONEY_REFUND:   "bg-purple-50 text-purple-600",
  DEFECTIVE:      "bg-red-50 text-red-500",
  EXCHANGE:       "bg-blue-50 text-blue-600",
};
const STATUS_LABELS: Record<ReturnStatus, string> = {
  PENDING:   "Pendiente",
  APPROVED:  "Aprobado",
  COMPLETED: "Completado",
  REJECTED:  "Rechazado",
};
const STATUS_STYLES: Record<ReturnStatus, string> = {
  PENDING:   "bg-[#EDE2D8] text-[#8E7A6B]",
  APPROVED:  "bg-blue-50 text-blue-600",
  COMPLETED: "bg-emerald-50 text-emerald-600",
  REJECTED:  "bg-red-50 text-red-400",
};
const STATUS_FLOW: ReturnStatus[] = ["PENDING", "APPROVED", "COMPLETED", "REJECTED"];

// ─── Main component ───────────────────────────────────────────

export default function DevolucionesClient({ returns: initialReturns, orders, summaryStats }: Props) {
  const [returns, setReturns] = useState<ReturnRecord[]>(initialReturns);
  const [showForm, setShowForm]   = useState(false);
  const [typeFilter, setTypeFilter]     = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [isPending, startTransition]    = useTransition();

  // ── Form state ────────────────────────────────────────────
  const [form, setForm] = useState({
    orderId: "", type: "PRODUCT_RETURN" as ReturnType,
    amount: "", description: "", notes: "",
  });
  const [formError, setFormError]   = useState("");
  const [formSaved, setFormSaved]   = useState(false);

  const filtered = useMemo(() => {
    return returns.filter((r) => {
      if (typeFilter   !== "ALL" && r.type   !== typeFilter)   return false;
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      return true;
    });
  }, [returns, typeFilter, statusFilter]);

  function handleSubmit() {
    if (!form.orderId || !form.description.trim()) { setFormError("Completa todos los campos requeridos"); return; }
    setFormError("");
    startTransition(async () => {
      const res = await createReturn({
        orderId:     form.orderId,
        type:        form.type,
        amount:      form.type === "MONEY_REFUND" && form.amount ? parseInt(form.amount) : undefined,
        description: form.description,
        notes:       form.notes || undefined,
      });
      if ("error" in res) { setFormError(res.error ?? "Error desconocido"); return; }
      setFormSaved(true);
      setTimeout(() => { setFormSaved(false); setShowForm(false); }, 1500);
      setForm({ orderId: "", type: "PRODUCT_RETURN" as ReturnType, amount: "", description: "", notes: "" });
      // Optimistic update not possible without refetch — just reload
      window.location.reload();
    });
  }

  function handleStatusChange(id: string, status: ReturnStatus, type: ReturnType) {
    const applyRefund = type === "MONEY_REFUND" && status === "COMPLETED";
    startTransition(async () => {
      await updateReturnStatus(id, status, applyRefund);
      setReturns((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    });
  }

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar este registro?")) return;
    startTransition(async () => {
      await deleteReturn(id);
      setReturns((prev) => prev.filter((r) => r.id !== id));
    });
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">Devoluciones</h1>
          <p className="text-xs text-[#8E7A6B] mt-0.5">Gestiona devoluciones, reembolsos y cambios de producto</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[9px] tracking-[0.15em] uppercase transition-colors"
        >
          <Plus size={12} strokeWidth={1.75} />
          Registrar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",      value: summaryStats.total,     sub: "registros" },
          { label: "Pendientes", value: summaryStats.pending,   sub: "por resolver" },
          { label: "Completados",value: summaryStats.completed, sub: "resueltos" },
          { label: "Reembolsado",value: `$${summaryStats.refunded.toLocaleString("es-CL")}`, sub: "CLP devueltos" },
        ].map((k) => (
          <div key={k.label} className="bg-[#F7F4F1] border border-[#D8BFAE] px-4 py-3">
            <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">{k.label}</p>
            <p className="font-heading text-xl text-[#5C4A3E] mt-0.5">{k.value}</p>
            <p className="text-[10px] text-[#8E7A6B]">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {[
          { key: "typeFilter", value: typeFilter, setter: setTypeFilter, options: [["ALL", "Todos los tipos"], ...Object.entries(TYPE_LABELS)] },
          { key: "statusFilter", value: statusFilter, setter: setStatusFilter, options: [["ALL", "Todos los estados"], ...Object.entries(STATUS_LABELS)] },
        ].map(({ key, value, setter, options }) => (
          <div key={key} className="relative">
            <select
              value={value}
              onChange={(e) => setter(e.target.value)}
              className="appearance-none bg-[#F7F4F1] border border-[#D8BFAE] pl-3 pr-7 py-1.5 text-[10px] tracking-[0.1em] uppercase text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
            >
              {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
          </div>
        ))}
        <span className="text-[10px] text-[#8E7A6B] ml-auto">{filtered.length} registros</span>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="py-12 text-center border border-dashed border-[#D8BFAE]">
            <RotateCcw size={28} strokeWidth={1} className="mx-auto text-[#D8BFAE] mb-3" />
            <p className="text-xs text-[#8E7A6B]">Sin registros con los filtros actuales</p>
          </div>
        )}
        {filtered.map((r) => {
          const TypeIcon = TYPE_ICONS[r.type];
          const isExpanded = expandedId === r.id;
          return (
            <div key={r.id} className="bg-[#F7F4F1] border border-[#D8BFAE]">
              <button
                onClick={() => setExpandedId(isExpanded ? null : r.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <div className={`w-7 h-7 flex items-center justify-center shrink-0 ${TYPE_STYLES[r.type]}`}>
                  <TypeIcon size={13} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-medium text-[#5C4A3E] tracking-wide">{TYPE_LABELS[r.type]}</span>
                    <span className="text-[9px] text-[#8E7A6B]">·</span>
                    <span className="text-[10px] text-[#CDA78F] font-mono">#{r.order.orderNumber}</span>
                    <span className="text-[9px] text-[#8E7A6B]">{r.order.customerName}</span>
                  </div>
                  <p className="text-[11px] text-[#8E7A6B] mt-0.5 truncate">{r.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.amount && (
                    <span className="text-[10px] font-heading text-[#5C4A3E]">
                      ${r.amount.toLocaleString("es-CL")}
                    </span>
                  )}
                  <span className={`text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 ${STATUS_STYLES[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                  <ChevronDown size={13} strokeWidth={1.5} className={`text-[#8E7A6B] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-[#D8BFAE] px-4 py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-0.5">Pedido</p>
                      <p className="text-[#5C4A3E] font-mono">#{r.order.orderNumber}</p>
                      <p className="text-[#8E7A6B]">Total: ${r.order.total.toLocaleString("es-CL")} CLP</p>
                    </div>
                    <div>
                      <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-0.5">Cliente</p>
                      <p className="text-[#5C4A3E]">{r.order.customerName}</p>
                      {r.order.customerEmail && <p className="text-[#8E7A6B]">{r.order.customerEmail}</p>}
                    </div>
                    <div>
                      <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-0.5">Fecha</p>
                      <p className="text-[#5C4A3E]">{new Date(r.createdAt).toLocaleDateString("es-CL")}</p>
                    </div>
                    {r.amount && (
                      <div>
                        <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-0.5">Monto</p>
                        <p className="text-[#5C4A3E]">${r.amount.toLocaleString("es-CL")} CLP</p>
                      </div>
                    )}
                  </div>
                  {r.notes && (
                    <div>
                      <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-1">Notas</p>
                      <p className="text-xs text-[#5C4A3E]">{r.notes}</p>
                    </div>
                  )}

                  {/* Status update */}
                  {r.status !== "COMPLETED" && r.status !== "REJECTED" && (
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <span className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Cambiar estado:</span>
                      {STATUS_FLOW.filter((s) => s !== r.status).map((s) => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(r.id, s, r.type)}
                          disabled={isPending}
                          className={`text-[9px] tracking-[0.1em] uppercase px-3 py-1.5 transition-colors disabled:opacity-50 ${
                            s === "REJECTED" ? "bg-red-50 text-red-500 hover:bg-red-100" :
                            s === "COMPLETED" ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" :
                            "bg-[#EDE2D8] text-[#8E7A6B] hover:bg-[#D8BFAE]"
                          }`}
                        >
                          {STATUS_LABELS[s]}
                          {s === "COMPLETED" && r.type === "MONEY_REFUND" && " + Marcar reembolsado"}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={isPending}
                      className="flex items-center gap-1.5 text-[9px] tracking-[0.12em] uppercase text-[#D8BFAE] hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={11} strokeWidth={1.5} />
                      Eliminar registro
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New return form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8BFAE]">
              <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E]">Registrar devolución</h2>
              <button onClick={() => setShowForm(false)} className="text-[#8E7A6B] hover:text-[#5C4A3E]">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {formError && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2">{formError}</p>
              )}

              <div className="space-y-1">
                <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Pedido *</label>
                <div className="relative">
                  <select
                    value={form.orderId}
                    onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                    className="w-full appearance-none bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                  >
                    <option value="">Seleccionar pedido...</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        #{o.orderNumber} — {o.customerName} (${o.total.toLocaleString("es-CL")})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Tipo *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(TYPE_LABELS) as [ReturnType, string][]).map(([key, label]) => {
                    const Icon = TYPE_ICONS[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm({ ...form, type: key })}
                        className={`flex items-center gap-2 px-3 py-2.5 text-[10px] tracking-wide border transition-colors ${
                          form.type === key
                            ? "border-[#CDA78F] bg-[#CDA78F]/10 text-[#5C4A3E]"
                            : "border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F]/60"
                        }`}
                      >
                        <Icon size={12} strokeWidth={1.5} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.type === "MONEY_REFUND" && (
                <div className="space-y-1">
                  <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Monto a reembolsar (CLP)</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0"
                    className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Descripción *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Describe el motivo de la devolución..."
                  className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Notas internas</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Notas adicionales (opcional)..."
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
                {formSaved ? <><Check size={11} /> Guardado</> : isPending ? "Guardando..." : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
