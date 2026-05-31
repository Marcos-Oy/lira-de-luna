"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { AdminJWTPayload } from "@/controllers/admin-auth.controller";
import type { LandingPageConfig } from "@/lib/crm";

async function getAdminPayload(): Promise<AdminJWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  try { return jwt.verify(token, process.env.ADMIN_JWT_SECRET!) as AdminJWTPayload; }
  catch { return null; }
}

function slugify(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function createLandingPage(data: { title: string; config: LandingPageConfig }) {
  const admin = await getAdminPayload();
  if (!admin) return { error: "No autorizado" };
  if (!data.title.trim()) return { error: "El título es requerido" };

  let slug = slugify(data.title);
  const existing = await prisma.landingPage.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const lp = await prisma.landingPage.create({
    data: { title: data.title.trim(), slug, config: data.config as never },
  });

  revalidatePath("/admin/landing-pages");
  return { success: true, id: lp.id, slug: lp.slug };
}

export async function updateLandingPage(id: string, data: { title?: string; config?: LandingPageConfig; isActive?: boolean }) {
  const admin = await getAdminPayload();
  if (!admin) return { error: "No autorizado" };

  await prisma.landingPage.update({
    where: { id },
    data: {
      ...(data.title    !== undefined && { title:    data.title.trim() }),
      ...(data.config   !== undefined && { config:   data.config as never }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  revalidatePath("/admin/landing-pages");
  revalidatePath(`/admin/landing-pages/${id}`);
  return { success: true };
}

export async function deleteLandingPage(id: string) {
  const admin = await getAdminPayload();
  if (!admin) return { error: "No autorizado" };

  await prisma.landingPage.delete({ where: { id } });
  revalidatePath("/admin/landing-pages");
  return { success: true };
}
