import { prisma } from "@/lib/db";
import DevolucionesClient from "./DevolucionesClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Devoluciones — Admin" };
export const dynamic = "force-dynamic";

export default async function DevolucionesPage() {
  const [returns, orders] = await Promise.all([
    prisma.return.findMany({
      include: {
        order: {
          select: {
            orderNumber: true, total: true,
            guestName: true, guestEmail: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
      select: {
        id: true, orderNumber: true, total: true, createdAt: true,
        guestName: true, guestEmail: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const summaryStats = {
    total:     returns.length,
    pending:   returns.filter((r) => r.status === "PENDING").length,
    completed: returns.filter((r) => r.status === "COMPLETED").length,
    refunded:  returns.filter((r) => r.type === "MONEY_REFUND" && r.status === "COMPLETED")
      .reduce((s, r) => s + (r.amount ?? 0), 0),
  };

  return (
    <DevolucionesClient
      returns={returns.map((r) => ({
        ...r,
        amount:    r.amount,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        order: {
          orderNumber: r.order.orderNumber,
          total:       r.order.total,
          customerName: r.order.user?.name ?? r.order.guestName ?? "—",
          customerEmail: r.order.user?.email ?? r.order.guestEmail ?? null,
        },
      }))}
      orders={orders.map((o) => ({
        id:           o.id,
        orderNumber:  o.orderNumber,
        total:        o.total,
        createdAt:    o.createdAt.toISOString(),
        customerName: o.user?.name ?? o.guestName ?? "—",
      }))}
      summaryStats={summaryStats}
    />
  );
}
