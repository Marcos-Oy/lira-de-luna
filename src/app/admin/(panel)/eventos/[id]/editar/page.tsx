import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import EventEditorClient from "../EventEditorClient";
import type { EventConfig } from "@/lib/crm";
import { DEFAULT_EVENT_CONFIG } from "@/lib/crm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

type LPRow = {
  id: string; title: string; slug: string;
  isActive: number | boolean; type: string; config: unknown;
};

export default async function EditarEventoPage({ params }: Props) {
  const { id } = await params;

  const rows = await prisma.$queryRaw<LPRow[]>`
    SELECT id, title, slug, isActive, type, config
    FROM LandingPage WHERE id = ${id} LIMIT 1
  `;
  const lp = rows[0];
  if (!lp || lp.type !== "EVENT") notFound();

  const settings = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });
  const parsedConfig = typeof lp.config === "string" ? JSON.parse(lp.config) : lp.config;
  const config: EventConfig = { ...DEFAULT_EVENT_CONFIG, ...(parsedConfig as EventConfig) };

  return (
    <EventEditorClient
      mode="edit"
      id={lp.id}
      initialTitle={lp.title}
      initialConfig={config}
      initialIsActive={!!lp.isActive}
      storeSettings={{
        mercadoPagoEnabled:    settings?.mercadoPagoEnabled    ?? false,
        flowPayEnabled:        settings?.flowPayEnabled        ?? false,
        transferEnabled:       settings?.transferEnabled       ?? false,
        transferBankName:      settings?.transferBankName      ?? null,
        transferAccountName:   settings?.transferAccountName   ?? null,
        transferAccountNumber: settings?.transferAccountNumber ?? null,
        transferAccountType:   settings?.transferAccountType   ?? null,
        transferRut:           settings?.transferRut           ?? null,
        transferInstructions:  settings?.transferInstructions  ?? null,
      }}
    />
  );
}
