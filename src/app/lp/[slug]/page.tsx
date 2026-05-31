import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import LandingPageView from "./LandingPageView";
import EventLandingPageView from "./EventLandingPageView";
import type { LandingPageConfig, EventConfig } from "@/lib/crm";
import { DEFAULT_LP_CONFIG, DEFAULT_EVENT_CONFIG } from "@/lib/crm";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const lp = await prisma.landingPage.findUnique({
    where: { slug, isActive: true },
    select: { title: true },
  });
  return { title: lp?.title ?? "Lira de Luna" };
}

export type LPProduct = {
  id: string; slug: string; name: string; price: number;
  image: string | null; collectionSlug: string;
  saleEnabled: boolean; saleDiscountPct: number | null;
  saleStartAt: string | null; saleEndAt: string | null;
};

export default async function PublicLandingPage({ params }: Props) {
  const { slug } = await params;
  const lp = await prisma.landingPage.findUnique({
    where: { slug, isActive: true },
  });
  if (!lp) notFound();

  // ── EVENT type ────────────────────────────────────────────────
  if ((lp as { type?: string }).type === "EVENT") {
    const config: EventConfig = { ...DEFAULT_EVENT_CONFIG, ...(lp.config as EventConfig) };

    let registrationCount = 0;
    if (config.eventCapacity > 0) {
      const countRows = await prisma.$queryRaw<{ c: bigint }[]>`
        SELECT COUNT(*) AS c FROM EventRegistration
        WHERE landingPageId = ${lp.id}
        AND paymentStatus IN ('CONFIRMED', 'PAID')
      `;
      registrationCount = Number(countRows[0]?.c ?? 0);
    }

    return (
      <EventLandingPageView
        id={lp.id}
        slug={lp.slug}
        config={config}
        registrationCount={registrationCount}
      />
    );
  }

  // ── PROMO type (existing) ─────────────────────────────────────
  const config: LandingPageConfig = { ...DEFAULT_LP_CONFIG, ...(lp.config as LandingPageConfig) };
  let products: LPProduct[] = [];

  if (config.showProducts) {
    const where = {
      isActive: true,
      saleType: "UNIT" as const,
      ...(config.productMode === "COLLECTION" && config.collectionSlug
        ? { collection: { slug: config.collectionSlug } }
        : config.productMode === "MANUAL" && config.productIds.length > 0
        ? { id: { in: config.productIds } }
        : { id: "none" }),
    };

    const dbProducts = await prisma.product.findMany({
      where,
      select: {
        id: true, slug: true, name: true, price: true, images: true,
        saleEnabled: true, saleDiscountPct: true, saleStartAt: true, saleEndAt: true,
        collection: { select: { slug: true } },
      },
      orderBy: config.productMode === "MANUAL"
        ? undefined
        : [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    const ordered = config.productMode === "MANUAL"
      ? config.productIds
          .map((id) => dbProducts.find((p) => p.id === id))
          .filter(Boolean) as typeof dbProducts
      : dbProducts;

    products = ordered.map((p) => ({
      id: p.id, slug: p.slug, name: p.name, price: p.price,
      image: Array.isArray(p.images) ? (p.images as string[])[0] ?? null : null,
      collectionSlug: p.collection.slug,
      saleEnabled: p.saleEnabled,
      saleDiscountPct: p.saleDiscountPct,
      saleStartAt: p.saleStartAt?.toISOString() ?? null,
      saleEndAt: p.saleEndAt?.toISOString() ?? null,
    }));
  }

  return (
    <LandingPageView
      id={lp.id}
      config={config}
      products={products}
    />
  );
}
