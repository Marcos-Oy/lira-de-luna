import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navbar         from "@/components/layout/Navbar";
import Footer         from "@/components/layout/Footer";
import TiendaClient   from "@/components/products/TiendaClient";
import { prisma }     from "@/lib/db";
import { ProductModel } from "@/models/product.model";
import { Store }      from "lucide-react";
import type { Metadata } from "next";
import type { Product }  from "@/lib/mock-data";
import { auth }       from "@/auth";

export const metadata: Metadata = { title: "Tienda — Lira de Luna" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

function parseParam(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function parseArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v.filter(Boolean) : [v];
}

export default async function TiendaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;

  const q              = parseParam(sp.q);
  const collectionSlug = parseParam(sp.col);
  const sort           = parseParam(sp.sort) ?? "newest";
  const saleOnly       = sp.sale === "1";
  const page           = Math.max(1, parseInt(parseParam(sp.page) ?? "1") || 1);
  const priceMin       = sp.priceMin ? parseInt(sp.priceMin as string) || undefined : undefined;
  const priceMax       = sp.priceMax ? parseInt(sp.priceMax as string) || undefined : undefined;
  const materials      = parseArray(sp.mat);

  const session = await auth();

  const [settings, paginated, collections, filterGroups] = await Promise.all([
    prisma.storeSettings.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } }),
    ProductModel.findPaginated({ q, collectionSlug, sort, saleOnly, priceMin, priceMax, materials, page, pageSize: PAGE_SIZE }),
    prisma.collection.findMany({
      where:   { isActive: true },
      orderBy: { sortOrder: "asc" },
      select:  { name: true, slug: true, collectionType: true },
    }),
    prisma.filterGroup.findMany({
      where:   { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: { options: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  if (!settings.retailEnabled) {
    return (
      <>
        <AnnouncementBar />
        <Navbar />
        <main className="min-h-[60vh] flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-[#EDE2D8] flex items-center justify-center mx-auto mb-6">
              <Store size={28} strokeWidth={1} className="text-[#CDA78F]" />
            </div>
            <h1 className="font-heading text-3xl text-brand-dark tracking-widest uppercase mb-3">No disponible</h1>
            <p className="text-sm text-brand-taupe leading-relaxed">La tienda minorista no está disponible en este momento.</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Mapear productos de BD al tipo Product del front
  const products: Product[] = paginated.products.map((p) => {
    const imgs = Array.isArray(p.images) ? (p.images as string[]) : [];
    const mats = Array.isArray(p.materials) ? (p.materials as string[]) : [];
    return {
      id:              p.id,
      slug:            p.slug,
      name:            p.name,
      description:     p.description ?? "",
      price:           p.price,
      stock:           p.stock,
      image:           imgs[0] ?? "",
      images:          imgs,
      collection:      p.collection.name,
      collectionSlug:  p.collection.slug,
      materials:       mats,
      isNew:           p.isNew,
      isBestseller:    p.isBestseller,
      saleEnabled:     p.saleEnabled,
      saleDiscountPct: p.saleDiscountPct,
      saleStartAt:     p.saleStartAt?.toISOString() ?? null,
      saleEndAt:       p.saleEndAt?.toISOString()   ?? null,
    };
  });

  // Wishlist del usuario
  const wishlistIds = new Set<string>();
  if (session?.user?.id && products.length > 0) {
    const items = await prisma.wishlistItem.findMany({
      where:  { userId: session.user.id, productId: { in: products.map((p) => p.id) } },
      select: { productId: true },
    });
    items.forEach((i) => wishlistIds.add(i.productId));
  }

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">
        <div className="bg-brand-beige-light border-b border-brand-beige py-12 text-center">
          <p className="text-[10px] tracking-[0.3em] uppercase text-brand-taupe mb-2">Explorar</p>
          <h1 className="font-heading text-5xl text-brand-dark">Tienda</h1>
          {q && (
            <p className="text-sm text-brand-taupe mt-2">
              Resultados para: <strong className="text-brand-dark">&ldquo;{q}&rdquo;</strong>
            </p>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12">
          <TiendaClient
            products={products}
            categories={collections}
            filterGroups={filterGroups}
            wishlistIds={[...wishlistIds]}
            total={paginated.total}
            page={paginated.page}
            totalPages={paginated.totalPages}
            currentFilters={{ q, col: collectionSlug, sort, sale: saleOnly, priceMin, priceMax, materials }}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
