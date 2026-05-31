import { prisma } from "@/lib/db";

export const CollectionModel = {
  findAll: () =>
    prisma.collection.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { sortOrder: "asc" },
    }),

  findActive: () =>
    prisma.collection.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),

  findBySlug: (slug: string) =>
    prisma.collection.findUnique({
      where: { slug },
      include: {
        products: {
          where: { isActive: true },
          include: { variants: { where: { isActive: true } } },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),

  create: (data: { slug: string; name: string; description?: string; image?: string; sortOrder?: number }) =>
    prisma.collection.create({ data }),

  update: (id: string, data: Partial<{ name: string; description: string; image: string; isActive: boolean; sortOrder: number }>) =>
    prisma.collection.update({ where: { id }, data }),

  delete: (id: string) => prisma.collection.delete({ where: { id } }),

  reorder: (items: { id: string; sortOrder: number }[]) =>
    prisma.$transaction(
      items.map(({ id, sortOrder }) => prisma.collection.update({ where: { id }, data: { sortOrder } }))
    ),
};
