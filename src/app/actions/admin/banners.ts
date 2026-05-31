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

type BannerData = {
  image: string;
  eyebrow: string;
  heading: string;
  body?: string;
  ctaLabel: string;
  ctaHref: string;
  sortOrder: number;
};

export async function createBanner(data: BannerData) {
  await requireAdmin();
  await prisma.banner.create({ data });
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { success: true };
}

export async function updateBanner(id: string, data: BannerData) {
  await requireAdmin();
  await prisma.banner.update({ where: { id }, data });
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { success: true };
}

export async function deleteBanner(id: string) {
  await requireAdmin();
  await prisma.banner.delete({ where: { id } });
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { success: true };
}

export async function toggleBannerActive(id: string, isActive: boolean) {
  await requireAdmin();
  await prisma.banner.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { success: true };
}
