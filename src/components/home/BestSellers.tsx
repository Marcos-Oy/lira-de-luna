import Link from "next/link";
import { prisma } from "@/lib/db";
import ProductCard from "@/components/products/ProductCard";
import type { Product } from "@/lib/mock-data";
import { auth } from "@/auth";

export default async function BestSellers() {
  const session = await auth();
  const wishlistIds = new Set<string>();
  if (session?.user?.id) {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: session.user.id },
      select: { productId: true },
    });
    items.forEach((i) => wishlistIds.add(i.productId));
  }

  const dbProducts = await prisma.product.findMany({
    where: { isActive: true, saleType: "UNIT" },
    include: { collection: { select: { name: true, slug: true } } },
    orderBy: [{ isBestseller: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    take: 4,
  });

  if (dbProducts.length === 0) return null;

  const products: Product[] = dbProducts.map((p) => {
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
  });

  return (
    <section className="py-20 bg-brand-beige-light">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-[11px] tracking-[0.3em] uppercase text-brand-dark">
            Productos más amados
          </h2>
          <Link
            href="/tienda"
            className="text-[10px] tracking-[0.2em] uppercase text-brand-taupe hover:text-brand-dark transition-colors underline underline-offset-4"
          >
            Ver todos
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} isWished={wishlistIds.has(product.id)} />
          ))}
        </div>
      </div>
    </section>
  );
}
