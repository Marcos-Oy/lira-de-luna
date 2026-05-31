import { notFound } from "next/navigation";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductGrid from "@/components/products/ProductGrid";
import { prisma } from "@/lib/db";
import Image from "next/image";
import type { Product } from "@/lib/mock-data";
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
  const col = await prisma.collection.findUnique({
    where: { slug },
    select: { name: true, description: true },
  });
  return {
    title: col ? `${col.name} — Lira de Luna` : "Colección — Lira de Luna",
    description: col?.description ?? undefined,
  };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;

  const collection = await prisma.collection.findUnique({
    where: { slug, isActive: true },
    select: { id: true, name: true, slug: true, description: true, image: true },
  });

  if (!collection) notFound();

  const dbProducts = await prisma.product.findMany({
    where: { isActive: true, saleType: "UNIT", collection: { slug } },
    include: { collection: { select: { name: true, slug: true } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  const products: Product[] = dbProducts.map(mapProduct);

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">
        {/* Banner */}
        <div className="relative h-64 md:h-80 overflow-hidden">
          {collection.image ? (
            <Image
              src={collection.image}
              alt={collection.name}
              fill
              className="object-cover object-center"
              sizes="100vw"
            />
          ) : (
            <div className="absolute inset-0 bg-brand-beige-light" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-brand-cream/70 via-brand-cream/30 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl mx-auto px-6">
              <p className="text-[10px] tracking-[0.3em] uppercase text-brand-taupe mb-2">
                Colección
              </p>
              <h1 className="font-heading text-5xl md:text-6xl text-brand-dark">
                {collection.name}
              </h1>
              {collection.description && (
                <p className="text-sm text-brand-taupe font-light mt-3 max-w-xs">
                  {collection.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex items-center justify-between mb-10">
            <p className="text-xs text-brand-taupe tracking-wide">
              {products.length} {products.length === 1 ? "pieza" : "piezas"}
            </p>
          </div>
          {products.length > 0 ? (
            <ProductGrid products={products} />
          ) : (
            <p className="text-sm text-brand-taupe text-center py-16">
              No hay productos disponibles en esta colección.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
