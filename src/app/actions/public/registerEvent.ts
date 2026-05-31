"use server";

import { prisma } from "@/lib/db";
import type { EventConfig } from "@/lib/crm";

function generateTicketCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `r${ts}${rand}`.slice(0, 25);
}

export type RegisterEventInput = {
  landingPageId:  string;
  name:           string;
  email:          string;
  phone?:         string;
  whatsapp?:      string;
  paymentMethod?: string;
  selectedDays?:  string[];   // YYYY-MM-DD dates for PAID_BY_DAY mode
};

export async function registerForEvent(input: RegisterEventInput) {
  // Fetch LP without type filter (check type in JS)
  const lp = await prisma.landingPage.findUnique({
    where: { id: input.landingPageId, isActive: true },
  });
  if (!lp || (lp as { type?: string }).type !== "EVENT") {
    return { error: "Evento no encontrado o no disponible" };
  }

  const config = lp.config as EventConfig;

  // Capacity check
  if (config.eventCapacity > 0) {
    const countRows = await prisma.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(*) AS c FROM EventRegistration
      WHERE landingPageId = ${input.landingPageId}
      AND paymentStatus IN ('CONFIRMED', 'PAID')
    `;
    const confirmed = Number(countRows[0]?.c ?? 0);
    if (confirmed >= config.eventCapacity) {
      return { error: "Lo sentimos, el evento está completo" };
    }
  }

  // Ensure unique ticket code
  let ticketCode = generateTicketCode();
  while (true) {
    const dup = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM EventRegistration WHERE ticketCode = ${ticketCode} LIMIT 1
    `;
    if (dup.length === 0) break;
    ticketCode = generateTicketCode();
  }

  const isFree      = config.ticketMode === "FREE";
  const isPaidByDay = config.ticketMode === "PAID_BY_DAY";

  // Calculate amount and notes for PAID_BY_DAY
  let amount       = isFree ? 0 : config.ticketPrice;
  let paymentNotes: string | null = null;

  if (isPaidByDay && input.selectedDays && input.selectedDays.length > 0) {
    const selected = config.dayTickets.filter((d) => input.selectedDays!.includes(d.date));
    amount       = selected.reduce((sum, d) => sum + d.price, 0);
    paymentNotes = `Días: ${selected.map((d) => d.label || d.date).join(", ")}`;
  }

  const paymentStatus = (isFree || (isPaidByDay && amount === 0))
    ? "CONFIRMED"
    : input.paymentMethod === "transfer"
    ? "PENDING_TRANSFER"
    : "PENDING_GATEWAY";  // Flow / MercadoPago → awaiting gateway webhook

  const id            = generateId();
  const name          = input.name.trim();
  const email         = input.email.trim().toLowerCase();
  const phone         = input.phone?.trim() ?? null;
  const whatsapp      = input.whatsapp?.trim() ?? null;
  const ticketMode    = isFree ? "FREE" : isPaidByDay ? "PAID_BY_DAY" : "PAID";
  const paymentMethod = input.paymentMethod ?? null;

  await prisma.$executeRaw`
    INSERT INTO EventRegistration
      (id, landingPageId, ticketCode, name, email, phone, whatsapp,
       ticketMode, paymentMethod, paymentStatus, amount,
       paymentNotes, attended, createdAt, updatedAt)
    VALUES
      (${id}, ${input.landingPageId}, ${ticketCode}, ${name}, ${email},
       ${phone}, ${whatsapp}, ${ticketMode}, ${paymentMethod},
       ${paymentStatus}, ${amount}, ${paymentNotes}, 0, NOW(), NOW())
  `;

  return {
    success:       true,
    ticketCode,
    paymentStatus,
    slug:          lp.slug,
  };
}

type TicketRow = {
  id: string; ticketCode: string; name: string; email: string;
  phone: string | null; ticketMode: string; paymentStatus: string;
  paymentMethod: string | null; amount: number; paymentNotes: string | null;
  attended: number | boolean; createdAt: Date;
  lpId: string; lpSlug: string; lpTitle: string; lpConfig: unknown;
};

export async function getTicketByCode(code: string) {
  const rows = await prisma.$queryRaw<TicketRow[]>`
    SELECT
      er.id, er.ticketCode, er.name, er.email, er.phone,
      er.ticketMode, er.paymentStatus, er.paymentMethod,
      er.amount, er.paymentNotes, er.attended, er.createdAt,
      lp.id AS lpId, lp.slug AS lpSlug, lp.title AS lpTitle, lp.config AS lpConfig
    FROM EventRegistration er
    JOIN LandingPage lp ON lp.id = er.landingPageId
    WHERE er.ticketCode = ${code}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const r = rows[0];

  return {
    id:            r.id,
    ticketCode:    r.ticketCode,
    name:          r.name,
    email:         r.email,
    phone:         r.phone,
    ticketMode:    r.ticketMode,
    paymentStatus: r.paymentStatus,
    paymentMethod: r.paymentMethod,
    amount:        Number(r.amount),
    paymentNotes:  r.paymentNotes,
    attended:      !!r.attended,
    createdAt:     new Date(r.createdAt).toISOString(),
    event: {
      id:     r.lpId,
      slug:   r.lpSlug,
      title:  r.lpTitle,
      config: (typeof r.lpConfig === "string"
        ? JSON.parse(r.lpConfig)
        : r.lpConfig) as EventConfig,
    },
  };
}
