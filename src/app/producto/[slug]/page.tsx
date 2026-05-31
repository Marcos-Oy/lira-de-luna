import { notFound } from "next/navigation";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductDetail from "@/components/products/ProductDetail";
import ProductGrid from "@/components/products/ProductGrid";
import { prisma } from "@/lib/db";
import type { Product, ProductVariant } from "@/lib/mock-data";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

function mapProduct(p: {
  id: string; slug: string; name: string; description: string | null;
  price: number; stock: number; images: unknown; materials: unknown;
  isNew: boolean; isBestseller: boolean;
  saleEnabled: boolean; saleDiscountPct: number | null;
  saleStartAt: Date | null; saleEndAt: Date | null;
  collection: { name: string; slug: string };
}): Product {
  const imgs = Array.isArray(p.images) ? (p.images as string[]) : [];
  const mats = Array.isArray(p.materials) ? (p.materials as string[]) : [];
  return {
    id: p.id, slug: p.slug, name: p.name,
    description: p.description ?? "",
    price: p.price, stock: p.stock,
    image: imgs[0] ?? "", images: imgs,
    collection: p.collection.name,
    collectionSlug: p.collection.slug,
    materials: mats,
    isNew: p.isNew, isBestseller: p.isBestseller,
    saleEnabled: p.saleEnabled,
    saleDiscountPct: p.saleDiscountPct,
    saleStartAt: p.saleStartAt?.toISOString() ?? null,
    saleEndAt: p.saleEndAt?.toISOString() ?? null,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.product.findUnique({ where: { slug }, select: { name: true, description: true } });
  return {
    title: p ? `${p.name} — Lira de Luna` : "Producto — Lira de Luna",
    description: p?.description ?? undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  const dbProduct = await prisma.product.findUnique({
    where: { slug, isActive: true },
    include: {
      collection: { select: { name: true, slug: true } },
      variants: { where: { isActive: true }, orderBy: { label: "asc" } },
    },
  });

  if (!dbProduct) notFound();

  const product = mapProduct(dbProduct);
  const variants: ProductVariant[] = dbProduct.variants.map((v) => ({
    id: v.id, label: v.label, type: v.type, stock: v.stock, isActive: v.isActive,
  }));

  const relatedDb = await prisma.product.findMany({
    where: { isActive: true, saleType: "UNIT", collectionId: dbProduct.collectionId, NOT: { id: dbProduct.id } },
    include: { collection: { select: { name: true, slug: true } } },
    take: 4,
    orderBy: { sortOrder: "asc" },
  });
  const related = relatedDb.map(mapProduct);

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">
        <ProductDetail product={product} variants={variants} />
        {related.length > 0 && (
          <section className="bg-brand-beige-light py-20">
            <div className="max-w-7xl mx-auto px-6">
              <h2 className="text-[11px] tracking-[0.3em] uppercase text-brand-dark mb-10">También te puede gustar</h2>
              <ProductGrid products={related} />
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
