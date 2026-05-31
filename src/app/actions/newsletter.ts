"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";

const subscribeSchema = z.object({
  email:  z.string().email("Email inválido").max(320, "Email demasiado largo"),
  name:   z.string().max(100).optional(),
  source: z.string().max(50).optional(),
});

export async function subscribeNewsletter(data: { email: string; name?: string; source?: string }) {
  const parsed = subscribeSchema.safeParse(data);
  if (!parsed.success) return { error: "Email inválido" };

  const email = parsed.data.email.toLowerCase().trim();
  const name  = parsed.data.name?.trim().slice(0, 100) || null;

  await prisma.newsletterSubscriber.upsert({
    where:  { email },
    update: { isActive: true, ...(name && { name }) },
    create: { email, name, source: parsed.data.source ?? "store" },
  });

  return { success: true };
}

export async function unsubscribeByToken(subscriberId: string) {
  if (!subscriberId || typeof subscriberId !== "string" || subscriberId.length > 50)
    return { error: "Token inválido" };

  await prisma.newsletterSubscriber.update({
    where: { id: subscriberId },
    data:  { isActive: false },
  });
  return { success: true };
}
