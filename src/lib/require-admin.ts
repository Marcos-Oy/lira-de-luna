"use server";

import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db";
import type { AdminJWTPayload } from "@/controllers/admin-auth.controller";

/**
 * Verifica el JWT del admin Y que la cuenta siga activa en DB.
 * Usa esto en server actions que realizan escrituras sensibles.
 * Lanza Error("No autorizado") si el token es inválido o la cuenta está desactivada.
 */
export async function requireActiveAdmin(): Promise<AdminJWTPayload> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) throw new Error("No autorizado");

  let payload: AdminJWTPayload;
  try {
    payload = jwt.verify(token, process.env.ADMIN_JWT_SECRET!) as AdminJWTPayload;
  } catch {
    throw new Error("No autorizado");
  }

  const admin = await prisma.adminUser.findUnique({
    where: { id: payload.adminId },
    select: { isActive: true },
  });
  if (!admin?.isActive) throw new Error("No autorizado");

  return payload;
}
