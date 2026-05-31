"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validations/user";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function loginWithCredentials(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  try {
    await signIn("credentials", {
      email:      formData.get("email"),
      password:   formData.get("password"),
      redirectTo: "/cuenta",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Correo o contraseña incorrectos.";
    }
    throw error; // NEXT_REDIRECT (éxito) — Next.js lo intercepta y navega
  }
  return null;
}

export async function logoutAction(_formData?: FormData) {
  await signOut({ redirectTo: "/" });
}

export async function registerAction(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  subscribeNewsletter?: boolean;
}) {
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Datos inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "Este correo ya tiene una cuenta", fieldErrors: { email: ["Este correo ya tiene una cuenta"] } };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const user = await prisma.user.create({
    data: {
      name:         parsed.data.name,
      email:        parsed.data.email,
      passwordHash,
      phone:        data.phone?.trim() || null,
    },
  });

  if (data.subscribeNewsletter !== false) {
    await prisma.newsletterSubscriber.upsert({
      where:  { email: parsed.data.email },
      update: { isActive: true, userId: user.id, name: parsed.data.name },
      create: { email: parsed.data.email, name: parsed.data.name, userId: user.id, source: "registration" },
    });
  }

  await signIn("credentials", {
    email:      parsed.data.email,
    password:   parsed.data.password,
    redirectTo: "/cuenta",
  });
}

// ── Recuperación de contraseña ────────────────────────────────

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) return { success: true };

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const resetUrl = `${siteUrl}/cuenta/recuperar/${token}`;

  const { sendMail, passwordResetHtml } = await import("@/lib/email");
  const settings = await import("@/lib/db").then(m =>
    m.prisma.storeSettings.findUnique({ where: { id: "singleton" } })
  );
  const storeName = settings?.storeName ?? "Lira de Luna";

  await sendMail({
    to:      user.email,
    subject: `Restablecer contraseña — ${storeName}`,
    html:    passwordResetHtml({ storeName, resetUrl, userName: user.name ?? "Cliente" }),
    text:    `Restablece tu contraseña aquí: ${resetUrl}`,
  });

  const waLink = user.phone
    ? `https://wa.me/${user.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola, solicité recuperar mi contraseña. Enlace: ${resetUrl}`)}`
    : null;

  return { success: true, hasPhone: !!user.phone, waLink };
}

export async function resetPassword(token: string, newPassword: string) {
  if (newPassword.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" };

  const record = await prisma.passwordResetToken.findUnique({
    where:   { token },
    include: { user: true },
  });

  if (!record)       return { error: "Enlace inválido o ya utilizado" };
  if (record.usedAt) return { error: "Este enlace ya fue utilizado" };
  if (record.expiresAt < new Date()) return { error: "El enlace expiró. Solicita uno nuevo." };

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return { success: true };
}
