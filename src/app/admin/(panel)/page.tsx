import { prisma } from "@/lib/db";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp  = await searchParams;
  const now = new Date();

  // ── KPI period ────────────────────────────────────────────
  const statsFrom = sp.statsFrom ?? "";
  const statsTo   = sp.statsTo   ?? "";

  const statsDateFrom: Date = statsFrom
    ? new Date(statsFrom)
    : new Date(now.getFullYear(), now.getMonth(), 1);

  const statsDateTo: Date = (() => {
    if (statsTo) {
      const d = new Date(statsTo);
      d.setHours(23, 59, 59, 999);
      return d;
    }
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  })();

  const statsWhere = { createdAt: { gte: statsDateFrom, lte: statsDateTo } };
  const isAllTime  = statsFrom === "1970-01-01";

  // ── Previous period (same length) for growth % ────────────
  const periodMs  = statsDateTo.getTime() - statsDateFrom.getTime() + 86_400_000;
  const prevFrom  = new Date(statsDateFrom.getTime() - periodMs);
  const prevTo    = new Date(statsDateFrom.getTime() - 1);
  const prevWhere = { createdAt: { gte: prevFrom, lte: prevTo } };

  // ── Data queries ─────────────────────────────────────────
  const [
    userCount,
    productCount,
    revenueAgg,
    orderCount,
    prevRevenueAgg,
    prevOrderCount,
    recentOrders,
    bestsellers,
    chartOrders,
    statusCounts,
    noSalesCount,
    refundsAgg,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.order.aggregate({ where: { ...statsWhere, status: "DELIVERED" }, _sum: { total: true } }),
    prisma.order.count({ where: statsWhere }),
    isAllTime
      ? Promise.resolve({ _sum: { total: null }, _count: { id: 0 } })
      : prisma.order.aggregate({ where: { ...prevWhere, status: "DELIVERED" }, _sum: { total: true }, _count: { id: true } }),
    isAllTime
      ? Promise.resolve(0)
      : prisma.order.count({ where: prevWhere }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user:  { select: { name: true, email: true } },
        items: { select: { productName: true }, take: 1 },
      },
    }),
    prisma.product.findMany({
      where:   { isActive: true },
      take:    5,
      orderBy: { orderItems: { _count: "desc" } },
      include: { _count: { select: { orderItems: true } } },
    }),
    prisma.order.findMany({
      where:   statsWhere,
      select:  { total: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.order.groupBy({
      by:    ["status"],
      where: statsWhere,
      _count: { id: true },
    }),
    prisma.product.count({
      where: { isActive: true, orderItems: { none: {} } },
    }),
    prisma.return.aggregate({
      where: { type: "MONEY_REFUND", status: "COMPLETED", createdAt: { gte: statsDateFrom, lte: statsDateTo } },
      _sum: { amount: true },
    }),
  ]);

  const revenue     = Number(revenueAgg._sum.total ?? 0) - Number(refundsAgg._sum.amount ?? 0);
  const prevRevenue = Number(prevRevenueAgg._sum.total ?? 0);

  // ── Growth indicators ────────────────────────────────────
  const revenueGrowth: number | null = isAllTime ? null
    : prevRevenue === 0
      ? (revenue > 0 ? 100 : null)
      : Math.round(((revenue - prevRevenue) / prevRevenue) * 100);

  const orderGrowth: number | null = isAllTime ? null
    : prevOrderCount === 0
      ? (orderCount > 0 ? 100 : null)
      : Math.round(((orderCount - prevOrderCount) / prevOrderCount) * 100);

  // ── Monthly chart — all months in period ─────────────────
  const monthlyMap = new Map<string, { revenue: number; orders: number }>();
  for (const o of chartOrders) {
    const d   = new Date(o.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthlyMap.get(key) ?? { revenue: 0, orders: 0 };
    entry.revenue += Number(o.total);
    entry.orders  += 1;
    monthlyMap.set(key, entry);
  }

  // Walk month-by-month from statsDateFrom → statsDateTo (cap at 24 months for chart)
  const monthlySales: { month: string; label: string; revenue: number; orders: number }[] = [];
  const cursor = new Date(statsDateFrom.getFullYear(), statsDateFrom.getMonth(), 1);
  const endMonth = new Date(statsDateTo.getFullYear(), statsDateTo.getMonth(), 1);
  const spanMonths = (endMonth.getFullYear() - cursor.getFullYear()) * 12
    + (endMonth.getMonth() - cursor.getMonth()) + 1;
  const showYear = spanMonths > 12;

  while (cursor <= endMonth && monthlySales.length < 24) {
    const key   = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    const label = cursor.toLocaleDateString("es-CL", {
      month: "short",
      ...(showYear ? { year: "2-digit" } : {}),
    });
    const entry = monthlyMap.get(key) ?? { revenue: 0, orders: 0 };
    monthlySales.push({ month: key, label, ...entry });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // ── Status distribution ──────────────────────────────────
  const STATUS_LABEL: Record<string, string> = {
    PENDING: "Pendiente", PAID: "Pagado", PROCESSING: "Procesando",
    SHIPPED: "Enviado",   DELIVERED: "Entregado",
    CANCELLED: "Cancelado", REFUNDED: "Reembolsado",
  };
  const statusDistribution = statusCounts.map((s) => ({
    status: s.status,
    label:  STATUS_LABEL[s.status] ?? s.status,
    count:  s._count.id,
  }));

  return (
    <DashboardClient
      kpis={{ revenue, revenueGrowth, orderCount, orderGrowth, productCount, userCount }}
      monthlySales={monthlySales}
      statusDistribution={statusDistribution}
      recentOrders={recentOrders.map((o) => ({
        id:           o.id,
        orderNumber:  String(o.orderNumber),
        customerName: o.user?.name ?? o.guestEmail ?? "—",
        productName:  o.items[0]?.productName ?? "—",
        total:        Number(o.total),
        status:       o.status,
        createdAt:    o.createdAt.toISOString(),
      }))}
      bestsellers={bestsellers.map((p) => ({
        id:             p.id,
        name:           p.name,
        price:          Number(p.price),
        orderItemCount: p._count.orderItems,
      }))}
      noSalesCount={noSalesCount}
      statsDateFrom={statsDateFrom.toISOString().slice(0, 10)}
      statsDateTo={statsDateTo.toISOString().slice(0, 10)}
    />
  );
}
