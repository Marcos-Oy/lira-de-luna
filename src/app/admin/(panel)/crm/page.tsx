import { prisma } from "@/lib/db";
import CRMClient from "./CRMClient";

export const dynamic = "force-dynamic";

export default async function CRMPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp    = await searchParams;
  const q     = sp.q     ?? "";
  const stage = sp.stage ?? "";
  const view  = (sp.view === "kanban" ? "kanban" : "table") as "table" | "kanban";

  const leads = await prisma.lead.findMany({
    where: {
      ...(q     && { OR: [
        { name:  { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
      ]}),
      ...(stage && { stage }),
    },
    include: {
      landingPage: { select: { title: true } },
      assignedTo:  { select: { name: true } },
      _count:      { select: { activities: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const admins = await prisma.adminUser.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <CRMClient
      leads={leads.map((l) => ({
        id:             l.id,
        name:           l.name,
        email:          l.email,
        phone:          l.phone,
        whatsappNumber: l.whatsappNumber,
        source:         l.source,
        stage:          l.stage,
        tags:           Array.isArray(l.tags) ? (l.tags as string[]) : [],
        notes:          l.notes,
        assignedTo:     l.assignedTo?.name ?? null,
        assignedToId:   l.assignedToId,
        landingPage:    l.landingPage?.title ?? null,
        activityCount:  l._count.activities,
        lastContactedAt: l.lastContactedAt?.toISOString() ?? null,
        nextFollowUpAt:  l.nextFollowUpAt?.toISOString() ?? null,
        createdAt:      l.createdAt.toISOString(),
      }))}
      admins={admins}
      initialView={view}
      initialStage={stage}
      initialQ={q}
    />
  );
}
