"use server";

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { AdminJWTPayload } from "@/controllers/admin-auth.controller";
import type { BrandColors, PageTexts } from "@/types/personalization";
import { DEFAULT_COLORS } from "@/types/personalization";

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

export async function getPersonalizationData() {
  const settings = await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
    select: { brandColors: true, pageTexts: true, logoUrl: true },
  });
  return {
    colors:  (settings.brandColors as BrandColors | null) ?? DEFAULT_COLORS,
    texts:   (settings.pageTexts  as PageTexts   | null) ?? {},
    logoUrl: settings.logoUrl ?? null,
  };
}

export async function updateBrandColors(colors: BrandColors) {
  await requireAdmin();
  await prisma.storeSettings.upsert({
    where:  { id: "singleton" },
    update: { brandColors: colors },
    create: { id: "singleton", brandColors: colors },
  });
  revalidatePath("/", "layout");
  revalidatePath("/admin/personalizacion");
  return { success: true };
}

export async function resetBrandColors() {
  await requireAdmin();
  await prisma.storeSettings.upsert({
    where:  { id: "singleton" },
    update: { brandColors: Prisma.DbNull },
    create: { id: "singleton" },
  });
  revalidatePath("/", "layout");
  revalidatePath("/admin/personalizacion");
  return { success: true };
}

export async function updatePageTextSection(
  key: keyof PageTexts,
  value: string
) {
  await requireAdmin();

  const current = await prisma.storeSettings.findFirst({
    where:  { id: "singleton" },
    select: { pageTexts: true },
  });
  const existing = (current?.pageTexts as PageTexts | null) ?? {};
  const updated: PageTexts = { ...existing, [key]: value.trim() || undefined };

  await prisma.storeSettings.upsert({
    where:  { id: "singleton" },
    update: { pageTexts: updated },
    create: { id: "singleton", pageTexts: updated },
  });

  const pathMap: Record<keyof PageTexts, string> = {
    announcementBar:  "/",
    featuresStrip:    "/",
    footerTagline:    "/",
    socialLinks:      "/",
    nosotros:         "/nosotros",
    guiaCuidado:      "/guia-de-cuidado",
    guiaCuidadoQuote: "/guia-de-cuidado",
    privacidad:       "/privacidad",
    terminos:         "/terminos",
    preguntas:        "/preguntas-frecuentes",
    envios:           "/envios",
  };

  const layoutKeys: (keyof PageTexts)[] = ["announcementBar", "featuresStrip", "footerTagline", "socialLinks"];
  revalidatePath(pathMap[key]);
  if (layoutKeys.includes(key)) revalidatePath("/", "layout");
  return { success: true };
}

export async function resetPageTextSection(key: keyof PageTexts) {
  await requireAdmin();

  const current = await prisma.storeSettings.findFirst({
    where:  { id: "singleton" },
    select: { pageTexts: true },
  });
  const existing = (current?.pageTexts as PageTexts | null) ?? {};
  const updated = { ...existing };
  delete updated[key];

  await prisma.storeSettings.upsert({
    where:  { id: "singleton" },
    update: { pageTexts: updated },
    create: { id: "singleton" },
  });

  const pathMap: Record<keyof PageTexts, string> = {
    announcementBar:  "/",
    featuresStrip:    "/",
    footerTagline:    "/",
    socialLinks:      "/",
    nosotros:         "/nosotros",
    guiaCuidado:      "/guia-de-cuidado",
    guiaCuidadoQuote: "/guia-de-cuidado",
    privacidad:       "/privacidad",
    terminos:         "/terminos",
    preguntas:        "/preguntas-frecuentes",
    envios:           "/envios",
  };

  const layoutKeys: (keyof PageTexts)[] = ["announcementBar", "featuresStrip", "footerTagline", "socialLinks"];
  revalidatePath(pathMap[key]);
  if (layoutKeys.includes(key)) revalidatePath("/", "layout");
  return { success: true };
}
