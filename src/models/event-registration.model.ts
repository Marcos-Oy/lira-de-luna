import { prisma } from "@/lib/db";

export type EventRegRow = {
  id:            string;
  name:          string;
  email:         string;
  amount:        number;
  landingPageId: string;
  paymentStatus: string;
  lpTitle:       string;
  lpSlug:        string;
};

export const EventRegistrationModel = {
  /** Busca un registro por ticketCode JOIN con la landing page (título y slug). */
  findByTicketCode: async (ticketCode: string): Promise<EventRegRow | null> => {
    const rows = await prisma.$queryRaw<EventRegRow[]>`
      SELECT
        er.id, er.name, er.email, er.amount, er.landingPageId, er.paymentStatus,
        lp.title AS lpTitle, lp.slug AS lpSlug
      FROM EventRegistration er
      JOIN LandingPage lp ON lp.id = er.landingPageId
      WHERE er.ticketCode = ${ticketCode}
      LIMIT 1
    `;
    if (!rows[0]) return null;
    return { ...rows[0], amount: Number(rows[0].amount) };
  },

  /** Marca el registro como pagado. */
  markPaid: (id: string) =>
    prisma.$executeRaw`
      UPDATE EventRegistration
      SET paymentStatus = 'PAID', updatedAt = NOW()
      WHERE id = ${id}
    `,
};
