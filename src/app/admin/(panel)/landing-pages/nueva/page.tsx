import { prisma } from "@/lib/db";
import LandingPageEditorClient from "../[id]/LandingPageEditorClient";
import EventEditorClient from "../../eventos/[id]/EventEditorClient";
import { DEFAULT_LP_CONFIG, DEFAULT_EVENT_CONFIG } from "@/lib/crm";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ type?: string }> };

export default async function NuevaLandingPagePage({ searchParams }: Props) {
  const { type } = await searchParams;

  // ── EVENT ──────────────────────────────────────────────────────
  if (type === "evento") {
    const settings = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });
    return (
      <EventEditorClient
        mode="create"
        initialConfig={DEFAULT_EVENT_CONFIG}
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
      mode="create"
      initialConfig={DEFAULT_LP_CONFIG}
      products={products}
      collections={dbCollections}
    />
  );
}
