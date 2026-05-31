"use client";

import { useState, useTransition, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, ChevronRight, ChevronLeft, SlidersHorizontal, X, Eye,
  Truck, AlertCircle, CalendarDays, CheckSquare, Square, Minus,
  ChevronDown, Check, Loader2,
} from "lucide-react";
import { updateOrderStatus, bulkUpdateOrderStatus } from "@/app/actions/admin/orders";
import Link from "next/link";

type OrderItem = {
  id: string; productName: string; variantLabel: string | null;
  quantity: number; unitPrice: number; totalPrice: number;
  product: { slug: string; images: unknown };
};
type ShippingAddress = {
  name: string; phone: string | null; street: string;
  city: string; state: string; zip: string; country: string;
};
type Order = {
  id: string; orderNumber: string; status: string;
  subtotal: number; discountAmount: number; shippingAmount: number; total: number;
  paymentMethod: string | null; createdAt: Date;
  guestEmail: string | null; guestName: string | null; guestPhone: string | null;
  guestStreet: string | null; guestCity: string | null; guestState: string | null; guestZip: string | null;
  trackingNumber: string | null; carrier: string | null; notes: string | null;
  shippedAt: Date | null;
  channel: string;
  presencialPayment: string | null;
  user: { name: string | null; email: string; phone: string | null } | null;
  shippingAddress: ShippingAddress | null;
  items: OrderItem[];
  _count: { items: number };
};
type Stat = { label: string; value: string; sub: string };
type Filters = {
  q?: string; status?: string; method?: string;
  dateFrom?: string; dateTo?: string;
  minItems?: number; maxItems?: number;
  tracking?: string; sort?: string;
};

interface Props {
  orders: Order[]; summaryStats: Stat[];
  totalOrders: number; totalPages: number; currentPage: number;
  paymentMethods: string[]; filters: Filters;
  statsDateFrom: string; statsDateTo: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente", PAID: "Pagado", PROCESSING: "Procesando",
  SHIPPED: "Enviado", DELIVERED: "Entregado", CANCELLED: "Cancelado", REFUNDED: "Reembolsado",
};
const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-[#EDE2D8] text-[#8E7A6B]", PAID: "bg-blue-50 text-blue-600",
  PROCESSING: "bg-[#EDE2D8] text-[#8E7A6B]", SHIPPED: "bg-[#CDA78F]/15 text-[#8E7A6B]",
  DELIVERED: "bg-emerald-50 text-emerald-600", CANCELLED: "bg-red-50 text-red-400",
  REFUNDED: "bg-purple-50 text-purple-500",
};
const STATUS_DOT: Record<string, string> = {
  PENDING: "bg-[#CDA78F]", PAID: "bg-blue-400", PROCESSING: "bg-amber-400",
  SHIPPED: "bg-sky-400", DELIVERED: "bg-emerald-500", CANCELLED: "bg-red-400",
  REFUNDED: "bg-purple-400",
};

// ── Period preset helpers ──────────────────────────────────────
type Preset = "thisMonth" | "lastMonth" | "last3months" | "last6months" | "thisYear" | "allTime" | "custom";

function getPresetDates(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const lastDay = (year: number, month: number) => new Date(year, month + 1, 0);

  if (preset === "thisMonth")
    return { from: iso(new Date(y, m, 1)), to: iso(lastDay(y, m)) };
  if (preset === "lastMonth") {
    const lm = m === 0 ? 11 : m - 1;
    const ly = m === 0 ? y - 1 : y;
    return { from: iso(new Date(ly, lm, 1)), to: iso(lastDay(ly, lm)) };
  }
  if (preset === "last3months")
    return { from: iso(new Date(y, m - 2, 1)), to: iso(lastDay(y, m)) };
  if (preset === "last6months")
    return { from: iso(new Date(y, m - 5, 1)), to: iso(lastDay(y, m)) };
  if (preset === "thisYear")
    return { from: iso(new Date(y, 0, 1)), to: iso(new Date(y, 11, 31)) };
  return { from: "1970-01-01", to: "2099-12-31" };
}

