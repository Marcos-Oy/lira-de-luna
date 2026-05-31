"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Package, CreditCard, Users, TrendingUp, CalendarDays } from "lucide-react";

// ── Period helpers (shared logic with pagos) ──────────────────
type Preset = "thisMonth" | "lastMonth" | "last3months" | "last6months" | "thisYear" | "allTime" | "custom";

function getPresetDates(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const lastDay = (yr: number, mo: number) => new Date(yr, mo + 1, 0);

  if (preset === "thisMonth")
    return { from: iso(new Date(y, m, 1)),       to: iso(lastDay(y, m)) };
  if (preset === "lastMonth") {
    const lm = m === 0 ? 11 : m - 1;
    const ly = m === 0 ? y - 1 : y;
    return { from: iso(new Date(ly, lm, 1)),     to: iso(lastDay(ly, lm)) };
  }
  if (preset === "last3months")
    return { from: iso(new Date(y, m - 2, 1)),   to: iso(lastDay(y, m)) };
  if (preset === "last6months")
    return { from: iso(new Date(y, m - 5, 1)),   to: iso(lastDay(y, m)) };
  if (preset === "thisYear")
    return { from: iso(new Date(y, 0, 1)),        to: iso(new Date(y, 11, 31)) };
  if (preset === "allTime")
    return { from: "1970-01-01",                  to: "2099-12-31" };
  return { from: iso(new Date(y, m, 1)),          to: iso(lastDay(y, m)) };
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
  thisMonth:   "Este mes",
  lastMonth:   "Mes anterior",
  last3months: "3 meses",
  last6months: "6 meses",
  thisYear:    "Este año",
  allTime:     "Histórico",
  custom:      "Personalizado",
};

// ── Chart / status constants ──────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  PENDING:    "#F59E0B", PAID:       "#3B82F6", PROCESSING: "#F97316",
  SHIPPED:    "#6366F1", DELIVERED:  "#10B981", CANCELLED:  "#EF4444", REFUNDED:   "#8B5CF6",
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente", PAID: "Pagado",      PROCESSING: "Procesando",
  SHIPPED: "Enviado",   DELIVERED: "Entregado", CANCELLED: "Cancelado", REFUNDED: "Reembolsado",
};
const STATUS_STYLES: Record<string, string> = {
  PENDING:    "bg-[#EDE2D8] text-[#8E7A6B]",   PAID:       "bg-blue-50 text-blue-600",
  PROCESSING: "bg-orange-50 text-orange-600",   SHIPPED:    "bg-indigo-50 text-indigo-600",
  DELIVERED:  "bg-emerald-50 text-emerald-600", CANCELLED:  "bg-red-50 text-red-400",
  REFUNDED:   "bg-purple-50 text-purple-500",
};

type TrafficLight = "green" | "orange" | "red" | "neutral";
function getTrafficLight(g: number | null): TrafficLight {
  if (g === null) return "neutral";
  if (g > 0)      return "green";
  if (g >= -20)   return "orange";
  return "red";
}
const TL = {
  green:   { badge: "bg-emerald-100 text-emerald-700", arrow: "↑" },
  orange:  { badge: "bg-orange-100 text-orange-600",   arrow: "→" },
  red:     { badge: "bg-red-100 text-red-600",          arrow: "↓" },
  neutral: { badge: "",                                 arrow: "" },
};

// ── Props ─────────────────────────────────────────────────────
interface Props {
  kpis: {
    revenue: number; revenueGrowth: number | null;
    orderCount: number; orderGrowth: number | null;
    productCount: number; userCount: number;
  };
  monthlySales: { month: string; label: string; revenue: number; orders: number }[];
  statusDistribution: { status: string; label: string; count: number }[];
  recentOrders: {
    id: string; orderNumber: string; customerName: string;
    productName: string; total: number; status: string; createdAt: string;
  }[];
  bestsellers: { id: string; name: string; price: number; orderItemCount: number }[];
  noSalesCount: number;
  statsDateFrom: string;
  statsDateTo: string;
}

