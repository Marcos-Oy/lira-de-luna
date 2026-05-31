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

export async function createLoss(data: {
  description: string;
  amount:      number;
  category:    string;
  notes?:      string;
  date?:       string;
}) {
  const admin = await requireAdmin();
  if (!data.description.trim() || data.amount <= 0) return { error: "Datos incompletos" };

  await prisma.lossRecord.create({
    data: {
      description: data.description.trim(),
      amount:      data.amount,
      category:    data.category,
      notes:       data.notes?.trim() || null,
      date:        data.date ? new Date(data.date) : new Date(),
      adminId:     admin.adminId,
    },
  });

  revalidatePath("/admin/perdidas");
  revalidatePath("/admin");
  return { success: true };
}

export async function updateLoss(id: string, data: {
  description: string;
  amount:      number;
  category:    string;
  notes?:      string;
  date?:       string;
}) {
  await requireAdmin();
  if (!data.description.trim() || data.amount <= 0) return { error: "Datos incompletos" };

  await prisma.lossRecord.update({
    where: { id },
    data: {
      description: data.description.trim(),
      amount:      data.amount,
      category:    data.category,
      notes:       data.notes?.trim() || null,
      date:        data.date ? new Date(data.date) : undefined,
    },
  });

  revalidatePath("/admin/perdidas");
  revalidatePath("/admin");
  return { success: true };
}

export async function deleteLoss(id: string) {
  await requireAdmin();
  await prisma.lossRecord.delete({ where: { id } });
  revalidatePath("/admin/perdidas");
  revalidatePath("/admin");
  return { success: true };
}
