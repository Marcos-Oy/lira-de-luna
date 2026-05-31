import { getFinanceSummary, getFinanceAssets, getRateConfigs } from "@/app/actions/admin/finance";
import FinanzasClient from "./FinanzasClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Finanzas — Admin" };

function parseFilters(sp: Record<string, string | undefined>) {
  const now   = new Date();
  const year  = parseInt(sp.year  ?? String(now.getFullYear()));
  const month = parseInt(sp.month ?? String(now.getMonth() + 1));

  // Custom date range takes priority over month/year picker
  const from = sp.from ? new Date(sp.from + "T00:00:00") : new Date(year, month - 1, 1);
  const to   = sp.to   ? new Date(sp.to   + "T23:59:59") : new Date(year, month,     0, 23, 59, 59);

  return {
    from, to,
    channel: sp.channel ?? "ALL",
    method:  sp.method  ?? "ALL",
    compare: sp.compare ?? "none",   // "none" | "prev_month" | "prev_year"
    year, month,
  };
}

function comparisonDates(from: Date, to: Date, compare: string): { from: Date; to: Date } | null {
  if (compare === "none") return null;
  const diffMs = to.getTime() - from.getTime();
  if (compare === "prev_month") {
    const cTo   = new Date(from.getTime() - 1);
    const cFrom = new Date(cTo.getTime() - diffMs);
    return { from: cFrom, to: cTo };
  }
  if (compare === "prev_year") {
    return {
      from: new Date(from.getFullYear() - 1, from.getMonth(), from.getDate()),
      to:   new Date(to.getFullYear()   - 1, to.getMonth(),   to.getDate(), 23, 59, 59),
    };
  }
  return null;
}

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp      = await searchParams;
  const filters = parseFilters(sp);
  const compDates = comparisonDates(filters.from, filters.to, filters.compare);

  const [summary, compSummary, assets, rates] = await Promise.all([
    getFinanceSummary({ from: filters.from, to: filters.to, channel: filters.channel, method: filters.method }),
    compDates ? getFinanceSummary({ from: compDates.from, to: compDates.to, channel: filters.channel, method: filters.method }) : Promise.resolve(null),
    getFinanceAssets(),
    getRateConfigs(),
  ]);

  // Annual summary for Renta tab (always full year, no channel/method filter)
  const annualSummary = await getFinanceSummary({
    from: new Date(filters.year, 0, 1),
    to:   new Date(filters.year, 11, 31, 23, 59, 59),
  });

  return (
    <FinanzasClient
      summary={summary}
      compSummary={compSummary}
      annualSummary={annualSummary}
      assets={assets}
      rates={rates}
      filters={filters}
      compDates={compDates ? { from: compDates.from.toISOString(), to: compDates.to.toISOString() } : null}
    />
  );
}
