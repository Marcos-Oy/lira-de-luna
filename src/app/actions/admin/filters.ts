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

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Filter Groups ─────────────────────────────────────────────

export async function createFilterGroup(data: {
  name: string;
  kind: "MATERIAL" | "PRICE_RANGE" | "CUSTOM";
}) {
  await requireAdmin();
  if (!data.name.trim()) return { error: "El nombre es requerido" };

  let slug = toSlug(data.name.trim());
  // ensure uniqueness
  const existing = await prisma.filterGroup.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const count = await prisma.filterGroup.count();
  const group = await prisma.filterGroup.create({
    data: { name: data.name.trim(), slug, kind: data.kind, sortOrder: count },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });

  revalidatePath("/admin/filtros");
  revalidatePath("/tienda");
  return { success: true, group };
}

export async function updateFilterGroup(id: string, data: { name: string }) {
  await requireAdmin();
  if (!data.name.trim()) return { error: "El nombre es requerido" };
  await prisma.filterGroup.update({ where: { id }, data: { name: data.name.trim() } });
  revalidatePath("/admin/filtros");
  revalidatePath("/tienda");
  return { success: true };
}

export async function deleteFilterGroup(id: string) {
  await requireAdmin();
  try {
    await prisma.filterGroup.delete({ where: { id } });
  } catch {
    return { success: false, error: "No se pudo eliminar el grupo de filtros" };
  }
  revalidatePath("/admin/filtros");
  revalidatePath("/tienda");
  return { success: true, error: null };
}

export async function toggleFilterGroupActive(id: string, isActive: boolean) {
  await requireAdmin();
  await prisma.filterGroup.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/filtros");
  revalidatePath("/tienda");
  return { success: true };
}

// ── Filter Options ────────────────────────────────────────────

export async function createFilterOption(groupId: string, data: {
  label: string;
  value?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
}) {
  await requireAdmin();
  if (!data.label.trim()) return { error: "La etiqueta es requerida" };

  const count = await prisma.filterOption.count({ where: { groupId } });
  const option = await prisma.filterOption.create({
    data: {
      groupId,
      label: data.label.trim(),
      value: (data.value ?? data.label).trim(),
      minPrice: data.minPrice ?? null,
      maxPrice: data.maxPrice ?? null,
      sortOrder: count,
    },
  });

  revalidatePath("/admin/filtros");
  revalidatePath("/tienda");
  return { success: true, option };
}

export async function updateFilterOption(id: string, data: {
  label: string;
  value?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
}) {
  await requireAdmin();
  if (!data.label.trim()) return { error: "La etiqueta es requerida" };

  await prisma.filterOption.update({
    where: { id },
    data: {
      label: data.label.trim(),
      value: (data.value ?? data.label).trim(),
      minPrice: data.minPrice ?? null,
      maxPrice: data.maxPrice ?? null,
    },
  });

  revalidatePath("/admin/filtros");
  revalidatePath("/tienda");
  return { success: true };
}

export async function deleteFilterOption(id: string) {
  await requireAdmin();
  await prisma.filterOption.delete({ where: { id } });
  revalidatePath("/admin/filtros");
  revalidatePath("/tienda");
  return { success: true };
}

export async function toggleFilterOptionActive(id: string, isActive: boolean) {
  await requireAdmin();
  await prisma.filterOption.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/filtros");
  revalidatePath("/tienda");
  return { success: true };
}
