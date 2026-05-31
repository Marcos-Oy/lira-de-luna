import { prisma } from "@/lib/db";
import PerdidasClient from "./PerdidasClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pérdidas — Admin" };
export const dynamic = "force-dynamic";

export default async function PerdidasPage() {
  const losses = await prisma.lossRecord.findMany({
    orderBy: { date: "desc" },
  });

  const totalLoss = losses.reduce((s, l) => s + l.amount, 0);
  const thisMonth = (() => {
    const now = new Date();
    return losses
      .filter((l) => {
        const d = new Date(l.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((s, l) => s + l.amount, 0);
  })();

  return (
    <PerdidasClient
      losses={losses.map((l) => ({
        id:          l.id,
        description: l.description,
        amount:      l.amount,
        category:    l.category,
        notes:       l.notes,
        date:        l.date.toISOString(),
        createdAt:   l.createdAt.toISOString(),
      }))}
      totalLoss={totalLoss}
      thisMonthLoss={thisMonth}
    />
  );
}
