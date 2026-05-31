"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { AdminJWTPayload } from "@/controllers/admin-auth.controller";
import type { EventConfig } from "@/lib/crm";

async function getAdmin(): Promise<AdminJWTPayload | null> {
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

// ── Create ────────────────────────────────────────────────────

export async function createEventLP(data: { title: string; config: EventConfig }) {
  const admin = await getAdmin();
  if (!admin) return { error: "No autorizado" };
  if (!data.title.trim()) return { error: "El título es requerido" };

  let slug = slugify(data.title);
  const existing = await prisma.landingPage.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  // Create with default type (PROMO), then set type=EVENT via raw SQL
  const lp = await prisma.landingPage.create({
    data: { title: data.title.trim(), slug, config: data.config as never },
  });
  await prisma.$executeRaw`UPDATE LandingPage SET type = 'EVENT' WHERE id = ${lp.id}`;

  revalidatePath("/admin/eventos");
  return { success: true, id: lp.id, slug: lp.slug };
}

// ── Update ────────────────────────────────────────────────────

export async function updateEventLP(
  id: string,
  data: { title?: string; config?: EventConfig; isActive?: boolean }
) {
  const admin = await getAdmin();
  if (!admin) return { error: "No autorizado" };

  await prisma.landingPage.update({
    where: { id },
    data: {
      ...(data.title    !== undefined && { title:    data.title.trim() }),
      ...(data.config   !== undefined && { config:   data.config as never }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  revalidatePath("/admin/eventos");
  revalidatePath(`/admin/eventos/${id}`);
  return { success: true };
}

// ── Delete ────────────────────────────────────────────────────

export async function deleteEventLP(id: string) {
  const admin = await getAdmin();
  if (!admin) return { error: "No autorizado" };
  await prisma.landingPage.delete({ where: { id } });
  revalidatePath("/admin/eventos");
  return { success: true };
}

// ── Registration management ───────────────────────────────────

async function getRegLandingPageId(registrationId: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ landingPageId: string }[]>`
    SELECT landingPageId FROM EventRegistration WHERE id = ${registrationId} LIMIT 1
  `;
  return rows[0]?.landingPageId ?? null;
}

export async function confirmTransferPayment(registrationId: string, notes?: string) {
  const admin = await getAdmin();
  if (!admin) return { error: "No autorizado" };

  const lpId = await getRegLandingPageId(registrationId);
  if (!lpId) return { error: "Registro no encontrado" };

  await prisma.$executeRaw`
    UPDATE EventRegistration SET paymentStatus = 'PAID' WHERE id = ${registrationId}
  `;
  if (notes) {
    await prisma.$executeRaw`
      UPDATE EventRegistration SET paymentNotes = ${notes} WHERE id = ${registrationId}
    `;
  }

  revalidatePath(`/admin/eventos/${lpId}`);
  return { success: true };
}

export async function cancelRegistration(registrationId: string) {
  const admin = await getAdmin();
  if (!admin) return { error: "No autorizado" };

  const lpId = await getRegLandingPageId(registrationId);
  if (!lpId) return { error: "Registro no encontrado" };

  await prisma.$executeRaw`
    UPDATE EventRegistration SET paymentStatus = 'CANCELLED' WHERE id = ${registrationId}
  `;

  revalidatePath(`/admin/eventos/${lpId}`);
  return { success: true };
}

export async function markAttended(registrationId: string, attended: boolean) {
  const admin = await getAdmin();
  if (!admin) return { error: "No autorizado" };

  const lpId = await getRegLandingPageId(registrationId);
  if (!lpId) return { error: "Registro no encontrado" };

  if (attended) {
    await prisma.$executeRaw`
      UPDATE EventRegistration SET attended = 1, attendedAt = NOW() WHERE id = ${registrationId}
    `;
  } else {
    await prisma.$executeRaw`
      UPDATE EventRegistration SET attended = 0, attendedAt = NULL WHERE id = ${registrationId}
    `;
  }

  revalidatePath(`/admin/eventos/${lpId}`);
  return { success: true };
}

export async function updateRegistrationNotes(registrationId: string, notes: string) {
  const admin = await getAdmin();
  if (!admin) return { error: "No autorizado" };

  const lpId = await getRegLandingPageId(registrationId);
  if (!lpId) return { error: "Registro no encontrado" };

  await prisma.$executeRaw`
    UPDATE EventRegistration SET paymentNotes = ${notes} WHERE id = ${registrationId}
  `;

  revalidatePath(`/admin/eventos/${lpId}`);
  return { success: true };
}
