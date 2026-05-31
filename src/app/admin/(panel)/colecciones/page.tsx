import { prisma } from "@/lib/db";
import AdminColeccionesClient from "./AdminColeccionesClient";

export default async function AdminColeccionesPage() {
  const collections = await prisma.collection.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return <AdminColeccionesClient collections={collections} />;
}
