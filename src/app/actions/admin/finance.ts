"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { AdminJWTPayload } from "@/controllers/admin-auth.controller";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) throw new Error("No autorizado");
  try {
    return jwt.verify(token, process.env.ADMIN_JWT_SECRET!) as AdminJWTPayload;
  } catch {
    throw new Error("No autorizado");
  }
}

// ─── Default rate definitions ────────────────────────────────

const DEFAULT_RATES: Omit<import("@prisma/client").RateConfig, "id" | "updatedAt" | "lastChecked" | "lastChanged" | "prevValue">[] = [
  // Flow Pay
  { key: "flow.slow",         label: "Flow Pay — 3 días hábiles (base)",   category: "gateway", value: 0.0289, isPercent: true,  sourceUrl: "https://web.flow.cl/tarifas/", notes: "Tasa base sin IVA. IVA se aplica encima: × 1.19" },
  { key: "flow.fast",         label: "Flow Pay — 1 día hábil (base)",      category: "gateway", value: 0.0319, isPercent: true,  sourceUrl: "https://web.flow.cl/tarifas/", notes: null },
  { key: "flow.cuotas.2_3",   label: "Flow — Cuotas 2–3 (cargo adicional)",category: "gateway", value: 0.0199, isPercent: true,  sourceUrl: "https://web.flow.cl/tarifas/", notes: "Se suma a la tasa base" },
  { key: "flow.cuotas.4_6",   label: "Flow — Cuotas 4–6 (cargo adicional)",category: "gateway", value: 0.0349, isPercent: true,  sourceUrl: "https://web.flow.cl/tarifas/", notes: "Se suma a la tasa base" },
  { key: "flow.cuotas.7_12",  label: "Flow — Cuotas 7–12 (cargo adicional)",category:"gateway", value: 0.0699, isPercent: true,  sourceUrl: "https://web.flow.cl/tarifas/", notes: "Se suma a la tasa base" },
  { key: "flow.refund",       label: "Flow — Cargo por devolución",         category: "gateway", value: 202,   isPercent: false, sourceUrl: "https://web.flow.cl/tarifas/", notes: "CLP fijos + IVA por transacción reembolsada" },
  // MercadoPago
  { key: "mp.slow",           label: "MercadoPago — En 10 días (base)",    category: "gateway", value: 0.0289, isPercent: true,  sourceUrl: "https://www.mercadopago.cl/ayuda/costo-recibir-pagos-dinero_220", notes: "Tasa base sin IVA" },
  { key: "mp.fast",           label: "MercadoPago — Al instante (base)",   category: "gateway", value: 0.0319, isPercent: true,  sourceUrl: "https://www.mercadopago.cl/ayuda/costo-recibir-pagos-dinero_220", notes: null },
  // Impuestos SII
  { key: "iva",               label: "IVA Chile",                           category: "tax",     value: 0.19,   isPercent: true,  sourceUrl: "https://www.sii.cl/destacados/iva_bienes/index.html", notes: "Tasa vigente. Se declara mensualmente en F29." },
  { key: "idpc.propyme",      label: "IDPC Pro PyME General (14D)",         category: "tax",     value: 0.125,  isPercent: true,  sourceUrl: "https://www.sii.cl/destacados/renta/2025/regimenes_renta2025.html", notes: "Transitoria: 12.5% (2025–2027), 15% (2028), 25% (2029+). Actualizar según año." },
  { key: "idpc.semi",         label: "IDPC Régimen Semi-Integrado (14A)",   category: "tax",     value: 0.27,   isPercent: true,  sourceUrl: "https://www.sii.cl/destacados/renta/2025/regimenes_renta2025.html", notes: "Para empresas con ingresos > 75.000 UF" },
];

async function ensureRatesExist() {
  const count = await prisma.rateConfig.count();
  if (count === 0) {
    await prisma.rateConfig.createMany({ data: DEFAULT_RATES.map((r) => ({ ...r, lastChecked: null, lastChanged: null, prevValue: null })) });
  }
}

// ─── Rate config CRUD ─────────────────────────────────────────

export type RateConfigRow = {
  id: string; key: string; label: string; category: string;
  value: number; isPercent: boolean; sourceUrl: string | null;
  lastChecked: string | null; lastChanged: string | null;
  prevValue: number | null; notes: string | null; updatedAt: string;
};

