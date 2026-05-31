import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import LandingPageEditorClient from "./LandingPageEditorClient";
import EventEditorClient from "../../eventos/[id]/EventEditorClient";
import type { LandingPageConfig, EventConfig } from "@/lib/crm";
import { DEFAULT_LP_CONFIG, DEFAULT_EVENT_CONFIG } from "@/lib/crm";

export const dynamic = "force-dynamic";

type LPRow = {
  id: string; title: string; slug: string;
  isActive: number | boolean; type: string; config: unknown;
};

export default async function EditLandingPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const rows = await prisma.$queryRaw<LPRow[]>`
    SELECT id, title, slug, isActive, type, config
    FROM LandingPage WHERE id = ${id} LIMIT 1
  `;
  const lp = rows[0];
  if (!lp) notFound();

  const lpType = lp.type ?? "PROMO";
  const parsedConfig = typeof lp.config === "string" ? JSON.parse(lp.config) : lp.config;

  // ── EVENT ─────────────────────────────────────────────────────
  if (lpType === "EVENT") {
    const settings = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });
    const config: EventConfig = { ...DEFAULT_EVENT_CONFIG, ...(parsedConfig as EventConfig) };

    return (
      <EventEditorClient
        mode="edit"
        id={lp.id}
        initialTitle={lp.title}
        initialConfig={config}
        initialIsActive={!!lp.isActive}
        storeSettings={{
          mercadoPagoEnabled:    settings?.mercadoPagoEnabled    ?? false,
          flowPayEnabled:        settings?.flowPayEnabled        ?? false,
          transferEnabled:       settings?.transferEnabled       ?? false,
          transferBankName:      settings?.transferBankName      ?? null,
          transferAccountName:   settings?.transferAccountName   ?? null,
          transferAccountNumber: settings?.transferAccountNumber ?? null,
          transferAccountType:   settings?.transferAccountType   ?? null,
          transferRut:           settings?.transferRut           ?? null,
          transferInstructions:  settings?.transferInstructions  ?? null,
        }}
      />
    );
  }

  // ── PROMO ─────────────────────────────────────────────────────
  const [dbProducts, dbCollections] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, saleType: "UNIT" },
      select: {
        id: true, slug: true, name: true, images: true, price: true,
        collection: { select: { name: true, slug: true } },
      },
      orderBy: [{ collection: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.collection.findMany({
      where: { isActive: true },
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const products = dbProducts.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    image: Array.isArray(p.images) ? (p.images as string[])[0] ?? null : null,
    collectionName: p.collection.name,
    collectionSlug: p.collection.slug,
  }));

  return (
    <LandingPageEditorClient
      mode="edit"
      id={lp.id}
      title={lp.title}
      slug={lp.slug}
      initialConfig={{ ...DEFAULT_LP_CONFIG, ...(parsedConfig as LandingPageConfig) }}
      products={products}
      collections={dbCollections}
    />
  );
}
