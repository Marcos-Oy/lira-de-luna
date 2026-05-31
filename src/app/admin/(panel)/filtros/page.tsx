import { prisma } from "@/lib/db";
import AdminFiltrosClient from "./AdminFiltrosClient";

export default async function AdminFiltrosPage() {
  const [filterGroups, collections] = await Promise.all([
    prisma.filterGroup.findMany({
      orderBy: { sortOrder: "asc" },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.collection.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, isActive: true },
    }),
  ]);

  return <AdminFiltrosClient filterGroups={filterGroups} collections={collections} />;
}
