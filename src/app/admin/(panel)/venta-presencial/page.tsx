import { prisma } from "@/lib/db"
import VentaPresencialClient from "./VentaPresencialClient"

export default async function VentaPresencialPage() {
  const [products, collections, filterGroups] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: {
        collection: { select: { id: true, name: true } },
        variants: { where: { isActive: true }, orderBy: { label: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.collection.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.filterGroup.findMany({
      where: { isActive: true },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
  ])

  return (
    <VentaPresencialClient
      products={products as never}
      collections={collections}
      filterGroups={filterGroups as never}
    />
  )
}
