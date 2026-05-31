import { prisma } from "@/lib/db";
import LandingPagesClient from "./LandingPagesClient";

export const dynamic = "force-dynamic";

export default async function LandingPagesPage() {
  const pages = await prisma.landingPage.findMany({
    include: { _count: { select: { leads: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <LandingPagesClient
      pages={pages.map((p) => ({
        id:        p.id,
        title:     p.title,
        slug:      p.slug,
        type:      (p as { type?: string }).type ?? "PROMO",
        isActive:  p.isActive,
        leadCount: p._count.leads,
        createdAt: p.createdAt.toISOString(),
      }))}
    />
  );
}