// ── Component ─────────────────────────────────────────────────
export default function DashboardClient({
  kpis, monthlySales, statusDistribution, recentOrders, bestsellers, noSalesCount,
  statsDateFrom, statsDateTo,
}: Props) {
  const router = useRouter();
  const sp     = useSearchParams();

  const activePreset = detectPreset(statsDateFrom, statsDateTo);
  const [customFrom, setCustomFrom] = useState(statsDateFrom);
  const [customTo,   setCustomTo]   = useState(statsDateTo);
  const [showCustom, setShowCustom] = useState(false);

  const navigateStats = useCallback((from: string, to: string) => {
    const next = new URLSearchParams(sp.toString());
    next.set("statsFrom", from);
    next.set("statsTo",   to);
    router.push(`/admin?${next.toString()}`);
  }, [router, sp]);

  function selectPreset(preset: Preset) {
    if (preset === "custom") { setShowCustom(true); return; }
    setShowCustom(false);
    const { from, to } = getPresetDates(preset);
    navigateStats(from, to);
  }

  function applyCustom() {
    if (customFrom && customTo) navigateStats(customFrom, customTo);
  }

  const periodLabel = (() => {
    const fmt = (s: string) =>
      new Date(s + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
    if (activePreset === "thisMonth") {
      const d = new Date(statsDateFrom + "T12:00:00");
      return d.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
    }
    if (activePreset === "allTime") return "Histórico completo";
    return `${fmt(statsDateFrom)} — ${fmt(statsDateTo)}`;
  })();

  const growthLabel = activePreset === "thisMonth"    ? "vs mes anterior"
    : activePreset === "lastMonth"   ? "vs mes previo"
    : activePreset === "allTime"     ? ""
    : "vs período anterior";

  const totalOrders = statusDistribution.reduce((s, d) => s + d.count, 0);
  const maxCount    = Math.max(...bestsellers.map((b) => b.orderItemCount), 1);

  const cards = [
    {
      label: "Ingresos entregados",
      value: `$${kpis.revenue.toLocaleString("es-CL")}`,
      suffix: "CLP",
      icon: TrendingUp,
      growth: kpis.revenueGrowth,
      tl: getTrafficLight(kpis.revenueGrowth),
    },
    {
      label: "Pedidos",
      value: kpis.orderCount.toString(),
      suffix: kpis.orderCount === 1 ? "pedido" : "pedidos",
      icon: CreditCard,
      growth: kpis.orderGrowth,
      tl: getTrafficLight(kpis.orderGrowth),
    },
    {
      label: "Productos activos",
      value: kpis.productCount.toString(),
      suffix: "en catálogo",
      icon: Package,
      growth: null,
      tl: "neutral" as TrafficLight,
    },
    {
      label: "Clientes registrados",
      value: kpis.userCount.toString(),
      suffix: "en total",
      icon: Users,
      growth: null,
      tl: "neutral" as TrafficLight,
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl">

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
              <button
                key={p}
                onClick={() => selectPreset(p)}
                className={`text-[9px] tracking-[0.1em] uppercase px-3 py-1.5 transition-colors ${
                  activePreset === p || (p === "custom" && showCustom)
                    ? "bg-[#5C4A3E] text-white"
                    : "bg-white border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F]"
                }`}
              >
                {PRESET_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {(showCustom || activePreset === "custom") && (
          <div className="flex flex-wrap items-end gap-3 pt-1 border-t border-[#EDE2D8]">
            <div className="space-y-1">
              <label className="block text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Desde</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-white border border-[#D8BFAE] text-xs text-[#5C4A3E] px-3 py-2 outline-none focus:border-[#CDA78F]"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Hasta</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-white border border-[#D8BFAE] text-xs text-[#5C4A3E] px-3 py-2 outline-none focus:border-[#CDA78F]"
              />
            </div>
            <button
              onClick={applyCustom}
              disabled={!customFrom || !customTo}
              className="text-[10px] tracking-[0.12em] uppercase px-5 py-2 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white disabled:opacity-40 transition-colors"
            >
              Aplicar
            </button>
          </div>
        )}
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-[#F7F4F1] border border-[#D8BFAE] p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[10px] tracking-[0.15em] uppercase text-[#8E7A6B] leading-tight">{c.label}</p>
              <c.icon size={14} strokeWidth={1.5} className="text-[#CDA78F] mt-0.5 shrink-0" />
            </div>
            <div className="flex items-end justify-between gap-2">
              <div>
                <span className="font-heading text-2xl text-[#5C4A3E]">{c.value}</span>
                <span className="text-[10px] text-[#8E7A6B] ml-1.5">{c.suffix}</span>
              </div>
              {c.growth !== null && (
                <span className={`text-[10px] px-2 py-0.5 font-medium shrink-0 ${TL[c.tl].badge}`}>
                  {TL[c.tl].arrow} {Math.abs(c.growth)}%
                </span>
              )}
            </div>
            {c.growth !== null && growthLabel && (
              <p className="text-[9px] text-[#8E7A6B] mt-1.5">{growthLabel}</p>
            )}
          </div>
        ))}
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Area chart — period revenue */}
        <div className="lg:col-span-2 bg-[#F7F4F1] border border-[#D8BFAE]">
          <div className="px-6 py-4 border-b border-[#D8BFAE] flex items-center justify-between">
            <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">
              Ventas por mes
            </h2>
            <span className="text-[10px] text-[#8E7A6B]">{periodLabel}</span>
          </div>
          <div className="p-4" style={{ height: 220 }}>
            {monthlySales.length === 0 || monthlySales.every((m) => m.revenue === 0) ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-[#8E7A6B]">Sin ventas en este período</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlySales} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#CDA78F" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#CDA78F" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EDE2D8" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#8E7A6B" }}
                    axisLine={false} tickLine={false}
                    interval={monthlySales.length > 12 ? Math.floor(monthlySales.length / 8) : 0}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#8E7A6B" }}
                    axisLine={false} tickLine={false} width={52}
                    tickFormatter={(v: number) =>
                      v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1_000   ? `$${(v / 1_000).toFixed(0)}k`
                      : `$${v}`
                    }
                  />
                  <Tooltip
                    contentStyle={{ background: "#F7F4F1", border: "1px solid #D8BFAE", borderRadius: 0, fontSize: 11, color: "#5C4A3E" }}
                    formatter={(value) => [`$${(value as number).toLocaleString("es-CL")} CLP`, "Ingresos"]}
                  />
                  <Area
                    type="monotone" dataKey="revenue"
                    stroke="#CDA78F" strokeWidth={2} fill="url(#gradRevenue)"
                    dot={{ r: 3, fill: "#CDA78F", strokeWidth: 0 }}
                    activeDot={{ r: 4, fill: "#8E7A6B" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pie chart — order status */}
        <div className="bg-[#F7F4F1] border border-[#D8BFAE]">
          <div className="px-6 py-4 border-b border-[#D8BFAE]">
            <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">Estado de pedidos</h2>
          </div>
          {statusDistribution.length === 0 || totalOrders === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-xs text-[#8E7A6B]">Sin pedidos en este período</p>
            </div>
          ) : (
            <div className="px-4 pt-2 pb-4">
              <div style={{ height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution} dataKey="count" nameKey="label"
                      cx="50%" cy="50%" innerRadius="38%" outerRadius="68%"
                      paddingAngle={2} strokeWidth={0}
                    >
                      {statusDistribution.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#D8BFAE"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#F7F4F1", border: "1px solid #D8BFAE", borderRadius: 0, fontSize: 11, color: "#5C4A3E" }}
                      formatter={(value, name) => {
                        const v = value as number;
                        return [`${v} pedido${v !== 1 ? "s" : ""} (${Math.round((v / totalOrders) * 100)}%)`, name as string];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-1 gap-1.5 mt-3">
                {statusDistribution.map((d) => (
                  <div key={d.status} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[d.status] ?? "#D8BFAE" }} />
                    <span className="text-[10px] text-[#8E7A6B] flex-1">{d.label}</span>
                    <span className="text-[10px] text-[#5C4A3E] font-medium">{Math.round((d.count / totalOrders) * 100)}%</span>
                    <span className="text-[10px] text-[#8E7A6B]">({d.count})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent orders + Bestsellers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 bg-[#F7F4F1] border border-[#D8BFAE]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8BFAE]">
            <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">Pedidos recientes</h2>
            <a href="/admin/pagos" className="text-[10px] tracking-wide text-[#CDA78F] hover:text-[#8E7A6B] underline underline-offset-4 transition-colors">
              Ver todos
            </a>
          </div>
          {recentOrders.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-xs text-[#8E7A6B]">Sin pedidos aún</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#EDE2D8]">
                    {["ID", "Cliente", "Producto", "Total", "Estado", "Fecha"].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDE2D8]">
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-[#EDE2D8]/40 transition-colors">
                      <td className="px-6 py-3.5 text-xs text-[#CDA78F] font-medium">#{o.orderNumber}</td>
                      <td className="px-6 py-3.5 text-xs text-[#5C4A3E]">{o.customerName}</td>
                      <td className="px-6 py-3.5 text-xs text-[#8E7A6B] max-w-[160px] truncate">{o.productName}</td>
                      <td className="px-6 py-3.5 text-xs text-[#5C4A3E] font-medium">${o.total.toLocaleString("es-CL")} CLP</td>
                      <td className="px-6 py-3.5">
                        <span className={`text-[9px] tracking-[0.1em] uppercase px-2.5 py-1 ${STATUS_STYLES[o.status] ?? "bg-[#EDE2D8] text-[#8E7A6B]"}`}>
                          {STATUS_LABEL[o.status] ?? o.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-[#8E7A6B]">
                        {new Date(o.createdAt).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-[#F7F4F1] border border-[#D8BFAE]">
          <div className="px-6 py-4 border-b border-[#D8BFAE]">
            <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">Productos más vendidos</h2>
          </div>
          {bestsellers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-xs text-[#8E7A6B]">Sin productos activos aún</p>
            </div>
          ) : (
            <div className="p-6 space-y-5">
              {bestsellers.map((p, i) => (
                <div key={p.id}>
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] text-[#CDA78F] font-medium w-4">{i + 1}.</span>
                      <p className="text-xs text-[#5C4A3E] leading-tight">{p.name}</p>
                    </div>
                    <p className="text-xs text-[#5C4A3E] font-medium shrink-0 ml-2">${p.price.toLocaleString("es-CL")}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-6">
                    <div className="flex-1 h-1 bg-[#EDE2D8] overflow-hidden">
                      <div className="h-full bg-[#CDA78F]" style={{ width: `${(p.orderItemCount / maxCount) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-[#8E7A6B] shrink-0">{p.orderItemCount} uds.</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {noSalesCount > 0 && (
            <div className="px-6 py-3 border-t border-[#EDE2D8] flex items-center justify-between">
              <span className="text-[10px] text-[#8E7A6B]">
                Sin ventas
              </span>
              <a
                href="/admin/productos"
                className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 hover:bg-amber-100 transition-colors"
              >
                {noSalesCount} {noSalesCount === 1 ? "producto" : "productos"}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
