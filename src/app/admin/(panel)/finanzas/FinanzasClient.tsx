"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp, Percent, Receipt, Building2, Settings2,
  Plus, Pencil, Trash2, X, Check, Save, AlertTriangle,
  Info, ChevronDown, RefreshCw, ArrowUp, ArrowDown,
  Minus, SlidersHorizontal, CalendarDays, ExternalLink,
  ShieldCheck,
} from "lucide-react";
import type { FinanceSummary, AssetRow, RateConfigRow } from "@/app/actions/admin/finance";
import {
  createFinanceAsset, updateFinanceAsset, deleteFinanceAsset,
  updateRateConfig, refreshRatesFromSources,
} from "@/app/actions/admin/finance";

// ─── Constants ───────────────────────────────────────────────

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const ASSET_CATEGORIES = [
  { value: "COMPUTER",  label: "Computador / Tablet",    defaultYears: 6  },
  { value: "SOFTWARE",  label: "Software / Licencias",   defaultYears: 3  },
  { value: "FURNITURE", label: "Muebles y vitrinas",     defaultYears: 7  },
  { value: "EQUIPMENT", label: "Equipos y herramientas", defaultYears: 7  },
  { value: "VEHICLE",   label: "Vehículo",               defaultYears: 7  },
  { value: "BUILDING",  label: "Instalaciones / Local",  defaultYears: 20 },
  { value: "OTHER",     label: "Otro",                   defaultYears: 5  },
];

const STALE_DAYS = 7; // amber warning after N days without check

// ─── Helpers ─────────────────────────────────────────────────

const fmt  = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;
const fmtR = (n: number) => `${(n * 100).toFixed(2)}%`;

function ivaFromSale(total: number, ivaRate: number) { return Math.round(total * ivaRate / (1 + ivaRate)); }
function netIncome(total: number, ivaRate: number)   { return Math.round(total / (1 + ivaRate)); }
function annualDepr(cost: number, years: number)     { return years > 0 ? Math.round(cost / years) : 0; }
function accumulatedDepr(cost: number, years: number, purchaseDate: string) {
  const y = (Date.now() - new Date(purchaseDate).getTime()) / (365.25 * 86400e3);
  return Math.min(cost, Math.round(annualDepr(cost, years) * y));
}
function bookValue(cost: number, years: number, purchaseDate: string) {
  return Math.max(0, cost - accumulatedDepr(cost, years, purchaseDate));
}
function deltaPct(current: number, prev: number) {
  if (prev === 0) return null;
  return ((current - prev) / prev) * 100;
}
function daysAgo(isoDate: string | null) {
  if (!isoDate) return null;
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400e3);
}

// ─── Types ───────────────────────────────────────────────────

type Tab = "resumen" | "comisiones" | "iva" | "renta" | "tasas";

type AssetFormData = {
  name: string; category: string; purchaseDate: string;
  purchaseCost: string; usefulLifeYears: string; notes: string;
};

function emptyAssetForm(): AssetFormData {
  return { name: "", category: "COMPUTER", purchaseDate: new Date().toISOString().slice(0, 10), purchaseCost: "", usefulLifeYears: "6", notes: "" };
}
function assetFormFromRow(a: AssetRow): AssetFormData {
  return { name: a.name, category: a.category, purchaseDate: a.purchaseDate.slice(0, 10), purchaseCost: String(a.purchaseCost), usefulLifeYears: String(a.usefulLifeYears), notes: a.notes ?? "" };
}

interface Filters {
  from: Date; to: Date;
  channel: string; method: string;
  compare: string; year: number; month: number;
}

interface Props {
  summary:       FinanceSummary;
  compSummary:   FinanceSummary | null;
  annualSummary: FinanceSummary;
  assets:        AssetRow[];
  rates:         RateConfigRow[];
  filters:       Filters;
  compDates:     { from: string; to: string } | null;
}

// ─── Delta badge ─────────────────────────────────────────────

