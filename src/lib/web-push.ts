import webpush from "web-push";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export function hashEndpoint(endpoint: string): string {
  return crypto.createHash("sha256").update(endpoint).digest("hex");
}

export async function getVapidConfig() {
  const s = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });
  if (!s?.pushVapidPublicKey || !s.pushVapidPrivateKey) return null;
  return { publicKey: s.pushVapidPublicKey, privateKey: s.pushVapidPrivateKey };
}

export async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: {
    title: string;
    body: string;
    url?: string;
    image?: string;
    tag?: string;
  }
) {
  const keys = await getVapidConfig();
  if (!keys) throw new Error("VAPID keys not configured");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  webpush.setVapidDetails(`mailto:admin@${new URL(siteUrl).hostname}`, keys.publicKey, keys.privateKey);

  return webpush.sendNotification(
    { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
    JSON.stringify(payload),
    { TTL: 86400 }
  );
}

export async function broadcastPush(payload: {
  title: string;
  body: string;
  url?: string;
  image?: string;
  tag?: string;
  type: string;
}) {
  const subscriptions = await prisma.pushSubscription.findMany();
  let sent = 0;
  const expired: string[] = [];

  for (const sub of subscriptions) {
    try {
      await sendPush({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, payload);
      sent++;
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 410 || status === 404) {
        expired.push(sub.id);
      }
    }
  }

  // Remove expired subscriptions
  if (expired.length) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: expired } } });
  }

  // Log
  await prisma.pushNotificationLog.create({
    data: {
      type:      payload.type,
      title:     payload.title,
      body:      payload.body,
      url:       payload.url ?? null,
      sentCount: sent,
    },
  });

  return { sent, expired: expired.length };
}