export async function getRateConfigs(): Promise<RateConfigRow[]> {
  await ensureRatesExist();
  const rates = await prisma.rateConfig.findMany({ orderBy: [{ category: "asc" }, { key: "asc" }] });
  return rates.map((r) => ({
    id: r.id, key: r.key, label: r.label, category: r.category,
    value: r.value, isPercent: r.isPercent,
    sourceUrl: r.sourceUrl, notes: r.notes,
    prevValue: r.prevValue,
    lastChecked: r.lastChecked?.toISOString() ?? null,
    lastChanged: r.lastChanged?.toISOString() ?? null,
    updatedAt:   r.updatedAt.toISOString(),
  }));
}

export async function updateRateConfig(key: string, value: number, notes?: string) {
  await requireAdmin();
  const existing = await prisma.rateConfig.findUnique({ where: { key } });
  if (!existing) return { error: "Tasa no encontrada" };
  const changed = existing.value !== value;
  await prisma.rateConfig.update({
    where: { key },
    data: {
      value,
      prevValue:   changed ? existing.value  : existing.prevValue,
      lastChanged: changed ? new Date()      : existing.lastChanged,
      notes:       notes ?? existing.notes,
    },
  });
  revalidatePath("/admin/finanzas");
  return { success: true, changed };
}

// ─── Auto-refresh from official sources ──────────────────────

function parseFlowRates(html: string): Record<string, number> | null {
  try {
    // Flow page uses comma-decimals: "2,89%", "3,19%", "$202"
    const pctMatches = [...html.matchAll(/(\d+),(\d{2})%\s*\+\s*IVA/g)];
    const uniquePcts = [...new Set(pctMatches.map((m) => parseFloat(`${m[1]}.${m[2]}`)))].sort((a, b) => a - b);
    // Expect at least the main two base rates (2.89, 3.19)
    if (uniquePcts.length < 2) return null;

    const refundMatch = html.match(/\$\s*(\d{3})\s*CLP/);
    const refund = refundMatch ? parseInt(refundMatch[1]) : null;

    // Map known values to keys
    const result: Record<string, number> = {};
    for (const p of uniquePcts) {
      const dec = p / 100;
      if (Math.abs(p - 2.89) < 0.01) result["flow.slow"] = dec;
      else if (Math.abs(p - 3.19) < 0.01) result["flow.fast"] = dec;
      else if (Math.abs(p - 1.99) < 0.01) result["flow.cuotas.2_3"] = dec;
      else if (Math.abs(p - 3.49) < 0.01) result["flow.cuotas.4_6"] = dec;
      else if (Math.abs(p - 6.99) < 0.01) result["flow.cuotas.7_12"] = dec;
    }
    if (refund) result["flow.refund"] = refund;
    return Object.keys(result).length >= 2 ? result : null;
  } catch {
    return null;
  }
}

function parseMPRates(html: string): Record<string, number> | null {
  try {
    const pctMatches = [...html.matchAll(/(\d+),(\d{2})%/g)];
    const uniquePcts = [...new Set(pctMatches.map((m) => parseFloat(`${m[1]}.${m[2]}`)))].sort((a, b) => a - b);
    const result: Record<string, number> = {};
    for (const p of uniquePcts) {
      const dec = p / 100;
      if (Math.abs(p - 2.89) < 0.05) result["mp.slow"] = dec;
      else if (Math.abs(p - 3.19) < 0.05) result["mp.fast"] = dec;
      else if (Math.abs(p - 2.29) < 0.05) result["mp.slow"] = dec; // nuevos usuarios
      else if (Math.abs(p - 2.59) < 0.05) result["mp.fast"] = dec;
    }
    return Object.keys(result).length >= 1 ? result : null;
  } catch {
    return null;
  }
}

