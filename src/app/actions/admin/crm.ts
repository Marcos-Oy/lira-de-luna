"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { AdminJWTPayload } from "@/controllers/admin-auth.controller";

async function getAdminPayload(): Promise<AdminJWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  try { return jwt.verify(token, process.env.ADMIN_JWT_SECRET!) as AdminJWTPayload; }
  catch { return null; }
}

export async function createLead(data: {
  name: string; email?: string; phone?: string; whatsappNumber?: string;
  source?: string; stage?: string; notes?: string; tags?: string[];
  nextFollowUpAt?: string;
}) {
  const admin = await getAdminPayload();
  if (!admin) return { error: "No autorizado" };

  const lead = await prisma.lead.create({
    data: {
      name:           data.name.trim(),
      email:          data.email?.trim() || null,
      phone:          data.phone?.trim() || null,
      whatsappNumber: data.whatsappNumber?.trim() || null,
      source:         data.source ?? "MANUAL",
      stage:          data.stage  ?? "NEW",
      notes:          data.notes  || null,
      tags:           data.tags   ?? [],
      nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,
      assignedToId:   admin.adminId,
    },
  });

  await prisma.leadActivity.create({
    data: { leadId: lead.id, type: "NOTE", content: "Lead creado manualmente.", adminId: admin.adminId },
  });

  revalidatePath("/admin/crm");
  return { success: true, leadId: lead.id };
}

export async function updateLead(id: string, data: {
  name?: string; email?: string; phone?: string; whatsappNumber?: string;
  notes?: string; tags?: string[]; nextFollowUpAt?: string | null;
  assignedToId?: string | null;
}) {
  const admin = await getAdminPayload();
  if (!admin) return { error: "No autorizado" };

  await prisma.lead.update({
    where: { id },
    data: {
      ...(data.name          !== undefined && { name:           data.name.trim() }),
      ...(data.email         !== undefined && { email:          data.email?.trim()  || null }),
      ...(data.phone         !== undefined && { phone:          data.phone?.trim()  || null }),
      ...(data.whatsappNumber !== undefined && { whatsappNumber: data.whatsappNumber?.trim() || null }),
      ...(data.notes         !== undefined && { notes:          data.notes || null }),
      ...(data.tags          !== undefined && { tags:           data.tags }),
      ...(data.nextFollowUpAt !== undefined && {
        nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,
      }),
      ...(data.assignedToId  !== undefined && { assignedToId:   data.assignedToId }),
    },
  });

  revalidatePath("/admin/crm");
  return { success: true };
}

export async function updateLeadStage(id: string, stage: string) {
  const admin = await getAdminPayload();
  if (!admin) return { error: "No autorizado" };

  const lead = await prisma.lead.findUnique({ where: { id }, select: { stage: true } });
  if (!lead) return { error: "Lead no encontrado" };

  await prisma.lead.update({ where: { id }, data: { stage } });

  await prisma.leadActivity.create({
    data: {
      leadId:  id,
      type:    "STAGE_CHANGE",
      content: `Etapa cambiada a: ${stage}`,
      adminId: admin.adminId,
    },
  });

  revalidatePath("/admin/crm");
  return { success: true };
}

export async function addLeadActivity(data: {
  leadId: string; type: string; content: string;
}) {
  const admin = await getAdminPayload();
  if (!admin) return { error: "No autorizado" };

  await prisma.leadActivity.create({
    data: { leadId: data.leadId, type: data.type, content: data.content, adminId: admin.adminId },
  });

  if (["CALL", "EMAIL", "WHATSAPP"].includes(data.type)) {
    await prisma.lead.update({
      where: { id: data.leadId },
      data: { lastContactedAt: new Date() },
    });
  }

  revalidatePath("/admin/crm");
  revalidatePath(`/admin/crm/${data.leadId}`);
  return { success: true };
}

export async function deleteLead(id: string) {
  const admin = await getAdminPayload();
  if (!admin) return { error: "No autorizado" };

  await prisma.lead.delete({ where: { id } });
  revalidatePath("/admin/crm");
  return { success: true };
}
