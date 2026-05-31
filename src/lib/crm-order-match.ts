import { prisma } from "@/lib/db";

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9 ? digits.slice(-9) : null;
}

export async function matchLeadToOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      orderNumber: true,
      createdAt: true,
      guestEmail: true,
      guestPhone: true,
      user: { select: { email: true, phone: true } },
    },
  });

  if (!order) return;

  const email = (order.user?.email ?? order.guestEmail)?.toLowerCase().trim() || null;
  const phone = normalizePhone(order.user?.phone ?? order.guestPhone);

  if (!email && !phone) return;

  const leads = await prisma.lead.findMany({
    where: { createdAt: { lte: order.createdAt } },
    select: { id: true, email: true, phone: true, whatsappNumber: true, stage: true },
  });

  const matched = leads.filter((lead) => {
    if (email && lead.email?.toLowerCase().trim() === email) return true;
    if (phone) {
      if (normalizePhone(lead.phone) === phone) return true;
      if (normalizePhone(lead.whatsappNumber) === phone) return true;
    }
    return false;
  });

  if (matched.length === 0) return;

  await Promise.all(
    matched.map(async (lead) => {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: "NOTE",
          content: `Compra confirmada — Pedido #${order.orderNumber}`,
        },
      });
      if (lead.stage !== "WON") {
        await prisma.leadActivity.create({
          data: {
            leadId: lead.id,
            type: "STAGE_CHANGE",
            content: `Cambio de etapa: ${lead.stage} → WON`,
          },
        });
        await prisma.lead.update({
          where: { id: lead.id },
          data: { stage: "WON" },
        });
      }
    }),
  );
}
