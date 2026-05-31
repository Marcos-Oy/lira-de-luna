import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import AdminProductosClient from "./AdminProductosClient";

const PAGE_SIZE = 25;

export default async function AdminProductosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;

  const page         = Math.max(1, parseInt(sp.page ?? "1"));
  const q            = sp.q?.trim()      ?? "";
  const collection   = sp.collection    ?? "";
  const status       = sp.status        ?? "";   // "active" | "inactive" | ""
  const saleType     = sp.saleType      ?? "";
  const stockFilter  = sp.stock         ?? "";   // "in" | "out" | ""
  const minPrice     = parseInt(sp.minPrice ?? "0") || 0;
  const maxPrice     = parseInt(sp.maxPrice ?? "0") || 0;
  const dateFrom     = sp.dateFrom      ?? "";
  const dateTo       = sp.dateTo        ?? "";
  const sort         = sp.sort          ?? "newest";

  const where: Prisma.ProductWhereInput = {};

  if (q) {
    where.OR = [
      { name: { contains: q } },
      { slug: { contains: q } },
      { description: { contains: q } },
    ];
  }
  if (collection)  where.collectionId = collection;
  if (status === "active")   where.isActive = true;
  if (status === "inactive") where.isActive = false;
  if (saleType)    where.saleType = saleType as Prisma.EnumSaleTypeFilter;
  if (stockFilter === "in")  where.stock = { gt: 0 };
  if (stockFilter === "out") where.stock = 0;
  if (minPrice > 0) where.price = { ...where.price as Prisma.IntFilter, gte: minPrice };
  if (maxPrice > 0) where.price = { ...where.price as Prisma.IntFilter, lte: maxPrice };
  if (dateFrom || dateTo) {
    const dtFilter: Prisma.DateTimeFilter = {};
    if (dateFrom) dtFilter.gte = new Date(dateFrom);
    if (dateTo) { const end = new Date(dateTo); end.setHours(23, 59, 59, 999); dtFilter.lte = end; }
    where.createdAt = dtFilter;
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "oldest"    ? { createdAt: "asc"  } :
    sort === "name_asc"  ? { name:      "asc"  } :
    sort === "name_desc" ? { name:      "desc" } :
    sort === "price_hi"  ? { price:     "desc" } :
    sort === "price_lo"  ? { price:     "asc"  } :
    sort === "stock_lo"  ? { stock:     "asc"  } :
                           { createdAt: "desc" };

  const skip = (page - 1) * PAGE_SIZE;

  const [products, total, collections] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      include: {
        collection:     { select: { name: true, slug: true } },
        wholesaleTiers: { orderBy: { sortOrder: "asc" } },
        weightProduct:  true,
        variants:       { orderBy: { label: "asc" }, select: { id: true, label: true, type: true, stock: true, isActive: true } },
      },
    }),
    prisma.product.count({ where }),
    prisma.collection.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AdminProductosClient
      products={products as never}
      collections={collections}
      totalProducts={total}
      totalPages={totalPages}
      currentPage={page}
      filters={{ q, collection, status, saleType, stock: stockFilter, minPrice: minPrice || undefined, maxPrice: maxPrice || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, sort }}
    />
  );
}
