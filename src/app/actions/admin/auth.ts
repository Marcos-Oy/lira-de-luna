"use server";

import { prisma } from "@/lib/db";
import { adminLoginSchema } from "@/lib/validations/admin";
import { AdminUserModel } from "@/models/admin-user.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AdminJWTPayload } from "@/controllers/admin-auth.controller";

const JWT_SECRET = process.env.ADMIN_JWT_SECRET!;
const COOKIE_NAME = "admin_token";

export async function adminLoginAction(formData: FormData) {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = adminLoginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Credenciales inválidas" };
  }

  const admin = await AdminUserModel.findByEmail(parsed.data.email);
  if (!admin || !admin.isActive) return { error: "Credenciales inválidas" };

  const valid = await bcrypt.compare(parsed.data.password, admin.passwordHash);
  if (!valid) return { error: "Credenciales inválidas" };

  await AdminUserModel.updateLastLogin(admin.id);
  await AdminUserModel.createAuditLog({
    adminUserId: admin.id,
    action: "LOGIN",
    resource: "AdminUser",
    resourceId: admin.id,
  });

  const payload: AdminJWTPayload = {
    adminId: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    permissions: admin.permissions as string[],
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  redirect("/admin");
}

export async function adminLogoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/admin/login");
}
