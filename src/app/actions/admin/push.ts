"use server";

import { prisma } from "@/lib/db";
import { broadcastPush } from "@/lib/web-push";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { AdminJWTPayload } from "@/controllers/admin-auth.controller";
import webpush from "web-push";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

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

export async function getPushSettings() {
  await requireAdmin();
  return prisma.storeSettings.findUnique({ where: { id: "singleton" } });
}

export async function generateVapidKeys() {
  await requireAdmin();
  const keys = webpush.generateVAPIDKeys();
  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: { pushVapidPublicKey: keys.publicKey, pushVapidPrivateKey: keys.privateKey },
    create: { id: "singleton", pushVapidPublicKey: keys.publicKey, pushVapidPrivateKey: keys.privateKey },
  });
  revalidatePath("/admin/notificaciones");
  return { publicKey: keys.publicKey };
}

export async function savePushSettings(data: {
  pushEnabled: boolean;
  pushNotifNewProduct: boolean;
  pushNotifLowStock: boolean;
  pushNotifOffers: boolean;
  pushNotifPromo: boolean;
  pushFrequencyPerWeek: number;
  pushHourStart: number;
  pushHourEnd: number;
}) {
  await requireAdmin();
  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
  revalidatePath("/admin/notificaciones");
  return { success: true };
}

export async function sendPushNotification(payload: {
  type: string;
  title: string;
  body: string;
  url?: string;
  image?: string;
}) {
  await requireAdmin();

  const settings = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });
  if (!settings?.pushEnabled) return { error: "Las notificaciones push no están activadas" };
  if (!settings.pushVapidPublicKey || !settings.pushVapidPrivateKey) {
    return { error: "Genera las claves VAPID antes de enviar" };
  }

  const result = await broadcastPush({ ...payload, tag: payload.type });

  await prisma.storeSettings.update({
    where: { id: "singleton" },
    data: { pushLastSentAt: new Date() },
  });

  revalidatePath("/admin/notificaciones");
  return { success: true, sent: result.sent, expired: result.expired };
}

export async function getPushHistory() {
  await requireAdmin();
  return prisma.pushNotificationLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
}

export async function getSubscriberCount() {
  await requireAdmin();
  return prisma.pushSubscription.count();
}

export async function uploadPwaIcon(formData: FormData, type: "customer" | "admin") {
  await requireAdmin();

  const file = formData.get("icon") as File | null;
  if (!file || file.size === 0) return { error: "No se seleccionó ningún archivo" };
  if (file.size > 2 * 1024 * 1024) return { error: "El icono no puede superar 2 MB" };

  const ext  = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const name = `pwa-${type}-${Date.now()}.${ext}`;
  const dir  = join(process.cwd(), "public", "uploads");

  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), Buffer.from(await file.arrayBuffer()));

  const url = `/uploads/${name}`;

  if (type === "customer") {
    await prisma.storeSettings.upsert({
      where: { id: "singleton" },
      update: { pwaCustomerIconUrl: url },
      create: { id: "singleton", pwaCustomerIconUrl: url },
    });
  } else {
    await prisma.storeSettings.upsert({
      where: { id: "singleton" },
      update: { pwaAdminIconUrl: url },
      create: { id: "singleton", pwaAdminIconUrl: url },
    });
  }

  revalidatePath("/admin/notificaciones");
  return { success: true, url };
}