function Delta({ current, prev }: { current: number; prev: number }) {
  const d = deltaPct(current, prev);
  if (d === null) return null;
  const up = d >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-sm ${up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
      {up ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
      {Math.abs(d).toFixed(1)}%
    </span>
  );
}

// ─── Rate edit modal ──────────────────────────────────────────

function RateEditModal({ rate, onSave, onClose }: {
  rate: RateConfigRow;
  onSave: (key: string, value: number, notes: string) => void;
  onClose: () => void;
}) {
  const [val, setVal]     = useState(rate.isPercent ? String((rate.value * 100).toFixed(4)) : String(rate.value));
  const [notes, setNotes] = useState(rate.notes ?? "");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D8BFAE]">
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#5C4A3E]">Editar tasa</p>
          <button onClick={onClose} className="text-[#8E7A6B] hover:text-[#5C4A3E]"><X size={15} strokeWidth={1.5} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs font-medium text-[#5C4A3E]">{rate.label}</p>
          <div className="space-y-1">
            <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">
              {rate.isPercent ? "Tasa base (%)" : "Monto fijo (CLP)"}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" step="0.0001" min="0" value={val}
                onChange={(e) => setVal(e.target.value)}
                className="flex-1 bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
              />
              {rate.isPercent && <span className="text-xs text-[#8E7A6B]">%</span>}
            </div>
            {rate.prevValue !== null && (
              <p className="text-[10px] text-[#8E7A6B]">
                Valor anterior: {rate.isPercent ? `${(rate.prevValue * 100).toFixed(2)}%` : `$${rate.prevValue}`}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Notas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] resize-none" />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-[#D8BFAE] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-1.5 text-[10px] uppercase text-[#8E7A6B] border border-[#D8BFAE] hover:border-[#CDA78F] transition-colors">Cancelar</button>
          <button
            onClick={() => onSave(rate.key, rate.isPercent ? parseFloat(val) / 100 : parseFloat(val), notes)}
            className="px-4 py-1.5 text-[10px] uppercase bg-[#CDA78F] hover:bg-[#8E7A6B] text-white transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export default function FinanzasClient({
  summary, compSummary, annualSummary, assets: initialAssets, rates: initialRates, filters, compDates,
}: Props) {
  const router = useRouter();
  const [tab, setTab]       = useState<Tab>("resumen");
  const [assets, setAssets] = useState(initialAssets);
  const [rates, setRates]   = useState(initialRates);
  const [isPending, start]  = useTransition();
  const [refreshPending, startRefresh] = useTransition();

  // Filters UI state (mirrors URL)
  const [showFilters, setShowFilters]   = useState(false);
  const [selYear, setSelYear]           = useState(filters.year);
  const [selMonth, setSelMonth]         = useState(filters.month);
  const [selFrom, setSelFrom]           = useState(filters.from.toISOString().slice(0, 10));
  const [selTo, setSelTo]               = useState(filters.to.toISOString().slice(0, 10));
  const [useCustomRange, setUseCustomRange] = useState(
    filters.from.getTime() !== new Date(filters.year, filters.month - 1, 1).getTime()
  );
  const [selChannel, setSelChannel]     = useState(filters.channel);
  const [selMethod, setSelMethod]       = useState(filters.method);
  const [selCompare, setSelCompare]     = useState(filters.compare);

  // Commission timing selectors (UI only, affects calculation)
  const [flowTiming, setFlowTiming] = useState<"slow" | "fast">("slow");
  const [mpTiming, setMPTiming]     = useState<"slow" | "fast">("slow");

  // IDPC regime
  const [idpcKey, setIdpcKey]   = useState("idpc.propyme");

  // Asset modal
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset]     = useState<AssetRow | null>(null);
  const [assetForm, setAssetForm]           = useState<AssetFormData>(emptyAssetForm());
  const [assetError, setAssetError]         = useState("");

  // Rate edit modal
  const [editingRate, setEditingRate] = useState<RateConfigRow | null>(null);

  // Refresh result banner
  const [refreshResult, setRefreshResult] = useState<{ updated: string[]; failed: string[]; unchanged: string[] } | null>(null);

  // ── Rate lookups ─────────────────────────────────────────
  const r = useCallback((key: string) => rates.find((r) => r.key === key)?.value ?? 0, [rates]);
  const ivaRate    = r("iva") || 0.19;
  const flowSlow   = r("flow.slow")  || 0.0289;
  const flowFast   = r("flow.fast")  || 0.0319;
  const mpSlow     = r("mp.slow")    || 0.0289;
  const mpFast     = r("mp.fast")    || 0.0319;
  const flowRate   = (flowTiming === "slow" ? flowSlow : flowFast) * (1 + ivaRate);
  const mpRate     = (mpTiming   === "slow" ? mpSlow   : mpFast)   * (1 + ivaRate);
  const idpcRate   = r(idpcKey) || 0.125;

  // ── Combined totals (tienda + eventos) ───────────────────
  const totalVentasBrutas = summary.ventasBrutas + summary.eventVentasBrutas;
  const annTotalVentas    = annualSummary.ventasBrutas + annualSummary.eventVentasBrutas;

  // ── Commission calculations (orders + events, same gateway rates) ──
  const commFlow  = Math.round((summary.ventasFlow + summary.eventVentasFlow) * flowRate);
  const commMP    = Math.round((summary.ventasMP   + summary.eventVentasMP)   * mpRate);
  const commTotal = commFlow + commMP;

  const compCommFlow  = compSummary ? Math.round((compSummary.ventasFlow + compSummary.eventVentasFlow) * flowRate) : 0;
  const compCommMP    = compSummary ? Math.round((compSummary.ventasMP   + compSummary.eventVentasMP)   * mpRate)   : 0;
  const compCommTotal = compCommFlow + compCommMP;

  // Annual commissions
  const annCommFlow  = Math.round((annualSummary.ventasFlow + annualSummary.eventVentasFlow) * flowRate);
  const annCommMP    = Math.round((annualSummary.ventasMP   + annualSummary.eventVentasMP)   * mpRate);
  const annCommTotal = annCommFlow + annCommMP;

  // ── IVA ──────────────────────────────────────────────────
  const debitoFiscal  = ivaFromSale(totalVentasBrutas, ivaRate);
  const creditoFiscal = summary.comprasTaxAmount;
  const ivaNeto       = debitoFiscal - creditoFiscal;
  const compDebito    = compSummary ? ivaFromSale(compSummary.ventasBrutas + compSummary.eventVentasBrutas, ivaRate) : 0;

  // ── Renta (annual) ────────────────────────────────────────
  const annNetIncome    = netIncome(annTotalVentas, ivaRate);
  const annCostPurch    = annualSummary.comprasSubtotal;
  const totalAnnualDepr = useMemo(
    () => assets.reduce((s, a) => s + annualDepr(a.purchaseCost, a.usefulLifeYears), 0), [assets],
  );
  const annResult = annNetIncome - annCostPurch - annCommTotal - totalAnnualDepr;
  const annTax    = annResult > 0 ? Math.round(annResult * idpcRate) : 0;

  // ── Resumen KPIs ──────────────────────────────────────────
  const margenBruto = totalVentasBrutas - summary.comprasSubtotal - commTotal;

  // ── Rate freshness ────────────────────────────────────────
  const gatewayRates   = rates.filter((r) => r.category === "gateway");
  const oldestCheckDay = Math.max(...gatewayRates.map((r) => daysAgo(r.lastChecked) ?? 999));
  const anyChanged     = rates.some((r) => r.lastChanged && r.prevValue !== null && r.prevValue !== r.value);

  // ── Navigate with filters ─────────────────────────────────
  function navigate() {
    const params = new URLSearchParams();
    if (useCustomRange) {
      params.set("from", selFrom);
      params.set("to", selTo);
    } else {
      params.set("year", String(selYear));
      params.set("month", String(selMonth));
    }
    if (selChannel !== "ALL") params.set("channel", selChannel);
    if (selMethod  !== "ALL") params.set("method",  selMethod);
    if (selCompare !== "none") params.set("compare", selCompare);
    router.push(`/admin/finanzas?${params.toString()}`);
  }

  function setQuickRange(type: "this_month" | "prev_month" | "this_quarter" | "this_year") {
    const now = new Date();
    setUseCustomRange(true);
    if (type === "this_month") {
      setSelFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
      setSelTo(now.toISOString().slice(0, 10));
    } else if (type === "prev_month") {
      const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      setSelFrom(new Date(y, m, 1).toISOString().slice(0, 10));
      setSelTo(new Date(y, m + 1, 0).toISOString().slice(0, 10));
    } else if (type === "this_quarter") {
      const q = Math.floor(now.getMonth() / 3);
      setSelFrom(new Date(now.getFullYear(), q * 3, 1).toISOString().slice(0, 10));
      setSelTo(new Date(now.getFullYear(), q * 3 + 3, 0).toISOString().slice(0, 10));
    } else if (type === "this_year") {
      setSelFrom(new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10));
      setSelTo(new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10));
    }
  }

  // ── Asset CRUD ────────────────────────────────────────────
  function openCreate() { setEditingAsset(null); setAssetForm(emptyAssetForm()); setAssetError(""); setShowAssetModal(true); }
  function openEdit(a: AssetRow) { setEditingAsset(a); setAssetForm(assetFormFromRow(a)); setAssetError(""); setShowAssetModal(true); }

  function handleSaveAsset() {
    if (!assetForm.name.trim()) { setAssetError("El nombre es obligatorio"); return; }
    const cost  = Math.round(parseFloat(assetForm.purchaseCost));
    const years = parseInt(assetForm.usefulLifeYears);
    if (!cost || cost <= 0) { setAssetError("El costo debe ser mayor a 0"); return; }
    setAssetError("");
    start(async () => {
      if (editingAsset) {
        const res = await updateFinanceAsset(editingAsset.id, { name: assetForm.name, category: assetForm.category, purchaseDate: assetForm.purchaseDate, purchaseCost: cost, usefulLifeYears: years, notes: assetForm.notes });
        if ("asset" in res) setAssets((p) => p.map((a) => a.id === editingAsset.id ? { ...a, name: assetForm.name, category: assetForm.category, purchaseDate: new Date(assetForm.purchaseDate).toISOString(), purchaseCost: cost, usefulLifeYears: years, notes: assetForm.notes || null } : a));
      } else {
        const res = await createFinanceAsset({ name: assetForm.name, category: assetForm.category, purchaseDate: assetForm.purchaseDate, purchaseCost: cost, usefulLifeYears: years, notes: assetForm.notes });
        if ("asset" in res) setAssets((p) => [...p, { id: res.asset.id, name: res.asset.name, category: String(res.asset.category), purchaseDate: res.asset.purchaseDate.toISOString(), purchaseCost: res.asset.purchaseCost, usefulLifeYears: res.asset.usefulLifeYears, notes: res.asset.notes }].sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate)));
      }
      setShowAssetModal(false);
    });
  }

  function handleDeleteAsset(id: string, name: string) {
    if (!confirm(`¿Eliminar el activo "${name}"?`)) return;
    start(async () => { await deleteFinanceAsset(id); setAssets((p) => p.filter((a) => a.id !== id)); });
  }

  // ── Rate CRUD ─────────────────────────────────────────────
  function handleSaveRate(key: string, value: number, notes: string) {
    start(async () => {
      await updateRateConfig(key, value, notes);
      setRates((prev) => prev.map((r) => r.key === key ? { ...r, value, notes, prevValue: r.value !== value ? r.value : r.prevValue, lastChanged: r.value !== value ? new Date().toISOString() : r.lastChanged } : r));
      setEditingRate(null);
    });
  }

  function handleRefresh() {
    startRefresh(async () => {
      const result = await refreshRatesFromSources();
      setRefreshResult(result);
      // Reload rates from server by navigating (revalidatePath in action will refresh)
      router.refresh();
    });
  }

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const periodLabel = `${filters.from.toLocaleDateString("es-CL")} — ${filters.to.toLocaleDateString("es-CL")}`;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">Economía & Finanzas</h1>
          <p className="text-xs text-[#8E7A6B] mt-0.5">{periodLabel} · {summary.orderCount} ventas · {summary.eventCount} eventos · {summary.purchaseCount} compras</p>
        </div>
        <button onClick={() => setShowFilters((v) => !v)} className={`flex items-center gap-1.5 px-3 py-2 text-[10px] tracking-[0.1em] uppercase border transition-colors ${showFilters ? "bg-[#CDA78F] border-[#CDA78F] text-white" : "bg-[#F7F4F1] border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F]"}`}>
          <SlidersHorizontal size={12} strokeWidth={1.5} /> Filtros avanzados
        </button>
      </div>

      {/* ── Advanced filters panel ───────────────────────────── */}
      {showFilters && (
        <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-5 space-y-4">
          {/* Quick ranges */}
          <div className="space-y-2">
            <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Rangos rápidos</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Este mes",       key: "this_month"  as const },
                { label: "Mes anterior",   key: "prev_month"  as const },
                { label: "Este trimestre", key: "this_quarter"as const },
                { label: "Este año",       key: "this_year"   as const },
              ].map((q) => (
                <button key={q.key} onClick={() => setQuickRange(q.key)} className="px-3 py-1.5 text-[10px] uppercase border border-[#D8BFAE] hover:bg-[#EDE2D8] text-[#5C4A3E] transition-colors">
                  {q.label}
                </button>
              ))}
              <button onClick={() => setUseCustomRange(false)} className="px-3 py-1.5 text-[10px] uppercase border border-[#D8BFAE] hover:bg-[#EDE2D8] text-[#5C4A3E] transition-colors">
                Por mes/año
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Date range or month/year */}
            {useCustomRange ? (
              <>
                <div className="space-y-1">
                  <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Desde</label>
                  <input type="date" value={selFrom} onChange={(e) => setSelFrom(e.target.value)} className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Hasta</label>
                  <input type="date" value={selTo} onChange={(e) => setSelTo(e.target.value)} className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Mes</label>
                  <div className="relative">
                    <select value={selMonth} onChange={(e) => setSelMonth(Number(e.target.value))} className="w-full appearance-none bg-white border border-[#D8BFAE] pl-3 pr-7 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] cursor-pointer">
                      {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Año</label>
                  <div className="relative">
                    <select value={selYear} onChange={(e) => setSelYear(Number(e.target.value))} className="w-full appearance-none bg-white border border-[#D8BFAE] pl-3 pr-7 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] cursor-pointer">
                      {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
                  </div>
                </div>
              </>
            )}

            {/* Channel filter */}
            <div className="space-y-1">
              <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Canal de venta</label>
              <div className="relative">
                <select value={selChannel} onChange={(e) => setSelChannel(e.target.value)} className="w-full appearance-none bg-white border border-[#D8BFAE] pl-3 pr-7 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] cursor-pointer">
                  <option value="ALL">Todos</option>
                  <option value="ONLINE">Solo online</option>
                  <option value="PRESENCIAL">Solo presencial</option>
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
              </div>
            </div>

            {/* Method filter */}
            <div className="space-y-1">
              <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Método de pago</label>
              <div className="relative">
                <select value={selMethod} onChange={(e) => setSelMethod(e.target.value)} className="w-full appearance-none bg-white border border-[#D8BFAE] pl-3 pr-7 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] cursor-pointer">
                  <option value="ALL">Todos</option>
                  <option value="flowPay">Flow Pay</option>
                  <option value="mercadoPago">MercadoPago</option>
                  <option value="transfer">Transferencia</option>
                  <option value="presencial">Presencial</option>
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Comparison */}
          <div className="space-y-2 pt-1 border-t border-[#D8BFAE]">
            <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Comparar con</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "none",       label: "Sin comparación" },
                { value: "prev_month", label: "Período anterior" },
                { value: "prev_year",  label: "Mismo período año anterior" },
              ].map((o) => (
                <label key={o.value} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="compare" value={o.value} checked={selCompare === o.value} onChange={() => setSelCompare(o.value)} className="accent-[#CDA78F]" />
                  <span className="text-[11px] text-[#5C4A3E]">{o.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button onClick={navigate} className="px-5 py-2 text-[10px] tracking-[0.12em] uppercase bg-[#CDA78F] hover:bg-[#8E7A6B] text-white transition-colors">
              Aplicar filtros
            </button>
          </div>
        </div>
      )}

      {/* Rate freshness banner */}
      {oldestCheckDay > STALE_DAYS && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={13} strokeWidth={1.5} className="text-amber-500 shrink-0" />
            <p className="text-[11px] text-amber-700">
              Las tasas de pasarelas no se verifican hace <strong>{oldestCheckDay} días</strong>. Las comisiones podrían haber cambiado.
            </p>
          </div>
          <button onClick={handleRefresh} disabled={refreshPending} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase border border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-700 whitespace-nowrap transition-colors disabled:opacity-50">
            <RefreshCw size={11} strokeWidth={1.5} className={refreshPending ? "animate-spin" : ""} />
            {refreshPending ? "Verificando…" : "Verificar ahora"}
          </button>
        </div>
      )}

      {/* Rate changed alert */}
      {anyChanged && (
        <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 px-4 py-3">
          <Info size={13} strokeWidth={1.5} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-blue-700">
            Se detectaron cambios en tasas recientemente. Los cálculos ya reflejan los nuevos valores. Revisa la pestaña <strong>Tasas</strong> para ver el detalle.
          </p>
        </div>
      )}

      {/* Refresh result */}
      {refreshResult && (
        <div className="bg-[#F7F4F1] border border-[#D8BFAE] px-4 py-3 flex items-start justify-between gap-3">
          <div className="text-[11px] text-[#5C4A3E] space-y-0.5">
            {refreshResult.updated.length > 0 && <p className="text-emerald-600">✓ Actualizadas: {refreshResult.updated.join(", ")}</p>}
            {refreshResult.unchanged.length > 0 && <p className="text-[#8E7A6B]">Sin cambios: {refreshResult.unchanged.slice(0, 4).join(", ")}{refreshResult.unchanged.length > 4 ? "…" : ""}</p>}
            {refreshResult.failed.length > 0 && <p className="text-amber-600">⚠ Requieren revisión manual: {refreshResult.failed.join(", ")}</p>}
          </div>
          <button onClick={() => setRefreshResult(null)} className="text-[#8E7A6B] hover:text-[#5C4A3E] shrink-0"><X size={13} /></button>
        </div>
      )}

      {/* Comparison period label */}
      {compDates && (
        <div className="flex items-center gap-2 text-[10px] text-[#8E7A6B]">
          <Minus size={11} strokeWidth={1.5} />
          Comparando con: {new Date(compDates.from).toLocaleDateString("es-CL")} — {new Date(compDates.to).toLocaleDateString("es-CL")}
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 px-4 py-3">
        <AlertTriangle size={13} strokeWidth={1.5} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-[11px] text-amber-700 leading-relaxed">
          <strong>Estimaciones orientativas</strong> basadas en tus registros. No reemplaza la asesoría de un contador ni la declaración oficial ante el SII.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#D8BFAE]">
        <div className="flex gap-0 overflow-x-auto">
          {([
            { id: "resumen",    label: "Resumen",       icon: TrendingUp   },
            { id: "comisiones", label: "Comisiones",    icon: Percent      },
            { id: "iva",        label: "IVA / F29",     icon: Receipt      },
            { id: "renta",      label: "Renta / IDPC",  icon: Building2    },
            { id: "tasas",      label: "Tasas",         icon: Settings2    },
          ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative flex items-center gap-1.5 px-4 py-3 text-[10px] tracking-[0.12em] uppercase border-b-2 whitespace-nowrap transition-colors ${
                tab === id ? "border-[#CDA78F] text-[#5C4A3E]" : "border-transparent text-[#8E7A6B] hover:text-[#5C4A3E]"
              }`}
            >
              <Icon size={12} strokeWidth={1.5} />
              {label}
              {id === "tasas" && anyChanged && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Resumen ──────────────────────────────────────── */}
      {tab === "resumen" && (
        <div className="space-y-5">
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Ingresos totales",    curr: totalVentasBrutas,  comp: compSummary ? compSummary.ventasBrutas + compSummary.eventVentasBrutas : null, sub: `Tienda ${summary.eventVentasBrutas > 0 ? `+ ${summary.eventCount} eventos` : ""}`.trim() },
              { label: "Comisiones pagadas",  curr: commTotal,          comp: compCommTotal,  sub: "Flow + MercadoPago" },
              { label: "IVA neto",            curr: ivaNeto,            comp: compSummary ? ivaFromSale(compSummary.ventasBrutas + compSummary.eventVentasBrutas, ivaRate) - compSummary.comprasTaxAmount : null, sub: ivaNeto >= 0 ? "A pagar SII" : "Remanente a favor" },
              { label: "Margen bruto aprox.", curr: margenBruto,        comp: compSummary ? (compSummary.ventasBrutas + compSummary.eventVentasBrutas) - compSummary.comprasSubtotal - compCommTotal : null, sub: "Ingresos − compras − comisiones" },
            ].map((k) => (
              <div key={k.label} className="bg-[#F7F4F1] border border-[#D8BFAE] px-4 py-3">
                <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">{k.label}</p>
                <p className="font-heading text-xl text-[#5C4A3E] mt-0.5">{fmt(k.curr)}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-[#8E7A6B]">{k.sub}</p>
                  {k.comp !== null && k.comp !== undefined && <Delta current={k.curr} prev={k.comp} />}
                </div>
              </div>
            ))}
          </div>

          {/* Waterfall */}
          <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-5">
            <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] mb-4">Flujo operativo estimado</p>
            <div className="max-w-sm space-y-2">
              {[
                { label: "(+) Ventas tienda",          value: summary.ventasBrutas,         note: "IVA incluido" },
                ...(summary.eventVentasBrutas > 0 ? [{ label: "(+) Ingresos eventos",       value: summary.eventVentasBrutas,    note: `${summary.eventCount} inscrip. CONFIRMED/PAID` }] : []),
                { label: "(−) IVA en ventas",          value: -debitoFiscal,                note: `${fmtR(ivaRate / (1 + ivaRate))} s/precio total` },
                { label: "(−) Comisiones pasarelas",   value: -commTotal,                   note: "Flow + MP" },
                { label: "(−) Costo compras",          value: -summary.comprasSubtotal,     note: "Ex-IVA" },
                { label: "(+) Crédito fiscal IVA",     value: creditoFiscal,                note: "IVA pagado a proveedores" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-xs border-b border-[#D8BFAE]/50 pb-1.5">
                  <div><span className="text-[#5C4A3E]">{row.label}</span><span className="text-[#8E7A6B] ml-2 text-[10px]">{row.note}</span></div>
                  <span className={row.value >= 0 ? "text-[#5C4A3E] font-medium" : "text-red-500"}>{fmt(row.value)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm font-medium text-[#5C4A3E] pt-1">
                <span className="text-[10px] tracking-[0.1em] uppercase">Resultado operativo estimado</span>
                <span className={`font-heading ${margenBruto >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmt(margenBruto)}</span>
              </div>
              {summary.eventVentasBrutas > 0 && (
                <p className="text-[10px] text-[#8E7A6B] border-t border-[#D8BFAE]/50 pt-2 mt-1">
                  Tienda: {fmt(summary.ventasBrutas)} · Eventos: {fmt(summary.eventVentasBrutas)}
                </p>
              )}
            </div>
          </div>

          {/* Sales breakdown */}
          {summary.ventasBrutas > 0 && (
            <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-5">
              <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] mb-4">Desglose por método de cobro</p>
              <table className="w-full max-w-lg">
                <thead><tr className="border-b border-[#D8BFAE]">
                  {["Canal / Método", "Tx", "Monto", "% total", ...(compSummary ? ["vs período ant."] : [])].map((h) => (
                    <th key={h} className="pb-2 text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B] font-normal text-left pr-4">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-[#D8BFAE]/50">
                  {[
                    { label: "Flow Pay",        curr: summary.ventasFlow,       comp: compSummary?.ventasFlow,       tx: summary.txFlow       },
                    { label: "MercadoPago",     curr: summary.ventasMP,         comp: compSummary?.ventasMP,         tx: summary.txMP         },
                    { label: "Transferencia",   curr: summary.ventasTransfer,   comp: compSummary?.ventasTransfer,   tx: summary.txTransfer   },
                    { label: "Presencial",      curr: summary.ventasPresencial, comp: compSummary?.ventasPresencial, tx: summary.txPresencial },
                  ].filter((row) => row.curr > 0 || (row.comp ?? 0) > 0).map((row) => (
                    <tr key={row.label}>
                      <td className="py-2.5 text-xs text-[#5C4A3E] pr-4">{row.label}</td>
                      <td className="py-2.5 text-xs text-[#8E7A6B] pr-4">{row.tx}</td>
                      <td className="py-2.5 text-xs text-[#5C4A3E] pr-4">{fmt(row.curr)}</td>
                      <td className="py-2.5 text-xs text-[#8E7A6B] pr-4">{totalVentasBrutas > 0 ? (row.curr / totalVentasBrutas * 100).toFixed(1) : "0"}%</td>
                      {compSummary && <td className="py-2.5"><Delta current={row.curr} prev={row.comp ?? 0} /></td>}
                    </tr>
                  ))}
                  {summary.eventVentasBrutas > 0 && (
                    <>
                      <tr><td colSpan={compSummary ? 5 : 4} className="pt-3 pb-1 text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Eventos</td></tr>
                      {[
                        { label: "Eventos — Flow Pay",    curr: summary.eventVentasFlow,     comp: compSummary?.eventVentasFlow,     tx: summary.eventTxFlow     },
                        { label: "Eventos — MercadoPago", curr: summary.eventVentasMP,       comp: compSummary?.eventVentasMP,       tx: summary.eventTxMP       },
                        { label: "Eventos — Transferencia",curr: summary.eventVentasTransfer,comp: compSummary?.eventVentasTransfer, tx: summary.eventTxTransfer },
                        { label: "Eventos — Sin método",  curr: summary.eventVentasBrutas - summary.eventVentasFlow - summary.eventVentasMP - summary.eventVentasTransfer, comp: null, tx: summary.eventCount - summary.eventTxFlow - summary.eventTxMP - summary.eventTxTransfer },
                      ].filter((row) => row.curr > 0).map((row) => (
                        <tr key={row.label}>
                          <td className="py-2.5 text-xs text-[#5C4A3E] pr-4">{row.label}</td>
                          <td className="py-2.5 text-xs text-[#8E7A6B] pr-4">{row.tx}</td>
                          <td className="py-2.5 text-xs text-[#5C4A3E] pr-4">{fmt(row.curr)}</td>
                          <td className="py-2.5 text-xs text-[#8E7A6B] pr-4">{totalVentasBrutas > 0 ? (row.curr / totalVentasBrutas * 100).toFixed(1) : "0"}%</td>
                          {compSummary && <td className="py-2.5">{row.comp != null ? <Delta current={row.curr} prev={row.comp} /> : null}</td>}
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Comisiones ───────────────────────────────────── */}
      {tab === "comisiones" && (
        <div className="space-y-5">
          {/* Timing selectors */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Flow Pay", timingState: flowTiming, setTiming: setFlowTiming, slowKey: "flow.slow", fastKey: "flow.fast", opts: [{ val: "slow" as const, desc: "3 días hábiles", rateKey: "flow.slow" }, { val: "fast" as const, desc: "1 día hábil", rateKey: "flow.fast" }] },
              { label: "MercadoPago", timingState: mpTiming, setTiming: setMPTiming, slowKey: "mp.slow", fastKey: "mp.fast", opts: [{ val: "slow" as const, desc: "En 10 días", rateKey: "mp.slow" }, { val: "fast" as const, desc: "Al instante", rateKey: "mp.fast" }] },
            ].map((gw) => (
              <div key={gw.label} className="bg-[#F7F4F1] border border-[#D8BFAE] p-4 space-y-2">
                <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">{gw.label} — plazo de abono</p>
                {gw.opts.map((o) => {
                  const baseRate = r(o.rateKey);
                  const eff = (baseRate * (1 + ivaRate) * 100).toFixed(2);
                  return (
                    <label key={o.val} className="flex items-start gap-2 cursor-pointer">
                      <input type="radio" checked={gw.timingState === o.val} onChange={() => gw.setTiming(o.val)} className="accent-[#CDA78F] mt-0.5" />
                      <span className="text-[11px] text-[#5C4A3E]">
                        {o.desc} — {(baseRate * 100).toFixed(2)}% base
                        <br /><span className="text-[10px] text-[#8E7A6B]">{eff}% efectivo (inc. IVA {(ivaRate * 100).toFixed(0)}%)</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-5">
            <table className="w-full max-w-2xl">
              <thead><tr className="border-b border-[#D8BFAE]">
                {["Pasarela", "Tx", "Monto total", "Tasa efectiva", "Comisión", ...(compSummary ? ["vs ant."] : [])].map((h) => (
                  <th key={h} className="pb-2 text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B] font-normal text-left pr-4">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-[#D8BFAE]/50">
                {[
                  { label: "Flow Pay",      amt: summary.ventasFlow + summary.eventVentasFlow,     tx: summary.txFlow + summary.eventTxFlow,     comm: commFlow,  rate: flowRate, compComm: compCommFlow  },
                  { label: "MercadoPago",   amt: summary.ventasMP   + summary.eventVentasMP,       tx: summary.txMP   + summary.eventTxMP,       comm: commMP,    rate: mpRate,   compComm: compCommMP    },
                  { label: "Transferencia", amt: summary.ventasTransfer + summary.eventVentasTransfer, tx: summary.txTransfer + summary.eventTxTransfer, comm: 0, rate: 0, compComm: 0 },
                  { label: "Presencial",    amt: summary.ventasPresencial, tx: summary.txPresencial, comm: 0, rate: 0, compComm: 0 },
                ].map((row) => (
                  <tr key={row.label}>
                    <td className="py-3 text-xs text-[#5C4A3E] pr-4">{row.label}</td>
                    <td className="py-3 text-xs text-[#8E7A6B] pr-4">{row.tx}</td>
                    <td className="py-3 text-xs text-[#5C4A3E] pr-4">{fmt(row.amt)}</td>
                    <td className="py-3 text-xs text-[#8E7A6B] pr-4">{row.rate > 0 ? fmtR(row.rate) : "0%"}</td>
                    <td className="py-3 text-xs font-medium pr-4"><span className={row.comm > 0 ? "text-red-500" : "text-[#8E7A6B]"}>{fmt(row.comm)}</span></td>
                    {compSummary && <td className="py-3"><Delta current={row.comm} prev={row.compComm} /></td>}
                  </tr>
                ))}
                <tr className="border-t-2 border-[#D8BFAE]">
                  <td className="py-3 text-xs font-medium text-[#5C4A3E]" colSpan={4}>Total comisiones</td>
                  <td className="py-3 text-sm font-heading text-red-500">{fmt(commTotal)}</td>
                  {compSummary && <td className="py-3"><Delta current={commTotal} prev={compCommTotal} /></td>}
                </tr>
                {totalVentasBrutas > 0 && (
                  <tr>
                    <td className="pb-1 text-[10px] text-[#8E7A6B]" colSpan={4}>% sobre ingresos totales</td>
                    <td className="pb-1 text-[10px] text-[#8E7A6B]">{fmtR(commTotal / totalVentasBrutas)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Cuotas info */}
          <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 px-4 py-3">
            <Info size={13} strokeWidth={1.5} className="text-blue-400 mt-0.5 shrink-0" />
            <div className="text-[11px] text-blue-700 space-y-1">
              <p><strong>Cuotas Flow (Webpay):</strong> cargo adicional sobre la tasa base — 2–3 cuotas: +{(r("flow.cuotas.2_3") * 100).toFixed(2)}%+IVA · 4–6: +{(r("flow.cuotas.4_6") * 100).toFixed(2)}%+IVA · 7–12: +{(r("flow.cuotas.7_12") * 100).toFixed(2)}%+IVA.</p>
              <p><strong>Devoluciones Flow:</strong> ${r("flow.refund").toLocaleString("es-CL")} CLP + IVA por transacción reembolsada. Estos cargos no están incluidos en el cálculo anterior.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: IVA / F29 ────────────────────────────────────── */}
      {tab === "iva" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-5 space-y-3">
              <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Débito fiscal</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#8E7A6B]"><span>Ingresos totales (IVA inc.)</span><span>{fmt(totalVentasBrutas)}</span></div>
                {summary.eventVentasBrutas > 0 && (
                  <div className="flex justify-between text-[10px] text-[#8E7A6B] pl-2">
                    <span>· Tienda: {fmt(summary.ventasBrutas)} + Eventos: {fmt(summary.eventVentasBrutas)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#8E7A6B]"><span>IVA tasa vigente</span><span>{fmtR(ivaRate)} ({fmtR(ivaRate / (1 + ivaRate))} s/precio)</span></div>
                <div className="flex justify-between font-medium text-[#5C4A3E] border-t border-[#D8BFAE] pt-1.5">
                  <span>Débito fiscal</span>
                  <div className="flex items-center gap-2">{compSummary && <Delta current={debitoFiscal} prev={compDebito} />}<span className="font-heading text-base">{fmt(debitoFiscal)}</span></div>
                </div>
              </div>
            </div>
            <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-5 space-y-3">
              <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Crédito fiscal</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#8E7A6B]"><span>Compras recibidas (ex-IVA)</span><span>{fmt(summary.comprasSubtotal)}</span></div>
                <div className="flex justify-between text-[#8E7A6B]"><span>Compras registradas</span><span>{summary.purchaseCount}</span></div>
                <div className="flex justify-between font-medium text-[#5C4A3E] border-t border-[#D8BFAE] pt-1.5">
                  <span>Crédito fiscal</span><span className="font-heading text-base">{fmt(creditoFiscal)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={`border p-5 ${ivaNeto >= 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">IVA neto = débito − crédito</p>
                <p className={`font-heading text-2xl mt-1 ${ivaNeto >= 0 ? "text-red-600" : "text-emerald-600"}`}>{fmt(ivaNeto)}</p>
                <p className={`text-xs mt-1 ${ivaNeto >= 0 ? "text-red-500" : "text-emerald-600"}`}>
                  {ivaNeto >= 0 ? "A pagar al SII en el F29" : "Remanente de crédito fiscal — se arrastra al mes siguiente"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Fecha límite F29</p>
                <p className="text-sm text-[#5C4A3E] font-medium mt-0.5">
                  12 de {MONTHS[filters.month % 12]} {filters.month === 12 ? filters.year + 1 : filters.year}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 px-4 py-3">
            <AlertTriangle size={13} strokeWidth={1.5} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="text-[11px] text-amber-700 space-y-1">
              <p>El crédito fiscal real requiere facturas electrónicas válidas ingresadas por tus proveedores al SII.</p>
              <p>Declara el F29 mensualmente en <strong>sii.cl → Mi SII → Declarar y pagar</strong>, vence el día 12 del mes siguiente.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Renta / IDPC ─────────────────────────────────── */}
      {tab === "renta" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Impuesto a la Renta — Año {filters.year} (acumulado)</p>
            <div className="flex items-center gap-2">
              <label className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Régimen:</label>
              <div className="relative">
                <select value={idpcKey} onChange={(e) => setIdpcKey(e.target.value)} className="appearance-none bg-[#F7F4F1] border border-[#D8BFAE] pl-3 pr-8 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] cursor-pointer">
                  {rates.filter((r) => r.category === "tax" && r.key.startsWith("idpc")).map((r) => (
                    <option key={r.key} value={r.key}>{r.label} ({(r.value * 100).toFixed(1)}%)</option>
                  ))}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-5">
            <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] mb-4">Base imponible estimada</p>
            <div className="max-w-sm space-y-2">
              {[
                { label: "(+) Ingresos netos (ex-IVA)",   value: annNetIncome,     note: `Tienda + Eventos × 100/${(1 + ivaRate) * 100 | 0}` },
                { label: "(−) Costo de compras (ex-IVA)", value: -annCostPurch,    note: "Compras recibidas" },
                { label: "(−) Comisiones pasarelas",      value: -annCommTotal,    note: "Flow + MP año" },
                { label: "(−) Depreciación activos",      value: -totalAnnualDepr, note: "Tabla SII" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-xs border-b border-[#D8BFAE]/50 pb-1.5">
                  <div><span className="text-[#5C4A3E]">{row.label}</span><span className="text-[#8E7A6B] ml-2 text-[10px]">{row.note}</span></div>
                  <span className={row.value >= 0 ? "text-[#5C4A3E] font-medium" : "text-red-500"}>{fmt(row.value)}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs py-1.5 border-b border-[#D8BFAE]/50">
                <span className="text-[#5C4A3E]">Resultado antes de impuesto</span>
                <span className={`font-medium ${annResult >= 0 ? "text-[#5C4A3E]" : "text-emerald-600"}`}>{fmt(annResult)}</span>
              </div>
              <div className="flex justify-between text-xs py-1.5 border-b border-[#D8BFAE]/50 text-[#8E7A6B]">
                <span>Tasa IDPC ({(idpcRate * 100).toFixed(1)}%)</span>
                <span>× {(idpcRate * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-[10px] tracking-[0.1em] uppercase text-[#5C4A3E]">Impuesto estimado IDPC</span>
                <span className={`font-heading text-lg ${annTax > 0 ? "text-red-500" : "text-emerald-600"}`}>{annTax > 0 ? fmt(annTax) : "Sin resultado positivo"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 px-4 py-3">
            <AlertTriangle size={13} strokeWidth={1.5} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="text-[11px] text-amber-700 space-y-1">
              <p>Tasa Pro PyME 12.5% transitoria: rige 2025–2027, sube a 15% en 2028 y a 25% desde 2029. Actualiza la tasa en la pestaña <strong>Tasas</strong> cuando corresponda.</p>
              <p>Impuesto real se declara en <strong>Formulario 22</strong> cada abril. No incluye gastos no registrados en el sistema.</p>
            </div>
          </div>

          {/* Assets */}
          <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Activos fijos y depreciación</p>
              <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase bg-[#CDA78F] hover:bg-[#8E7A6B] text-white transition-colors">
                <Plus size={11} strokeWidth={1.75} /> Agregar
              </button>
            </div>
            {assets.length === 0 ? (
              <p className="text-xs text-[#8E7A6B] py-4 text-center">Sin activos. Agrega computadores, vitrinas, equipos, etc.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px]">
                  <thead><tr className="border-b border-[#D8BFAE]">
                    {["Nombre", "Categoría", "Fecha", "Costo", "Vida útil", "Depr./año", "Acumulada", "Valor libro", ""].map((h) => (
                      <th key={h} className="pb-2 text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B] font-normal text-left pr-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-[#D8BFAE]/50">
                    {assets.map((a) => {
                      const catLabel = ASSET_CATEGORIES.find((c) => c.value === a.category)?.label ?? a.category;
                      const da = annualDepr(a.purchaseCost, a.usefulLifeYears);
                      const ac = accumulatedDepr(a.purchaseCost, a.usefulLifeYears, a.purchaseDate);
                      const bv = bookValue(a.purchaseCost, a.usefulLifeYears, a.purchaseDate);
                      return (
                        <tr key={a.id}>
                          <td className="py-2.5 text-xs text-[#5C4A3E] pr-3">{a.name}</td>
                          <td className="py-2.5 text-[11px] text-[#8E7A6B] pr-3 whitespace-nowrap">{catLabel}</td>
                          <td className="py-2.5 text-[11px] text-[#8E7A6B] pr-3 whitespace-nowrap">{new Date(a.purchaseDate).toLocaleDateString("es-CL")}</td>
                          <td className="py-2.5 text-xs text-[#5C4A3E] pr-3">{fmt(a.purchaseCost)}</td>
                          <td className="py-2.5 text-[11px] text-[#8E7A6B] pr-3 text-center">{a.usefulLifeYears}a</td>
                          <td className="py-2.5 text-xs text-[#5C4A3E] pr-3">{fmt(da)}</td>
                          <td className="py-2.5 text-xs text-[#8E7A6B] pr-3">{fmt(ac)}</td>
                          <td className="py-2.5 text-xs font-medium text-[#5C4A3E] pr-3">{fmt(bv)}</td>
                          <td className="py-2.5">
                            <div className="flex gap-1.5">
                              <button onClick={() => openEdit(a)} className="text-[#D8BFAE] hover:text-[#8E7A6B]"><Pencil size={11} strokeWidth={1.5} /></button>
                              <button onClick={() => handleDeleteAsset(a.id, a.name)} className="text-[#D8BFAE] hover:text-red-400"><Trash2 size={11} strokeWidth={1.5} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot><tr className="border-t-2 border-[#D8BFAE]">
                    <td colSpan={5} className="pt-2 text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Total depreciación anual (deducible)</td>
                    <td className="pt-2 text-xs font-medium text-[#5C4A3E]">{fmt(totalAnnualDepr)}</td>
                    <td colSpan={3} />
                  </tr></tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Tasas ────────────────────────────────────────── */}
      {tab === "tasas" && (
        <div className="space-y-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Tasas y comisiones vigentes</p>
              <p className="text-xs text-[#8E7A6B] mt-0.5">
                {oldestCheckDay < 999 ? `Verificadas hace ${oldestCheckDay} días` : "Sin verificación automática aún"}
                {" · "}{anyChanged && <span className="text-amber-600">hay cambios recientes</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshPending}
                className="flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-[0.12em] uppercase bg-[#CDA78F] hover:bg-[#8E7A6B] text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw size={11} strokeWidth={1.5} className={refreshPending ? "animate-spin" : ""} />
                {refreshPending ? "Verificando fuentes…" : "Verificar desde fuentes oficiales"}
              </button>
            </div>
          </div>

          {/* Gateway rates */}
          {["gateway", "tax"].map((cat) => (
            <div key={cat} className="bg-[#F7F4F1] border border-[#D8BFAE] p-5 space-y-3">
              <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">
                {cat === "gateway" ? "Pasarelas de pago" : "Impuestos SII"}
              </p>
              <table className="w-full">
                <thead><tr className="border-b border-[#D8BFAE]">
                  {["Tasa", "Valor actual", "Anterior", "Último cambio", "Verificado", "Fuente", ""].map((h) => (
                    <th key={h} className="pb-2 text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B] font-normal text-left pr-4">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-[#D8BFAE]/50">
                  {rates.filter((r) => r.category === cat).map((rate) => {
                    const changed = rate.prevValue !== null && rate.prevValue !== rate.value;
                    const checkAge = daysAgo(rate.lastChecked);
                    return (
                      <tr key={rate.key}>
                        <td className="py-2.5 pr-4">
                          <p className="text-xs text-[#5C4A3E]">{rate.label}</p>
                          {rate.notes && <p className="text-[10px] text-[#8E7A6B] mt-0.5 max-w-xs">{rate.notes}</p>}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className={`text-xs font-medium ${changed ? "text-amber-600" : "text-[#5C4A3E]"}`}>
                            {rate.isPercent ? `${(rate.value * 100).toFixed(2)}%` : `$${rate.value}`}
                          </span>
                          {changed && <span className="ml-1.5 text-[9px] uppercase bg-amber-100 text-amber-600 px-1.5 py-0.5">cambiado</span>}
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-[#8E7A6B]">
                          {rate.prevValue !== null ? (rate.isPercent ? `${(rate.prevValue * 100).toFixed(2)}%` : `$${rate.prevValue}`) : "—"}
                        </td>
                        <td className="py-2.5 pr-4 text-[11px] text-[#8E7A6B] whitespace-nowrap">
                          {rate.lastChanged ? new Date(rate.lastChanged).toLocaleDateString("es-CL") : "—"}
                        </td>
                        <td className="py-2.5 pr-4">
                          {checkAge !== null ? (
                            <span className={`text-[10px] px-2 py-0.5 ${checkAge <= 7 ? "bg-emerald-50 text-emerald-600" : checkAge <= 30 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-400"}`}>
                              {checkAge === 0 ? "hoy" : `hace ${checkAge}d`}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#D8BFAE]">nunca</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4">
                          {rate.sourceUrl ? (
                            <a href={rate.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-[#8E7A6B] hover:text-[#5C4A3E]">
                              <ExternalLink size={10} strokeWidth={1.5} /> Fuente
                            </a>
                          ) : "—"}
                        </td>
                        <td className="py-2.5">
                          <button onClick={() => setEditingRate(rate)} className="text-[#D8BFAE] hover:text-[#8E7A6B] transition-colors">
                            <Pencil size={11} strokeWidth={1.5} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}

          <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 px-4 py-3">
            <ShieldCheck size={13} strokeWidth={1.5} className="text-blue-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-blue-700">
              <strong>Flow Pay</strong> se verifica automáticamente desde su página oficial. <strong>MercadoPago</strong> puede requerir verificación manual si la página no es accesible. Las tasas SII (IVA, IDPC) son legislativas — actualízalas manualmente cuando el SII emita cambios.
            </p>
          </div>
        </div>
      )}

      {/* ── Asset modal ───────────────────────────────────────── */}
      {showAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8BFAE]">
              <h2 className="text-[10px] tracking-[0.2em] uppercase text-[#5C4A3E]">{editingAsset ? "Editar activo" : "Agregar activo fijo"}</h2>
              <button onClick={() => setShowAssetModal(false)} className="text-[#8E7A6B] hover:text-[#5C4A3E]"><X size={15} strokeWidth={1.5} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {assetError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2">{assetError}</p>}
              <div className="space-y-1">
                <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Nombre *</label>
                <input value={assetForm.name} onChange={(e) => setAssetForm((f) => ({ ...f, name: e.target.value }))} placeholder="MacBook Pro, Vitrina exhibidora…" className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Categoría *</label>
                <div className="relative">
                  <select value={assetForm.category} onChange={(e) => { const meta = ASSET_CATEGORIES.find((c) => c.value === e.target.value); setAssetForm((f) => ({ ...f, category: e.target.value, usefulLifeYears: String(meta?.defaultYears ?? f.usefulLifeYears) })); }} className="w-full appearance-none bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] cursor-pointer">
                    {ASSET_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label} — {c.defaultYears} años SII</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Fecha de compra *</label>
                  <input type="date" value={assetForm.purchaseDate} onChange={(e) => setAssetForm((f) => ({ ...f, purchaseDate: e.target.value }))} className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Costo (CLP) *</label>
                  <input type="number" min="1" value={assetForm.purchaseCost} onChange={(e) => setAssetForm((f) => ({ ...f, purchaseCost: e.target.value }))} placeholder="250000" className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Vida útil (años SII)</label>
                <input type="number" min="1" max="50" value={assetForm.usefulLifeYears} onChange={(e) => setAssetForm((f) => ({ ...f, usefulLifeYears: e.target.value }))} className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                {assetForm.purchaseCost && parseFloat(assetForm.purchaseCost) > 0 && (
                  <p className="text-[10px] text-[#8E7A6B]">Depreciación anual: {fmt(annualDepr(parseFloat(assetForm.purchaseCost), parseInt(assetForm.usefulLifeYears)))}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Notas</label>
                <input value={assetForm.notes} onChange={(e) => setAssetForm((f) => ({ ...f, notes: e.target.value }))} placeholder="N° serie, marca, proveedor…" className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#D8BFAE] flex justify-end gap-3">
              <button onClick={() => setShowAssetModal(false)} className="px-5 py-2 text-[10px] uppercase text-[#8E7A6B] border border-[#D8BFAE] hover:border-[#CDA78F] transition-colors">Cancelar</button>
              <button onClick={handleSaveAsset} disabled={isPending} className="flex items-center gap-1.5 px-5 py-2 text-[10px] uppercase bg-[#CDA78F] hover:bg-[#8E7A6B] text-white transition-colors disabled:opacity-50">
                {isPending ? "Guardando…" : <><Save size={11} strokeWidth={1.5} /> {editingAsset ? "Guardar" : "Agregar"}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rate edit modal ───────────────────────────────────── */}
      {editingRate && (
        <RateEditModal
          rate={editingRate}
          onSave={handleSaveRate}
          onClose={() => setEditingRate(null)}
        />
      )}
    </div>
  );
}
