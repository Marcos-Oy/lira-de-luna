import { prisma } from "@/lib/db";
import EventosAdminClient from "./EventosAdminClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Eventos — Admin" };

type EventMeta = { id: string; title: string; slug: string };

type RegRow = {
  id: string; ticketCode: string; name: string; email: string;
  phone: string | null; whatsapp: string | null;
  ticketMode: string; paymentMethod: string | null;
  paymentStatus: string; amount: number;
  paymentNotes: string | null;
  attended: number | boolean; attendedAt: Date | null; createdAt: Date;
  eventId: string; eventTitle: string; eventSlug: string;
};

export default async function EventosPage() {
  const [events, regRows] = await Promise.all([
    prisma.$queryRaw<EventMeta[]>`
      SELECT id, title, slug FROM LandingPage WHERE type = 'EVENT' ORDER BY createdAt DESC
    `,
    prisma.$queryRaw<RegRow[]>`
      SELECT
        er.id, er.ticketCode, er.name, er.email, er.phone, er.whatsapp,
        er.ticketMode, er.paymentMethod, er.paymentStatus, er.amount,
        er.paymentNotes, er.attended, er.attendedAt, er.createdAt,
        lp.id   AS eventId,
        lp.title AS eventTitle,
        lp.slug  AS eventSlug
      FROM EventRegistration er
      JOIN LandingPage lp ON lp.id = er.landingPageId
      ORDER BY er.createdAt DESC
    `,
  ]);

  return (
    <EventosAdminClient
      events={events}
      registrations={regRows.map((r) => ({
        id:            r.id,
        ticketCode:    r.ticketCode,
        name:          r.name,
        email:         r.email,
        phone:         r.phone,
        whatsapp:      r.whatsapp,
        ticketMode:    r.ticketMode,
        paymentMethod: r.paymentMethod,
        paymentStatus: r.paymentStatus,
        amount:        Number(r.amount),
        paymentNotes:  r.paymentNotes,
        attended:      !!r.attended,
        attendedAt:    r.attendedAt ? new Date(r.attendedAt).toISOString() : null,
        createdAt:     new Date(r.createdAt).toISOString(),
        eventId:       r.eventId,
        eventTitle:    r.eventTitle,
        eventSlug:     r.eventSlug,
      }))}
    />
  );
}
