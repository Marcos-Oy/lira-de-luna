import { prisma } from "@/lib/db";
import ClientesUsuariosClient from "./ClientesUsuariosClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Clientes — Admin" };

export default async function ClientesPage() {
  const [customerUsers, guestOrdersRaw] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { orders: true } },
        orders: {
          select: { total: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.order.findMany({
      where: { guestEmail: { not: null }, userId: null },
      select: { guestEmail: true, total: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const guestMap = new Map<string, { orderCount: number; totalSpent: number; lastOrderAt: Date }>();
  for (const o of guestOrdersRaw) {
    if (!o.guestEmail) continue;
    const existing = guestMap.get(o.guestEmail);
    if (existing) {
      existing.orderCount++;
      existing.totalSpent += o.total;
    } else {
      guestMap.set(o.guestEmail, { orderCount: 1, totalSpent: o.total, lastOrderAt: o.createdAt });
    }
  }
  const guestStats = Array.from(guestMap.entries())
    .map(([email, s]) => ({ email, ...s }))
    .sort((a, b) => b.lastOrderAt.getTime() - a.lastOrderAt.getTime());

  return (
    <ClientesUsuariosClient
      customerUsers={customerUsers}
      guestStats={guestStats}
    />
  );
}