export async function refreshRatesFromSources(): Promise<{
  updated: string[]; failed: string[]; unchanged: string[];
}> {
  await requireAdmin();

  const results = { updated: [] as string[], failed: [] as string[], unchanged: [] as string[] };
  const now = new Date();

  // ── Flow ──────────────────────────────────────────────────
  try {
    const html = await fetch("https://web.flow.cl/tarifas/", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LiraDeLuna/1.0)", "Accept-Language": "es-CL,es;q=0.9" },
      next: { revalidate: 0 },
    }).then((r) => r.text());

    const rates = parseFlowRates(html);
    if (rates) {
      for (const [key, value] of Object.entries(rates)) {
        const existing = await prisma.rateConfig.findUnique({ where: { key } });
        if (!existing) continue;
        const changed = Math.abs(existing.value - value) > 0.00001;
        await prisma.rateConfig.update({
          where: { key },
          data: {
            value,
            prevValue:   changed ? existing.value : existing.prevValue,
            lastChanged: changed ? now : existing.lastChanged,
            lastChecked: now,
          },
        });
        (changed ? results.updated : results.unchanged).push(key);
      }
    } else {
      results.failed.push("flow (parse error)");
    }
  } catch {
    results.failed.push("flow (network error)");
  }

  // ── MercadoPago ───────────────────────────────────────────
  try {
    const html = await fetch("https://www.mercadopago.cl/ayuda/costo-recibir-pagos-dinero_220", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LiraDeLuna/1.0)", "Accept-Language": "es-CL,es;q=0.9", "Accept": "text/html" },
      next: { revalidate: 0 },
    }).then((r) => r.ok ? r.text() : Promise.reject(r.status));

    const rates = parseMPRates(html);
    if (rates) {
      for (const [key, value] of Object.entries(rates)) {
        const existing = await prisma.rateConfig.findUnique({ where: { key } });
        if (!existing) continue;
        const changed = Math.abs(existing.value - value) > 0.00001;
        await prisma.rateConfig.update({
          where: { key },
          data: {
            value,
            prevValue:   changed ? existing.value : existing.prevValue,
            lastChanged: changed ? now : existing.lastChanged,
            lastChecked: now,
          },
        });
        (changed ? results.updated : results.unchanged).push(key);
      }
    } else {
      results.failed.push("mercadopago (parse error — verificar manualmente)");
    }
  } catch {
    results.failed.push("mercadopago (acceso denegado — verificar manualmente)");
  }

  // Mark tax rates as checked (no auto-scraping for SII — legislated)
  await prisma.rateConfig.updateMany({
    where: { category: "tax" },
    data: { lastChecked: now },
  });
  results.unchanged.push("iva", "idpc.propyme", "idpc.semi");

  revalidatePath("/admin/finanzas");
  return results;
}

// ─── Finance summary ─────────────────────────────────────────

export type FinanceFilters = {
  from: Date;
  to:   Date;
  channel?: string;  // "ALL" | "ONLINE" | "PRESENCIAL"
  method?:  string;  // "ALL" | "flowPay" | "mercadoPago" | "transfer" | "presencial"
};

export type FinanceSummary = {
  // Órdenes de tienda
  ventasBrutas:     number;
  ventasFlow:       number;
  ventasMP:         number;
  ventasTransfer:   number;
  ventasPresencial: number;
  txFlow:           number;
  txMP:             number;
  txTransfer:       number;
  txPresencial:     number;
  orderCount:       number;
  // Compras a proveedor
  comprasSubtotal:  number;
  comprasTaxAmount: number;
  purchaseCount:    number;
  // Ingresos de eventos (EventRegistration CONFIRMED/PAID)
  eventVentasBrutas:   number;
  eventVentasFlow:     number;
  eventVentasMP:       number;
  eventVentasTransfer: number;
  eventCount:          number;
  eventTxFlow:         number;
  eventTxMP:           number;
  eventTxTransfer:     number;
};

