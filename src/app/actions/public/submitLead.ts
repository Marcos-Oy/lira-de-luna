"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";

const leadSchema = z.object({
  landingPageId:  z.string().cuid("ID inválido"),
  name:           z.string().min(1, "El nombre es requerido").max(150, "Nombre demasiado largo"),
  email:          z.string().email("Email inválido").max(320).optional().or(z.literal("")),
  phone:          z.string().max(30, "Teléfono demasiado largo").optional(),
  whatsappNumber: z.string().max(30, "WhatsApp demasiado largo").optional(),
});

export async function submitLandingPageLead(data: {
  landingPageId:  string;
  name:           string;
  email?:         string;
  phone?:         string;
  whatsappNumber?: string;
}) {
  const parsed = leadSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Datos inválidos";
    return { error: firstError };
  }

  const { landingPageId, name, email, phone, whatsappNumber } = parsed.data;

  const lp = await prisma.landingPage.findUnique({
    where:  { id: landingPageId, isActive: true },
    select: { id: true, config: true },
  });
  if (!lp) return { error: "Landing page no encontrada" };

  const config = lp.config as { autoTags?: string[] };
  const tags: string[] = Array.isArray(config.autoTags) ? config.autoTags.slice(0, 20) : [];

  await prisma.lead.create({
    data: {
      name:           name.trim(),
      email:          email?.trim()          || null,
      phone:          phone?.trim()           || null,
      whatsappNumber: whatsappNumber?.trim()  || null,
      source:         "LANDING_PAGE",
      landingPageId,
      stage:          "NEW",
      tags,
    },
  });

  return { success: true };
}
