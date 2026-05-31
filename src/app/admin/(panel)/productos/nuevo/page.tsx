import { prisma } from "@/lib/db";
import NuevoProductoClient from "./NuevoProductoClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nuevo producto — Admin" };

export default async function NuevoProductoPage() {
  const collections = await prisma.collection.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true },
  });

  return <NuevoProductoClient collections={collections} />;
}
