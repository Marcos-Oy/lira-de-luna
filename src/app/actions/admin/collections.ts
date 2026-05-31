"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { AdminJWTPayload } from "@/controllers/admin-auth.controller";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) throw new Error("No autorizado");
  try {
    return jwt.verify(token, process.env.ADMIN_JWT_SECRET!) as AdminJWTPayload;
  } catch {
    throw new Error("No autorizado");
  }
}

export async function createCollection(data: {
  name:           string;
  slug:           string;
  description?:   string;
  image?:         string;
  sortOrder?:     number;
  collectionType?: string;
}) {
  await requireAdmin();

  const existing = await prisma.collection.findUnique({ where: { slug: data.slug } });
  if (existing) return { error: "Ya existe una colección con ese slug" };

  await prisma.collection.create({
    data: {
      name:           data.name,
      slug:           data.slug,
      description:    data.description    || null,
      image:          data.image          || null,
      sortOrder:      data.sortOrder      ?? 0,
      collectionType: (data.collectionType as never) ?? "JEWELRY",
      isActive:       true,
    },
  });

  revalidatePath("/admin/colecciones");
  revalidatePath("/colecciones");
  return { success: true };
}

export async function updateCollection(
  id: string,
  data: {
    name:            string;
    description?:    string;
    image?:          string;
    sortOrder?:      number;
    isActive?:       boolean;
    collectionType?: string;
  }
) {
  await requireAdmin();

  await prisma.collection.update({
    where: { id },
    data: {
      name:           data.name,
      description:    data.description    || null,
      image:          data.image          || null,
      sortOrder:      data.sortOrder      ?? 0,
      isActive:       data.isActive       ?? true,
      collectionType: (data.collectionType as never) ?? "JEWELRY",
    },
  });

  revalidatePath("/admin/colecciones");
  revalidatePath("/colecciones");
  return { success: true };
}

export async function deleteCollection(id: string) {
  await requireAdmin();

  const productCount = await prisma.product.count({ where: { collectionId: id } });
  if (productCount > 0) {
    return { error: `No se puede eliminar: tiene ${productCount} producto(s) asociado(s)` };
  }

  await prisma.collection.delete({ where: { id } });
  revalidatePath("/admin/colecciones");
  revalidatePath("/colecciones");
  return { success: true };
}

export async function toggleCollectionActive(id: string, isActive: boolean) {
  await requireAdmin();
  await prisma.collection.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/colecciones");
  return { success: true };
}
