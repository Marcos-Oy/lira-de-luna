import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { ProductInput, ProductVariantInput, WholesaleTierInput, WeightProductInput } from "@/lib/validations/product";

export type PaginatedFilters = {
  q?:              string;
  collectionSlug?: string;
  sort?:           string;
  saleOnly?:       boolean;
  priceMin?:       number;
  priceMax?:       number;
  materials?:      string[];
  page?:           number;
  pageSize?:       number;
};

export const ProductModel = {
  findAll: (filters?: { collectionId?: string; isActive?: boolean; saleType?: string }) =>
    prisma.product.findMany({
      where: {
        ...(filters?.collectionId && { collectionId: filters.collectionId }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters?.saleType && { saleType: filters.saleType as never }),
      },
      include: { collection: true, variants: true, wholesaleTiers: true, weightProduct: true },
      orderBy: { sortOrder: "asc" },
    }),

  findBySlug: (slug: string) =>
    prisma.product.findUnique({
      where: { slug },
      include: {
        collection:    true,
        variants:      { where: { isActive: true } },
        wholesaleTiers: { orderBy: { minQuantity: "asc" } },
        weightProduct: true,
        reviews:       { where: { isVisible: true }, include: { user: { select: { name: true } } } },
      },
    }),

  findById: (id: string) =>
    prisma.product.findUnique({
      where:   { id },
      include: { variants: true, wholesaleTiers: true, weightProduct: true },
    }),

  findBestsellers: (limit = 8) =>
    prisma.product.findMany({
      where:   { isBestseller: true, isActive: true },
      include: { collection: true },
      take:    limit,
      orderBy: { sortOrder: "asc" },
    }),

  /**
   * Consulta paginada y filtrada a nivel SQL.
   * Nunca carga todos los productos en memoria — usa LIMIT/OFFSET en la BD.
   * La ventana de páginas (10 en 10) se gestiona en la UI con totalPages.
   */
  findPaginated: async (params: PaginatedFilters) => {
    const page     = Math.max(1, params.page ?? 1);
    const pageSize = params.pageSize ?? 24;
    const now      = new Date();

    // Construimos el WHERE acumulando condiciones para evitar conflictos entre OR anidados
    const conditions: Prisma.ProductWhereInput[] = [
      { isActive: true },
      { saleType: "UNIT" },
    ];

    if (params.q?.trim()) {
      conditions.push({
        OR: [
          { name:        { contains: params.q } },
          { description: { contains: params.q } },
        ],
      });
    }

    if (params.collectionSlug) {
      conditions.push({ collection: { slug: params.collectionSlug } });
    }

    if (params.saleOnly) {
      conditions.push({ saleEnabled: true });
      conditions.push({ saleStartAt: { lte: now } });
      conditions.push({
        OR: [{ saleEndAt: null }, { saleEndAt: { gte: now } }],
      });
    }

    if (params.priceMin !== undefined) conditions.push({ price: { gte: params.priceMin } });
    if (params.priceMax !== undefined) conditions.push({ price: { lte: params.priceMax } });

    if (params.materials?.length) {
      // Producto debe tener AL MENOS UNO de los materiales seleccionados
      conditions.push({
        OR: params.materials.map((m) => ({ materials: { array_contains: m } })),
      });
    }

    const where: Prisma.ProductWhereInput = { AND: conditions };

    const orderBy = ((): Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] => {
      switch (params.sort) {
        case "price-asc":  return { price: "asc" };
        case "price-desc": return { price: "desc" };
        case "bestseller": return [{ isBestseller: "desc" }, { sortOrder: "asc" }];
        default:           return [{ sortOrder: "asc" }, { createdAt: "desc" }];
      }
    })();

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { collection: { select: { name: true, slug: true } } },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  /** Devuelve solo {id, stock} para múltiples productos — usado en validación de stock al hacer checkout. */
  findStockByIds: (ids: string[]) =>
    ids.length
      ? prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, stock: true } })
      : Promise.resolve([] as { id: string; stock: number }[]),

  /** Devuelve solo {id, stock} para múltiples variantes — usado en validación de stock al hacer checkout. */
  findVariantStockByIds: (ids: string[]) =>
    ids.length
      ? prisma.productVariant.findMany({ where: { id: { in: ids } }, select: { id: true, stock: true } })
      : Promise.resolve([] as { id: string; stock: number }[]),

  create: (data: ProductInput) =>
    prisma.product.create({
      data: { ...data, saleType: data.saleType as never },
    }),

  update: (id: string, data: Partial<ProductInput>) =>
    prisma.product.update({
      where: { id },
      data:  { ...(data.saleType && { saleType: data.saleType as never }), ...data },
    }),

  delete: (id: string) => prisma.product.delete({ where: { id } }),

  addVariant: (productId: string, data: ProductVariantInput) =>
    prisma.productVariant.create({ data: { productId, ...data } }),

  updateVariant: (id: string, data: Partial<ProductVariantInput>) =>
    prisma.productVariant.update({ where: { id }, data }),

  deleteVariant: (id: string) => prisma.productVariant.delete({ where: { id } }),

  upsertWholesaleTier: (productId: string, id: string | undefined, data: WholesaleTierInput) =>
    id
      ? prisma.wholesaleTier.update({ where: { id }, data })
      : prisma.wholesaleTier.create({ data: { productId, ...data } }),

  deleteWholesaleTier: (id: string) => prisma.wholesaleTier.delete({ where: { id } }),

  upsertWeightProduct: (productId: string, data: WeightProductInput) =>
    prisma.weightProduct.upsert({
      where:  { productId },
      create: { productId, ...data, metalType: data.metalType as never },
      update: { ...data, metalType: data.metalType as never },
    }),
};
