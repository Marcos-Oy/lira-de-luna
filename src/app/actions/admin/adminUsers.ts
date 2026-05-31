"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireActiveAdmin } from "@/lib/require-admin";

async function getAdminPayload() {
  try { return await requireActiveAdmin(); }
  catch { return null; }
}

async function requireRoot() {
  try {
    const payload = await requireActiveAdmin();
    if (payload.role !== "ROOT") return { error: "Solo ROOT puede gestionar administradores", payload: null };
    return { error: null, payload };
  } catch {
    return { error: "No autorizado", payload: null };
  }
}

export async function createAdminUser(formData: FormData) {
  const { error, payload } = await requireRoot();
  if (error || !payload) return { error: error ?? "No autorizado" };

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;
  const permissions = formData.getAll("permissions") as string[];
  const whatsappNumber = (formData.get("whatsappNumber") as string)?.trim() || null;

  if (!name || !email || !password || !role) return { error: "Todos los campos son requeridos" };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" };

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) return { error: "Ya existe un administrador con ese email" };

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.create({
    data: {
      name,
      email,
      passwordHash,
      role: role as never,
      permissions,
      whatsappNumber,
      createdById: payload.adminId,
    },
  });

  revalidatePath("/admin/equipo");
  return { success: true };
}

export async function updateAdminUser(id: string, formData: FormData) {
  const { error, payload } = await requireRoot();
  if (error || !payload) return { error: error ?? "No autorizado" };
  if (id === payload.adminId) return { error: "No puedes editar tu propia cuenta" };

  const name = (formData.get("name") as string)?.trim();
  const role = formData.get("role") as string;
  const permissions = formData.getAll("permissions") as string[];
  const whatsappNumber = (formData.get("whatsappNumber") as string)?.trim() || null;

  if (!name || !role) return { error: "Nombre y rol son requeridos" };

  await prisma.adminUser.update({
    where: { id },
    data: { name, role: role as never, permissions, whatsappNumber },
  });

  revalidatePath("/admin/equipo");
  return { success: true };
}

export async function toggleAdminUserActive(id: string, isActive: boolean) {
  const { error, payload } = await requireRoot();
  if (error || !payload) return { error: error ?? "No autorizado" };
  if (id === payload.adminId) return { error: "No puedes desactivarte a ti mismo" };

  await prisma.adminUser.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/equipo");
  return { success: true };
}

export async function resetAdminPassword(id: string, newPassword: string) {
  const { error, payload } = await requireRoot();
  if (error || !payload) return { error: error ?? "No autorizado" };
  if (id === payload.adminId) return { error: "Usa la configuración de tu perfil para cambiar tu contraseña" };
  if (newPassword.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" };

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.adminUser.update({ where: { id }, data: { passwordHash } });
  revalidatePath("/admin/equipo");
  return { success: true };
}

export async function deleteAdminUser(id: string) {
  const { error, payload } = await requireRoot();
  if (error || !payload) return { error: error ?? "No autorizado" };
  if (id === payload.adminId) return { error: "No puedes eliminarte a ti mismo" };

  const target = await prisma.adminUser.findUnique({ where: { id }, select: { role: true } });
  if (!target) return { error: "Administrador no encontrado" };

  if (target.role === "ROOT") {
    const rootCount = await prisma.adminUser.count({ where: { role: "ROOT", isActive: true } });
    if (rootCount <= 1) return { error: "No puedes eliminar el único ROOT activo" };
  }

  await prisma.adminUser.delete({ where: { id } });
  revalidatePath("/admin/equipo");
  return { success: true };
}

export async function updateSelfAdminProfile(data: {
  name?: string;
  email?: string;
  whatsappNumber?: string;
}) {
  const payload = await getAdminPayload();
  if (!payload) return { error: "No autorizado" };

  const updateData: Record<string, unknown> = {
    whatsappNumber: data.whatsappNumber?.trim() || null,
  };

  if (data.name !== undefined) {
    const name = data.name.trim();
    if (!name) return { error: "El nombre no puede estar vacío" };
    updateData.name = name;
  }

  if (data.email !== undefined) {
    const email = data.email.trim().toLowerCase();
    if (!email || !email.includes("@")) return { error: "Correo inválido" };
    const exists = await prisma.adminUser.findFirst({
      where: { email, NOT: { id: payload.adminId } },
    });
    if (exists) return { error: "Ese correo ya está en uso" };
    updateData.email = email;
  }

  await prisma.adminUser.update({
    where: { id: payload.adminId },
    data: updateData,
  });

  revalidatePath("/admin/perfil");
  return { success: true };
}

export async function deleteSelfAdminAccount(currentPassword: string) {
  const payload = await getAdminPayload();
  if (!payload) return { error: "No autorizado" };

  const totalAdmins = await prisma.adminUser.count();
  if (totalAdmins <= 1) return { error: "No puedes eliminar la única cuenta de administrador" };

  if (payload.role === "ROOT") {
    const rootCount = await prisma.adminUser.count({ where: { role: "ROOT", isActive: true } });
    if (rootCount <= 1) return { error: "No puedes eliminar la única cuenta Root activa" };
  }

  const admin = await prisma.adminUser.findUnique({
    where: { id: payload.adminId },
    select: { passwordHash: true },
  });
  if (!admin) return { error: "No autorizado" };

  const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!valid) return { error: "La contraseña es incorrecta" };

  await prisma.adminUser.delete({ where: { id: payload.adminId } });
  return { success: true };
}

export async function changeAdminPassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  const payload = await getAdminPayload();
  if (!payload) return { error: "No autorizado" };

  if (data.newPassword.length < 8) return { error: "La nueva contraseña debe tener al menos 8 caracteres" };

  const admin = await prisma.adminUser.findUnique({
    where: { id: payload.adminId },
    select: { passwordHash: true },
  });
  if (!admin) return { error: "No autorizado" };

  const valid = await bcrypt.compare(data.currentPassword, admin.passwordHash);
  if (!valid) return { error: "La contraseña actual es incorrecta" };

  const passwordHash = await bcrypt.hash(data.newPassword, 12);
  await prisma.adminUser.update({
    where: { id: payload.adminId },
    data: { passwordHash },
  });

  return { success: true };
}
