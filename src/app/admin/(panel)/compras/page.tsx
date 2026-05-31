import { prisma } from "@/lib/db";
import ComprasClient from "./ComprasClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Compras — Admin" };

export default async function ComprasPage() {
  const now   = new Date();
  const mFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const mTo   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [purchases, suppliers, totalAgg, thisMonthAgg, pendingAgg] = await Promise.all([
    prisma.purchase.findMany({
      include: { supplier: { select: { id: true, name: true } }, items: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.purchase.aggregate({ _sum: { total: true } }),
    prisma.purchase.aggregate({ where: { createdAt: { gte: mFrom, lte: mTo } }, _sum: { total: true } }),
    prisma.purchase.aggregate({ where: { paymentStatus: { in: ["UNPAID", "PARTIAL"] } }, _sum: { total: true } }),
  ]);

  const kpis = {
    totalOrders:    purchases.length,
    totalAmount:    totalAgg._sum.total    ?? 0,
    thisMonthAmount: thisMonthAgg._sum.total ?? 0,
    pendingPayment:  pendingAgg._sum.total  ?? 0,
  };

  const serialized = purchases.map((p) => ({
    id:             p.id,
    purchaseNumber: p.purchaseNumber,
    supplierId:     p.supplierId,
    supplierName:   p.supplier?.name ?? p.supplierName ?? "—",
    status:         p.status,
    paymentStatus:  p.paymentStatus,
    paymentMethod:  p.paymentMethod,
    subtotal:       p.subtotal,
    taxAmount:      p.taxAmount,
    total:          p.total,
    notes:          p.notes,
    orderedAt:      p.orderedAt.toISOString(),
    expectedAt:     p.expectedAt?.toISOString() ?? null,
    receivedAt:     p.receivedAt?.toISOString() ?? null,
    itemCount:      p.items.length,
    createdAt:      p.createdAt.toISOString(),
  }));

  const serializedSuppliers = suppliers.map((s) => ({
    id:    s.id,
    name:  s.name,
    email: s.email,
    phone: s.phone,
    rut:   s.rut,
  }));

  return <ComprasClient purchases={serialized} suppliers={serializedSuppliers} kpis={kpis} />;
}