function detectPreset(from: string, to: string): Preset {
  const presets: Preset[] = ["thisMonth", "lastMonth", "last3months", "last6months", "thisYear", "allTime"];
  for (const p of presets) {
    const d = getPresetDates(p);
    if (d.from === from && d.to === to) return p;
  }
  return "custom";
}

const PRESET_LABELS: Record<Preset, string> = {
  thisMonth: "Este mes", lastMonth: "Mes anterior", last3months: "3 meses",
  last6months: "6 meses", thisYear: "Este año", allTime: "Histórico", custom: "Personalizado",
};

// ── Component ─────────────────────────────────────────────────
export default function AdminPagosClient({
  orders: initial, summaryStats, totalOrders, totalPages, currentPage,
  paymentMethods, filters, statsDateFrom, statsDateTo,
}: Props) {
  const router = useRouter();
  const sp     = useSearchParams();
  const [orders, setOrders]               = useState(initial);
  const [showFilters, setShowFilters]     = useState(false);
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [isPending, startTransition]      = useTransition();
  const [isBulkPending, startBulkTransition] = useTransition();

  // ── Selection state ──────────────────────────────────────────
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  const [selectAllMode, setSelectAllMode] = useState(false); // true = todos los filtrados
  const [bulkStatus, setBulkStatus]       = useState("");
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkResult, setBulkResult]       = useState<{ updated: number } | null>(null);
  const bulkDropRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (bulkDropRef.current && !bulkDropRef.current.contains(e.target as Node)) {
        setBulkStatusOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const pageIds    = orders.map((o) => o.id);
  const allPageSel = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someSel    = pageIds.some((id) => selectedIds.has(id));
  const totalSel   = selectAllMode ? totalOrders : selectedIds.size;
  const hasSelection = totalSel > 0;

  function toggleRow(id: string) {
    setSelectAllMode(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setBulkResult(null);
  }

  function togglePage() {
    setSelectAllMode(false);
    setBulkResult(null);
    if (allPageSel) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setSelectAllMode(false);
    setBulkStatus("");
    setBulkResult(null);
  }

  function activateSelectAll() {
    setSelectAllMode(true);
    setBulkResult(null);
  }

  async function applyBulkAction() {
    if (!bulkStatus) return;

    startBulkTransition(async () => {
      let res: { success: boolean; updated: number };

      if (selectAllMode) {
        res = await bulkUpdateOrderStatus(bulkStatus, {
          filters: {
            q:        filters.q,
            status:   filters.status,
            method:   filters.method,
            dateFrom: filters.dateFrom,
            dateTo:   filters.dateTo,
            tracking: filters.tracking,
          },
          totalCount: totalOrders,
        });
      } else {
        res = await bulkUpdateOrderStatus(bulkStatus, { ids: Array.from(selectedIds) });
      }

      if (res.success) {
        // Update local state
        const idsAffected = selectAllMode ? new Set(pageIds) : selectedIds;
        setOrders((prev) =>
          prev.map((o) => idsAffected.has(o.id) ? { ...o, status: bulkStatus } : o)
        );
        setBulkResult({ updated: res.updated });
        clearSelection();
        setBulkStatus("");
      }
    });
  }

  // ── Filter form state ────────────────────────────────────────
  const [fq,        setFq]        = useState(filters.q        ?? "");
  const [fStatus,   setFStatus]   = useState(filters.status   ?? "");
  const [fMethod,   setFMethod]   = useState(filters.method   ?? "");
  const [fDateFrom, setFDateFrom] = useState(filters.dateFrom ?? "");
  const [fDateTo,   setFDateTo]   = useState(filters.dateTo   ?? "");
  const [fMinItems, setFMinItems] = useState(filters.minItems ? String(filters.minItems) : "");
  const [fMaxItems, setFMaxItems] = useState(filters.maxItems ? String(filters.maxItems) : "");
  const [fTracking, setFTracking] = useState(filters.tracking ?? "");
  const [fSort,     setFSort]     = useState(filters.sort     ?? "newest");

  const activePreset = detectPreset(statsDateFrom, statsDateTo);
  const [customFrom, setCustomFrom] = useState(statsDateFrom);
  const [customTo,   setCustomTo]   = useState(statsDateTo);

  const activeFilterCount = [
    filters.q, filters.status, filters.method, filters.dateFrom, filters.dateTo,
    filters.minItems, filters.maxItems, filters.tracking,
  ].filter(Boolean).length;

  const navigate = useCallback((params: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v) next.set(k, v); else next.delete(k);
    });
    router.push(`/admin/pagos?${next.toString()}`);
  }, [router, sp]);

  function navigateStats(from: string, to: string) {
    const next = new URLSearchParams(sp.toString());
    next.set("statsFrom", from);
    next.set("statsTo",   to);
    router.push(`/admin/pagos?${next.toString()}`);
  }

  function selectPreset(preset: Preset) {
    if (preset === "custom") { setShowCustomDates(true); return; }
    setShowCustomDates(false);
    const { from, to } = getPresetDates(preset);
    navigateStats(from, to);
  }

  function applyCustomDates() {
    if (customFrom && customTo) navigateStats(customFrom, customTo);
  }

  const periodLabel = (() => {
    const fmtShort = (s: string) =>
      new Date(s + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
    if (activePreset === "thisMonth") {
      const d = new Date(statsDateFrom + "T12:00:00");
      return d.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
    }
    if (activePreset === "allTime") return "Histórico completo";
    return `${fmtShort(statsDateFrom)} — ${fmtShort(statsDateTo)}`;
  })();

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    clearSelection();
    navigate({
      q: fq || undefined, status: fStatus || undefined, method: fMethod || undefined,
      dateFrom: fDateFrom || undefined, dateTo: fDateTo || undefined,
      minItems: fMinItems || undefined, maxItems: fMaxItems || undefined,
      tracking: fTracking || undefined,
      sort: fSort !== "newest" ? fSort : undefined,
      page: "1",
    });
    setShowFilters(false);
  }

  function clearFilters() {
    setFq(""); setFStatus(""); setFMethod(""); setFDateFrom(""); setFDateTo("");
    setFMinItems(""); setFMaxItems(""); setFTracking(""); setFSort("newest");
    clearSelection();
    router.push("/admin/pagos");
    setShowFilters(false);
  }

  function handleStatusChange(orderId: string, newStatus: string) {
    startTransition(async () => {
      await updateOrderStatus(orderId, newStatus);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
    });
  }

  const inputCls = "w-full bg-white border border-[#D8BFAE] text-xs text-[#5C4A3E] px-3 py-2 outline-none focus:border-[#CDA78F]";
  const labelCls = "block text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-1";

  return (
    <div className="space-y-6 max-w-7xl">

      {/* ── Period selector ── */}
      <div className="bg-[#F7F4F1] border border-[#D8BFAE] px-5 py-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays size={13} strokeWidth={1.5} className="text-[#CDA78F]" />
            <span className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Período de análisis</span>
            <span className="text-xs text-[#5C4A3E] font-medium ml-1">{periodLabel}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["thisMonth", "lastMonth", "last3months", "last6months", "thisYear", "allTime", "custom"] as Preset[]).map((p) => (
              <button key={p} onClick={() => selectPreset(p)}
                className={`text-[9px] tracking-[0.1em] uppercase px-3 py-1.5 transition-colors ${
                  activePreset === p || (p === "custom" && showCustomDates)
                    ? "bg-[#5C4A3E] text-white"
                    : "bg-white border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F]"
                }`}>
                {PRESET_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
        {(showCustomDates || activePreset === "custom") && (
          <div className="flex flex-wrap items-end gap-3 pt-1 border-t border-[#EDE2D8]">
            <div className="space-y-1">
              <label className="block text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Desde</label>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-white border border-[#D8BFAE] text-xs text-[#5C4A3E] px-3 py-2 outline-none focus:border-[#CDA78F]" />
            </div>
            <div className="space-y-1">
              <label className="block text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Hasta</label>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="bg-white border border-[#D8BFAE] text-xs text-[#5C4A3E] px-3 py-2 outline-none focus:border-[#CDA78F]" />
            </div>
            <button onClick={applyCustomDates} disabled={!customFrom || !customTo}
              className="text-[10px] tracking-[0.12em] uppercase px-5 py-2 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white disabled:opacity-40 transition-colors">
              Aplicar
            </button>
          </div>
        )}
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryStats.map((s) => (
          <div key={s.label} className="bg-[#F7F4F1] border border-[#D8BFAE] px-5 py-4">
            <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] mb-2">{s.label}</p>
            <p className="font-heading text-xl text-[#5C4A3E]">{s.value}</p>
            <p className="text-[10px] text-[#8E7A6B] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={(e) => { e.preventDefault(); navigate({ q: fq || undefined, page: "1" }); }}
          className="flex items-center gap-2 bg-white border border-[#D8BFAE] px-3 py-2.5 w-64 focus-within:border-[#CDA78F]">
          <Search size={13} strokeWidth={1.5} className="text-[#8E7A6B] shrink-0" />
          <input type="text" value={fq} onChange={(e) => setFq(e.target.value)}
            placeholder="N° pedido o cliente..."
            className="bg-transparent text-xs text-[#5C4A3E] placeholder:text-[#8E7A6B] outline-none w-full" />
          {fq && (
            <button type="button" onClick={() => { setFq(""); navigate({ q: undefined, page: "1" }); }}>
              <X size={12} className="text-[#8E7A6B]" />
            </button>
          )}
        </form>

        <button onClick={() => setShowFilters((s) => !s)}
          className={`flex items-center gap-2 px-4 py-2.5 text-[10px] tracking-[0.12em] uppercase transition-colors border ${
            activeFilterCount > 0
              ? "bg-[#CDA78F] text-white border-[#CDA78F]"
              : "bg-white border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F]"
          }`}>
          <SlidersHorizontal size={13} strokeWidth={1.5} />
          Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>

        <select value={fSort}
          onChange={(e) => { setFSort(e.target.value); navigate({ sort: e.target.value !== "newest" ? e.target.value : undefined, page: "1" }); }}
          className="bg-white border border-[#D8BFAE] text-xs text-[#5C4A3E] px-3 py-2.5 outline-none focus:border-[#CDA78F]">
          <option value="newest">Más recientes</option>
          <option value="oldest">Más antiguos</option>
          <option value="highest">Mayor total</option>
          <option value="lowest">Menor total</option>
        </select>

        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="text-[10px] text-red-400 hover:text-red-600 underline">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* ── Filter panel ── */}
      {showFilters && (
        <form onSubmit={applyFilters} className="bg-white border border-[#D8BFAE] p-5">
          <p className="text-[10px] tracking-[0.15em] uppercase text-[#8E7A6B] mb-4">Filtros avanzados</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Estado</label>
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={inputCls}>
                <option value="">Todos los estados</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Método de pago</label>
              <select value={fMethod} onChange={(e) => setFMethod(e.target.value)} className={inputCls}>
                <option value="">Todos</option>
                {paymentMethods.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Fecha desde</label>
              <input type="date" value={fDateFrom} onChange={(e) => setFDateFrom(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fecha hasta</label>
              <input type="date" value={fDateTo} onChange={(e) => setFDateTo(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Piezas mínimo</label>
              <input type="number" min="0" value={fMinItems} onChange={(e) => setFMinItems(e.target.value)} placeholder="ej. 3" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Piezas máximo</label>
              <input type="number" min="0" value={fMaxItems} onChange={(e) => setFMaxItems(e.target.value)} placeholder="ej. 10" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Seguimiento</label>
              <select value={fTracking} onChange={(e) => setFTracking(e.target.value)} className={inputCls}>
                <option value="">Todos</option>
                <option value="with">Con seguimiento</option>
                <option value="without">Sin seguimiento</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button type="submit" className="bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[10px] tracking-[0.15em] uppercase px-6 py-2.5 transition-colors">
              Aplicar filtros
            </button>
            <button type="button" onClick={clearFilters} className="border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] text-[10px] tracking-[0.15em] uppercase px-5 py-2.5 transition-colors">
              Limpiar
            </button>
          </div>
        </form>
      )}

      {/* ── Bulk action bar ── */}
      {hasSelection && (
        <div className="bg-[#5C4A3E] text-white px-5 py-3 flex flex-wrap items-center gap-4">
          {/* Count */}
          <div className="flex items-center gap-2">
            <CheckSquare size={15} strokeWidth={1.5} className="text-[#CDA78F]" />
            <span className="text-xs font-medium">
              {selectAllMode
                ? `Todos los ${totalOrders.toLocaleString("es-CL")} pedidos filtrados seleccionados`
                : `${selectedIds.size} pedido${selectedIds.size !== 1 ? "s" : ""} seleccionado${selectedIds.size !== 1 ? "s" : ""}`}
            </span>
          </div>

          {/* Status picker */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[9px] tracking-[0.12em] uppercase text-[#D8BFAE]">Cambiar estado a:</span>
            <div className="relative" ref={bulkDropRef}>
              <button
                type="button"
                onClick={() => setBulkStatusOpen((o) => !o)}
                className={`flex items-center gap-2 px-3 py-2 text-xs border transition-colors min-w-[160px] justify-between ${
                  bulkStatus
                    ? "bg-white/10 border-white/30 text-white"
                    : "bg-white/5 border-white/20 text-[#D8BFAE] hover:border-white/40"
                }`}
              >
                <span className="flex items-center gap-2">
                  {bulkStatus && <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[bulkStatus] ?? "bg-gray-400"}`} />}
                  {bulkStatus ? STATUS_LABELS[bulkStatus] : "Seleccionar estado"}
                </span>
                <ChevronDown size={11} strokeWidth={1.5} className={`transition-transform ${bulkStatusOpen ? "rotate-180" : ""}`} />
              </button>

              {bulkStatusOpen && (
                <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-[#D8BFAE] shadow-lg min-w-[180px] text-[#5C4A3E]">
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => { setBulkStatus(k); setBulkStatusOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left hover:bg-[#F7F4F1] transition-colors ${bulkStatus === k ? "bg-[#EDE2D8]" : ""}`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[k] ?? "bg-gray-400"}`} />
                      {v}
                      {bulkStatus === k && <Check size={11} strokeWidth={2} className="ml-auto text-[#CDA78F]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={applyBulkAction}
              disabled={!bulkStatus || isBulkPending}
              className="flex items-center gap-1.5 px-5 py-2 text-[10px] tracking-[0.12em] uppercase bg-[#CDA78F] hover:bg-[#EDE2D8] hover:text-[#5C4A3E] text-white disabled:opacity-40 transition-colors"
            >
              {isBulkPending ? <Loader2 size={12} strokeWidth={1.5} className="animate-spin" /> : null}
              Aplicar
            </button>

            <button
              onClick={clearSelection}
              className="flex items-center gap-1 px-3 py-2 text-[10px] text-[#D8BFAE] hover:text-white transition-colors"
            >
              <X size={12} strokeWidth={1.5} />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* "Select all filtered" banner */}
      {allPageSel && !selectAllMode && totalOrders > orders.length && (
        <div className="bg-[#EDE2D8] border border-[#D8BFAE] px-5 py-2.5 flex items-center gap-3 text-xs text-[#5C4A3E]">
          <span>
            Se seleccionaron {orders.length} pedidos de esta página.
          </span>
          <button
            onClick={activateSelectAll}
            className="font-medium text-[#CDA78F] hover:text-[#5C4A3E] underline underline-offset-2 transition-colors"
          >
            Seleccionar todos los {totalOrders.toLocaleString("es-CL")} pedidos filtrados
          </button>
        </div>
      )}

      {/* Bulk action result toast */}
      {bulkResult && (
        <div className="bg-emerald-50 border border-emerald-200 px-5 py-3 flex items-center justify-between">
          <span className="text-xs text-emerald-700 flex items-center gap-2">
            <Check size={13} strokeWidth={2} className="text-emerald-500" />
            Se actualizaron <strong>{bulkResult.updated}</strong> pedido{bulkResult.updated !== 1 ? "s" : ""} correctamente.
          </span>
          <button onClick={() => setBulkResult(null)} className="text-emerald-400 hover:text-emerald-600">
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-[#F7F4F1] border border-[#D8BFAE] overflow-x-auto">
        {initial.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#8E7A6B]">
            {totalOrders === 0 ? "Sin pedidos aún" : "Sin resultados para los filtros seleccionados"}
          </div>
        ) : (
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className="border-b border-[#D8BFAE] bg-[#EDE2D8]/40">
                {/* Select-all checkbox */}
                <th className="pl-4 pr-2 py-3.5 w-10">
                  <button
                    type="button"
                    onClick={togglePage}
                    className="text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors"
                    aria-label={allPageSel ? "Deseleccionar página" : "Seleccionar página"}
                  >
                    {allPageSel
                      ? <CheckSquare size={15} strokeWidth={1.5} className="text-[#CDA78F]" />
                      : someSel
                      ? <Minus size={15} strokeWidth={1.5} className="text-[#CDA78F]" />
                      : <Square size={15} strokeWidth={1.5} />}
                  </button>
                </th>
                {["Pedido", "Cliente", "Piezas", "Total", "Método", "Estado", "Seguimiento", "Fecha", ""].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDE2D8]">
              {orders.map((o) => {
                const name  = o.user?.name  ?? o.guestName  ?? "Invitado";
                const email = o.user?.email ?? o.guestEmail ?? "";
                const isSelected = selectAllMode || selectedIds.has(o.id);
                return (
                  <tr
                    key={o.id}
                    onClick={() => toggleRow(o.id)}
                    className={`transition-colors cursor-pointer ${isSelected ? "bg-[#EDE2D8]/60" : "hover:bg-[#EDE2D8]/30"}`}
                  >
                    {/* Checkbox */}
                    <td className="pl-4 pr-2 py-3.5 w-10" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => toggleRow(o.id)}
                        className="text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors"
                        aria-label={isSelected ? "Deseleccionar" : "Seleccionar"}
                      >
                        {isSelected
                          ? <CheckSquare size={15} strokeWidth={1.5} className="text-[#CDA78F]" />
                          : <Square size={15} strokeWidth={1.5} />}
                      </button>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <p className="text-xs text-[#CDA78F] font-medium">#{o.orderNumber}</p>
                      {o.channel === "PRESENCIAL" ? (
                        <span className="inline-block text-[8px] tracking-[0.08em] uppercase px-1.5 py-0.5 mt-0.5 bg-amber-50 text-amber-600 font-medium">
                          Presencial
                        </span>
                      ) : o.trackingNumber ? (
                        <span className="inline-block text-[8px] tracking-[0.08em] uppercase px-1.5 py-0.5 mt-0.5 bg-blue-50 text-blue-600 font-medium">
                          Con seguimiento
                        </span>
                      ) : (
                        <span className="inline-block text-[8px] tracking-[0.08em] uppercase px-1.5 py-0.5 mt-0.5 bg-[#F7F4F1] text-[#8E7A6B] font-medium">
                          Sin seguimiento
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 max-w-[160px]">
                      <p className="text-xs text-[#5C4A3E] truncate">{name}</p>
                      <p className="text-[10px] text-[#8E7A6B] truncate">{email}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#8E7A6B] whitespace-nowrap">
                      {o._count.items} {o._count.items === 1 ? "pieza" : "piezas"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#5C4A3E] font-medium whitespace-nowrap">
                      ${o.total.toLocaleString("es-CL")}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#8E7A6B] whitespace-nowrap">
                      {o.paymentMethod ?? "—"}
                    </td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={o.status}
                        onChange={(e) => handleStatusChange(o.id, e.target.value)}
                        disabled={isPending}
                        className={`text-[9px] tracking-[0.08em] uppercase px-2 py-1 border-0 outline-none cursor-pointer ${STATUS_STYLES[o.status]}`}
                      >
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </td>

                    {/* Tracking cell */}
                    <td className="px-4 py-3.5">
                      {o.trackingNumber || o.carrier ? (
                        <div className="space-y-0.5 min-w-[120px]">
                          {o.carrier && (
                            <p className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                              <Truck size={10} strokeWidth={1.5} />{o.carrier}
                            </p>
                          )}
                          {o.trackingNumber && (
                            <p className="text-[9px] text-[#8E7A6B] font-mono leading-tight">
                              {o.trackingNumber.length > 14 ? o.trackingNumber.slice(0, 14) + "…" : o.trackingNumber}
                            </p>
                          )}
                          {o.shippedAt && (
                            <p className="text-[9px] text-[#CDA78F]">
                              {new Date(o.shippedAt).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-[9px] tracking-[0.08em] uppercase px-2 py-1 ${
                          o.status === "SHIPPED" || o.status === "DELIVERED" || o.status === "PROCESSING"
                            ? "bg-amber-50 text-amber-500"
                            : "bg-[#F7F4F1] text-[#CDA78F]"
                        }`}>
                          {(o.status === "SHIPPED" || o.status === "DELIVERED") && (
                            <AlertCircle size={9} strokeWidth={1.5} />
                          )}
                          Sin seguimiento
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-xs text-[#8E7A6B] whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/admin/pagos/${o.id}`}
                        className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.1em] uppercase bg-[#F7F4F1] border border-[#D8BFAE] text-[#8E7A6B] hover:bg-[#CDA78F] hover:text-white hover:border-[#CDA78F] px-3 py-1.5 whitespace-nowrap transition-colors"
                      >
                        <Eye size={11} strokeWidth={1.5} />
                        Ver pedido
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Footer */}
        <div className="px-4 py-4 border-t border-[#D8BFAE] flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] text-[#8E7A6B]">
            Mostrando {(currentPage - 1) * 25 + 1}–{Math.min(currentPage * 25, totalOrders)} de {totalOrders} pedidos
            {hasSelection && (
              <span className="ml-2 text-[#CDA78F] font-medium">
                · {totalSel} seleccionado{totalSel !== 1 ? "s" : ""}
              </span>
            )}
          </p>
          {totalPages > 1 && (() => {
            const WINDOW = 10;
            const wStart = Math.floor((currentPage - 1) / WINDOW) * WINDOW + 1;
            const wEnd   = Math.min(wStart + WINDOW - 1, totalPages);
            const pages  = Array.from({ length: wEnd - wStart + 1 }, (_, i) => wStart + i);
            const go = (n: number) => { clearSelection(); navigate({ page: String(n) }); };
            return (
              <div className="flex items-center gap-1 flex-wrap">
                {wStart > 1 && (
                  <button onClick={() => go(wStart - 1)}
                    className="px-2 py-1.5 text-[10px] border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] transition-colors">
                    ‹‹
                  </button>
                )}
                <button onClick={() => go(currentPage - 1)} disabled={currentPage <= 1}
                  className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft size={12} strokeWidth={1.5} />
                </button>
                {pages.map((n) => (
                  <button key={n} onClick={() => go(n)}
                    className={`w-7 h-7 flex items-center justify-center text-[10px] border transition-colors ${
                      n === currentPage
                        ? "bg-[#CDA78F] border-[#CDA78F] text-white"
                        : "border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] hover:text-[#5C4A3E]"
                    }`}>
                    {n}
                  </button>
                ))}
                <button onClick={() => go(currentPage + 1)} disabled={currentPage >= totalPages}
                  className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight size={12} strokeWidth={1.5} />
                </button>
                {wEnd < totalPages && (
                  <button onClick={() => go(wEnd + 1)}
                    className="px-2 py-1.5 text-[10px] border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] transition-colors">
                    ››
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
