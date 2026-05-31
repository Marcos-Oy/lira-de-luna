"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

// ─── Profile ────────────────────────────────────────────────

export async function updateProfile(data: { name: string; phone?: string; whatsappNumber?: string; country?: string }) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };

  const name = data.name.trim();
  if (!name) return { error: "El nombre es obligatorio" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      phone:         data.phone?.trim()         || null,
      whatsappNumber: data.whatsappNumber?.trim() || null,
      country:       data.country?.trim()        || "CL",
    },
  });

  revalidatePath("/cuenta/perfil");
  revalidatePath("/cuenta");
  return { success: true };
}

export async function changePassword(data: { currentPassword: string; newPassword: string }) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };

  if (data.newPassword.length < 8) return { error: "La nueva contraseña debe tener al menos 8 caracteres" };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) return { error: "Usuario no encontrado" };

  if (!user.passwordHash) {
    return { error: "Tu cuenta usa inicio de sesión social y no tiene contraseña directa" };
  }

  const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!valid) return { error: "La contraseña actual es incorrecta" };

  const passwordHash = await bcrypt.hash(data.newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  return { success: true };
}

export async function deleteAccount(password: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) return { error: "Usuario no encontrado" };

  if (user.passwordHash) {
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return { error: "La contraseña es incorrecta" };
  }

  await prisma.user.delete({ where: { id: session.user.id } });
  return { success: true };
}

// ─── Wishlist ────────────────────────────────────────────────

export async function toggleWishlist(productId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId: session.user.id, productId } },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    revalidatePath("/cuenta/favoritos");
    return { action: "removed" };
  }

  await prisma.wishlistItem.create({
    data: { userId: session.user.id, productId },
  });
  revalidatePath("/cuenta/favoritos");
  return { action: "added" };
}

// ─── Addresses ───────────────────────────────────────────────

export async function createAddress(data: {
  name: string;
  phone?: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  isDefault?: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };

  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId: session.user.id },
      data: { isDefault: false },
    });
  }

  await prisma.address.create({
    data: {
      userId:    session.user.id,
      name:      data.name,
      phone:     data.phone || null,
      street:    data.street,
      city:      data.city,
      state:     data.state,
      zip:       data.zip,
      country:   data.country || "CL",
      isDefault: data.isDefault ?? false,
    },
  });

  revalidatePath("/cuenta/direcciones");
  return { success: true };
}

export async function updateAddress(
  id: string,
  data: {
    name: string;
    phone?: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
    isDefault?: boolean;
  }
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };

  const address = await prisma.address.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!address) return { error: "Dirección no encontrada" };

  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId: session.user.id },
      data: { isDefault: false },
    });
  }

  await prisma.address.update({
    where: { id },
    data: {
      name:      data.name,
      phone:     data.phone || null,
      street:    data.street,
      city:      data.city,
      state:     data.state,
      zip:       data.zip,
      country:   data.country || "CL",
      isDefault: data.isDefault ?? false,
    },
  });

  revalidatePath("/cuenta/direcciones");
  return { success: true };
}

export async function deleteAddress(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };

  const address = await prisma.address.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!address) return { error: "Dirección no encontrada" };

  await prisma.address.delete({ where: { id } });

  revalidatePath("/cuenta/direcciones");
  return { success: true };
}

export async function setDefaultAddress(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };

  await prisma.address.updateMany({
    where: { userId: session.user.id },
    data: { isDefault: false },
  });

  await prisma.address.update({
    where: { id },
    data: { isDefault: true },
  });

  revalidatePath("/cuenta/direcciones");
  return { success: true };
}
