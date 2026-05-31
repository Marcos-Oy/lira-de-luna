import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import AsistentesClient from "./AsistentesClient";
import type { Metadata } from "next";
import type { EventConfig } from "@/lib/crm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const rows = await prisma.$queryRaw<{ title: string }[]>`SELECT title FROM LandingPage WHERE id = ${id} LIMIT 1`;
  return { title: rows[0] ? `${rows[0].title} — Asistentes` : "Evento" };
}

type RegRow = {
  id: string; ticketCode: string; name: string; email: string;
  phone: string | null; whatsapp: string | null;
  ticketMode: string; paymentMethod: string | null;
  paymentStatus: string; amount: number;
  paymentNotes: string | null; attended: number | boolean;
  attendedAt: Date | null; createdAt: Date;
};

type LPRow = { id: string; title: string; slug: string; isActive: number | boolean; type: string; config: unknown };

export default async function EventoAsistentesPage({ params }: Props) {
  const { id } = await params;

  const [lpRows, registrations] = await Promise.all([
    prisma.$queryRaw<LPRow[]>`
      SELECT id, title, slug, isActive, type, config
      FROM LandingPage WHERE id = ${id} LIMIT 1
    `,
    prisma.$queryRaw<RegRow[]>`
      SELECT id, ticketCode, name, email, phone, whatsapp,
             ticketMode, paymentMethod, paymentStatus, amount,
             paymentNotes, attended, attendedAt, createdAt
      FROM EventRegistration
      WHERE landingPageId = ${id}
      ORDER BY createdAt DESC
    `,
  ]);

  const ev = lpRows[0];
  if (!ev || ev.type !== "EVENT") notFound();

  const config = (typeof ev.config === "string"
    ? JSON.parse(ev.config) : ev.config) as EventConfig;

  return (
    <AsistentesClient
      event={{
        id:       ev.id,
        title:    ev.title,
        slug:     ev.slug,
        isActive: !!ev.isActive,
        config,
      }}
      registrations={registrations.map((r) => ({
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
      }))}
    />
  );
}
