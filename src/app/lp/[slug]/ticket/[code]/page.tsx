import { notFound } from "next/navigation";
import { getTicketByCode } from "@/app/actions/public/registerEvent";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import TicketView from "./TicketView";

type Props = { params: Promise<{ slug: string; code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const ticket = await getTicketByCode(code);
  return { title: ticket ? `Entrada — ${ticket.event.title}` : "Entrada" };
}

export default async function TicketPage({ params }: Props) {
  const { code } = await params;
  const [ticket, settings] = await Promise.all([
    getTicketByCode(code),
    prisma.storeSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  if (!ticket) notFound();

  const transferInfo = settings ? {
    bankName:      settings.transferBankName      ?? null,
    accountName:   settings.transferAccountName   ?? null,
    accountNumber: settings.transferAccountNumber ?? null,
    accountType:   settings.transferAccountType   ?? null,
    rut:           settings.transferRut           ?? null,
    instructions:  settings.transferInstructions  ?? null,
  } : null;

  return <TicketView ticket={{ ...ticket, transferInfo }} />;
}
