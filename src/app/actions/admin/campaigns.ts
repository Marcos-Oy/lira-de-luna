"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { AdminJWTPayload } from "@/controllers/admin-auth.controller";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { sendMail, campaignHtml } from "@/lib/email";

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

// ── Suscriptores ──────────────────────────────────────────────

export async function getSubscribers() {
  await requireAdmin();
  return prisma.newsletterSubscriber.findMany({
    orderBy: { subscribedAt: "desc" },
    include: { user: { select: { name: true } } },
  });
}

export async function unsubscribeManual(id: string) {
  await requireAdmin();
  await prisma.newsletterSubscriber.update({
    where: { id },
    data: { isActive: false },
  });
  revalidatePath("/admin/campanas");
  return { success: true };
}

export async function resubscribeManual(id: string) {
  await requireAdmin();
  await prisma.newsletterSubscriber.update({
    where: { id },
    data: { isActive: true },
  });
  revalidatePath("/admin/campanas");
  return { success: true };
}

export async function deleteSubscriber(id: string) {
  await requireAdmin();
  await prisma.newsletterSubscriber.delete({ where: { id } });
  revalidatePath("/admin/campanas");
  return { success: true };
}

// ── Campañas ──────────────────────────────────────────────────

export async function saveCampaignDraft(data: {
  subject: string;
  preheader: string;
  content: string;
  imageUrl?: string;
}) {
  await requireAdmin();
  const campaign = await prisma.campaign.create({
    data: {
      subject:  data.subject.trim(),
      preheader: data.preheader.trim() || null,
      content:  data.content,
      imageUrl: data.imageUrl ?? null,
      status:   "draft",
    },
  });
  revalidatePath("/admin/campanas");
  return { success: true, id: campaign.id };
}

export async function uploadCampaignImage(formData: FormData) {
  await requireAdmin();
  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) return { error: "No se seleccionó ningún archivo" };

  const allowed = ["image/png", "image/jpeg", "image/webp"];
  if (!allowed.includes(file.type)) return { error: "Usa PNG, JPG o WebP" };
  if (file.size > 5 * 1024 * 1024) return { error: "Máximo 5 MB" };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const fileName = `campaign-${Date.now()}.${ext}`;
  const uploadDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, fileName), Buffer.from(await file.arrayBuffer()));

  return { success: true, imageUrl: `/uploads/${fileName}` };
}

export async function sendCampaign(data: {
  subject: string;
  preheader: string;
  content: string;
  imageUrl?: string;
}) {
  await requireAdmin();
  if (!data.subject.trim()) return { error: "El asunto es obligatorio" };
  if (!data.content.trim()) return { error: "El contenido es obligatorio" };

  const settings = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });
  const storeName = settings?.storeName ?? "Lira de Luna";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { isActive: true },
    select: { id: true, email: true },
  });

  if (subscribers.length === 0) return { error: "No hay suscriptores activos" };

  const campaign = await prisma.campaign.create({
    data: {
      subject:  data.subject.trim(),
      preheader: data.preheader.trim() || null,
      content:  data.content,
      imageUrl: data.imageUrl ?? null,
      status:   "sending",
    },
  });

  let sent = 0;
  for (const sub of subscribers) {
    const unsubUrl = `${siteUrl}/newsletter/unsub?id=${sub.id}`;
    const html = campaignHtml({
      storeName,
      content: data.content,
      imageUrl: data.imageUrl,
      unsubscribeUrl: unsubUrl,
    });
    const res = await sendMail({
      to: sub.email,
      subject: data.subject.trim(),
      html,
      text: data.preheader || data.subject,
    });
    if (res.ok) sent++;
  }

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: "sent", sentCount: sent, sentAt: new Date() },
  });

  // Log
  await prisma.emailLog.createMany({
    data: subscribers.slice(0, sent).map((s) => ({
      to: s.email,
      subject: data.subject.trim(),
      type: "NEWSLETTER" as const,
      status: "sent",
    })),
    skipDuplicates: true,
  });

  revalidatePath("/admin/campanas");
  return { success: true, sent, total: subscribers.length };
}

export async function getCampaigns() {
  await requireAdmin();
  return prisma.campaign.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
}