export async function getFinanceSummary(filters: FinanceFilters): Promise<FinanceSummary> {
  const { from, to, channel, method } = filters;

  const orderWhere: Record<string, unknown> = {
    paymentStatus: "PAID",
    createdAt: { gte: from, lte: to },
  };
  if (channel && channel !== "ALL") orderWhere.channel = channel;
  if (method  && method  !== "ALL") {
    if (method === "presencial") orderWhere.channel = "PRESENCIAL";
    else orderWhere.paymentMethod = method;
  }

  type EventAggRow = { paymentMethod: string | null; total_amount: bigint; cnt: bigint };

  const [orders, purchases, eventRows] = await Promise.all([
    prisma.order.findMany({ where: orderWhere, select: { total: true, paymentMethod: true, channel: true } }),
    prisma.purchase.findMany({
      where: { status: "RECEIVED", orderedAt: { gte: from, lte: to } },
      select: { subtotal: true, taxAmount: true },
    }),
    prisma.$queryRaw<EventAggRow[]>`
      SELECT paymentMethod,
             SUM(amount)  AS total_amount,
             COUNT(*)     AS cnt
      FROM EventRegistration
      WHERE paymentStatus IN ('CONFIRMED', 'PAID')
        AND amount > 0
        AND createdAt >= ${from} AND createdAt <= ${to}
      GROUP BY paymentMethod
    `,
  ]);

  const s: FinanceSummary = {
    ventasBrutas: 0, ventasFlow: 0, ventasMP: 0, ventasTransfer: 0, ventasPresencial: 0,
    txFlow: 0, txMP: 0, txTransfer: 0, txPresencial: 0, orderCount: orders.length,
    comprasSubtotal: 0, comprasTaxAmount: 0, purchaseCount: purchases.length,
    eventVentasBrutas: 0, eventVentasFlow: 0, eventVentasMP: 0, eventVentasTransfer: 0,
    eventCount: 0, eventTxFlow: 0, eventTxMP: 0, eventTxTransfer: 0,
  };

  for (const o of orders) {
    s.ventasBrutas += o.total;
    const m = o.paymentMethod ?? "";
    if (o.channel === "PRESENCIAL") { s.ventasPresencial += o.total; s.txPresencial++; }
    else if (m === "flowPay")       { s.ventasFlow     += o.total; s.txFlow++;     }
    else if (m === "mercadoPago")   { s.ventasMP       += o.total; s.txMP++;       }
    else if (m === "transfer")      { s.ventasTransfer += o.total; s.txTransfer++; }
  }
  for (const p of purchases) {
    s.comprasSubtotal  += p.subtotal;
    s.comprasTaxAmount += p.taxAmount;
  }
  for (const row of eventRows) {
    const amt = Number(row.total_amount);
    const cnt = Number(row.cnt);
    s.eventVentasBrutas += amt;
    s.eventCount        += cnt;
    const m = row.paymentMethod ?? "";
    if      (m === "flowPay")     { s.eventVentasFlow     += amt; s.eventTxFlow     += cnt; }
    else if (m === "mercadoPago") { s.eventVentasMP        += amt; s.eventTxMP       += cnt; }
    else if (m === "transfer")    { s.eventVentasTransfer  += amt; s.eventTxTransfer += cnt; }
  }
  return s;
}

// ─── Finance assets ───────────────────────────────────────────

export type AssetRow = {
  id: string; name: string; category: string;
  purchaseDate: string; purchaseCost: number;
  usefulLifeYears: number; notes: string | null;
};

export async function getFinanceAssets(): Promise<AssetRow[]> {
  const assets = await prisma.financeAsset.findMany({ orderBy: { purchaseDate: "asc" } });
  return assets.map((a) => ({
    id: a.id, name: a.name, category: a.category,
    purchaseDate: a.purchaseDate.toISOString(),
    purchaseCost: a.purchaseCost,
    usefulLifeYears: a.usefulLifeYears,
    notes: a.notes,
  }));
}

export async function createFinanceAsset(data: {
  name: string; category: string; purchaseDate: string;
  purchaseCost: number; usefulLifeYears: number; notes?: string;
}) {
  await requireAdmin();
  const asset = await prisma.financeAsset.create({
    data: {
      name: data.name, category: data.category as never,
      purchaseDate: new Date(data.purchaseDate),
      purchaseCost: data.purchaseCost,
      usefulLifeYears: data.usefulLifeYears,
      notes: data.notes || null,
    },
  });
  revalidatePath("/admin/finanzas");
  return { asset };
}

export async function updateFinanceAsset(id: string, data: {
  name?: string; category?: string; purchaseDate?: string;
  purchaseCost?: number; usefulLifeYears?: number; notes?: string;
}) {
  await requireAdmin();
  const asset = await prisma.financeAsset.update({
    where: { id },
    data: {
      ...(data.name            ? { name: data.name }                           : {}),
      ...(data.category        ? { category: data.category as never }          : {}),
      ...(data.purchaseDate    ? { purchaseDate: new Date(data.purchaseDate) } : {}),
      ...(data.purchaseCost !== undefined  ? { purchaseCost: data.purchaseCost }           : {}),
      ...(data.usefulLifeYears !== undefined ? { usefulLifeYears: data.usefulLifeYears }   : {}),
      notes: data.notes ?? null,
    },
  });
  revalidatePath("/admin/finanzas");
  return { asset };
}

export async function deleteFinanceAsset(id: string) {
  await requireAdmin();
  await prisma.financeAsset.delete({ where: { id } });
  revalidatePath("/admin/finanzas");
  return { success: true };
}
