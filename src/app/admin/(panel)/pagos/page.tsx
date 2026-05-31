import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import AdminPagosClient from "./AdminPagosClient";

const PAGE_SIZE = 25;

export default async function AdminPagosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;

  // ── Table filters ────────────────────────────────────────────
  const page     = Math.max(1, parseInt(sp.page  ?? "1"));
  const q        = sp.q?.trim()     ?? "";
  const status   = sp.status        ?? "";
  const method   = sp.method        ?? "";
  const dateFrom = sp.dateFrom      ?? "";
  const dateTo   = sp.dateTo        ?? "";
  const minItems = parseInt(sp.minItems ?? "0") || 0;
  const maxItems = parseInt(sp.maxItems ?? "0") || 0;
  const tracking = sp.tracking      ?? "";
  const sort     = sp.sort          ?? "newest";

  // ── KPI date range ───────────────────────────────────────────
  // Default: current month (1st day → last day)
  const now = new Date();
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
    // Last millisecond of current month
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  })();

  const statsWhere: Prisma.OrderWhereInput = {
    createdAt: { gte: statsDateFrom, lte: statsDateTo },
  };

  // ── Table WHERE clause ───────────────────────────────────────
  const where: Prisma.OrderWhereInput = {};

  if (q) {
    where.OR = [
      { orderNumber: { contains: q } },
      { user:        { name:  { contains: q } } },
      { user:        { email: { contains: q } } },
      { guestEmail:  { contains: q } },
      { guestName:   { contains: q } },
    ];
  }

  if (status) where.status = status as Prisma.EnumOrderStatusFilter;
  if (method) where.paymentMethod = { contains: method };

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      (where.createdAt as Prisma.DateTimeFilter).lte = end;
    }
  }

  // ── ORDER BY ─────────────────────────────────────────────────
  const orderBy: Prisma.OrderOrderByWithRelationInput =
    sort === "oldest"  ? { createdAt: "asc"  } :
    sort === "highest" ? { total:     "desc" } :
    sort === "lowest"  ? { total:     "asc"  } :
                         { createdAt: "desc" };

  // ── Tracking filter ──────────────────────────────────────────
  let trackingWhere: Prisma.OrderWhereInput = {};
  if (tracking === "with") {
    trackingWhere = { AND: [{ trackingNumber: { not: null } }, { carrier: { not: null } }] };
  } else if (tracking === "without") {
    trackingWhere = { OR: [{ trackingNumber: null }, { carrier: null }] };
  }

  // ── Item-count filter (raw subquery) ─────────────────────────
  let extraWhere: Prisma.OrderWhereInput = {};
  if (minItems > 0 || maxItems > 0) {
    const rows = await prisma.$queryRaw<{ id: string; cnt: bigint }[]>`
      SELECT o.id, COUNT(oi.id) AS cnt
      FROM \`Order\` o
      LEFT JOIN \`OrderItem\` oi ON oi.orderId = o.id
      GROUP BY o.id
      HAVING cnt >= ${minItems > 0 ? minItems : 0}
        AND (${maxItems > 0 ? 1 : 0} = 0 OR cnt <= ${maxItems > 0 ? maxItems : 9999})
    `;
    extraWhere = { id: { in: rows.map((r) => r.id) } };
  }

  const combinedWhere: Prisma.OrderWhereInput = { AND: [where, extraWhere, trackingWhere] };

  // ── Queries ──────────────────────────────────────────────────
  const skip = (page - 1) * PAGE_SIZE;

  const [orders, total, statsAgg, paymentMethods, delivered, cancelled] = await Promise.all([
    prisma.order.findMany({
      where: combinedWhere,
      orderBy,
      skip,
      take: PAGE_SIZE,
      include: {
        user:            { select: { name: true, email: true, phone: true } },
        shippingAddress: true,
        items: {
          include: { product: { select: { slug: true, images: true } } },
        },
        _count: { select: { items: true } },
      },
      // channel and presencialPayment are scalar fields — included by default in findMany
    }),
    prisma.order.count({ where: combinedWhere }),
    prisma.order.aggregate({
      where: statsWhere,
      _sum:   { total: true },
      _count: { id: true },
    }),
    prisma.order.groupBy({
      by: ["paymentMethod"],
      where: { paymentMethod: { not: null } },
      _count: { id: true },
    }),
    prisma.order.count({ where: { ...statsWhere, status: "DELIVERED" } }),
    prisma.order.count({ where: { ...statsWhere, status: "CANCELLED" } }),
  ]);

  const totalPages   = Math.ceil(total / PAGE_SIZE);
  const totalRevenue = statsAgg._sum.total  ?? 0;
  const totalInPeriod = statsAgg._count.id;

  const summaryStats = [
    {
      label: "Total cobrado",
      value: `$${totalRevenue.toLocaleString("es-CL")} CLP`,
      sub:   `${totalInPeriod} ${totalInPeriod === 1 ? "pedido" : "pedidos"} en el período`,
    },
    {
      label: "Pedidos entregados",
      value: delivered.toString(),
      sub:   `de ${totalInPeriod} ${totalInPeriod === 1 ? "pedido" : "pedidos"} en el período`,
    },
    {
      label: "Ticket promedio",
      value: `$${totalInPeriod > 0 ? Math.round(totalRevenue / totalInPeriod).toLocaleString("es-CL") : 0} CLP`,
      sub:   "por pedido en el período",
    },
    {
      label: "Cancelados",
      value: cancelled.toString(),
      sub:   "pedidos en el período",
    },
  ];

  const methods = paymentMethods
    .filter((m) => m.paymentMethod)
    .map((m) => m.paymentMethod as string);

  return (
    <AdminPagosClient
      orders={orders as never}
      summaryStats={summaryStats}
      totalOrders={total}
      totalPages={totalPages}
      currentPage={page}
      paymentMethods={methods}
      filters={{ q, status, method, dateFrom, dateTo, minItems: minItems || undefined, maxItems: maxItems || undefined, tracking, sort }}
      statsDateFrom={statsDateFrom.toISOString().slice(0, 10)}
      statsDateTo={statsDateTo.toISOString().slice(0, 10)}
    />
  );
}
