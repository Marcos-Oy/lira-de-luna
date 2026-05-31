import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import LeadDetailClient from "./LeadDetailClient";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      landingPage: { select: { title: true, slug: true } },
      assignedTo:  { select: { id: true, name: true } },
      activities: {
        include: { admin: { select: { name: true } } },
        orderBy:  { createdAt: "desc" },
      },
    },
  });

  if (!lead) notFound();

  const admins = await prisma.adminUser.findMany({
    where:   { isActive: true },
    select:  { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <LeadDetailClient
      lead={{
        id:             lead.id,
        name:           lead.name,
        email:          lead.email,
        phone:          lead.phone,
        whatsappNumber: lead.whatsappNumber,
        source:         lead.source,
        stage:          lead.stage,
        tags:           Array.isArray(lead.tags) ? (lead.tags as string[]) : [],
        notes:          lead.notes,
        assignedToId:   lead.assignedToId,
        landingPage:    lead.landingPage ? { title: lead.landingPage.title, slug: lead.landingPage.slug } : null,
        lastContactedAt: lead.lastContactedAt?.toISOString() ?? null,
        nextFollowUpAt:  lead.nextFollowUpAt?.toISOString() ?? null,
        createdAt:      lead.createdAt.toISOString(),
        activities: lead.activities.map((a) => ({
          id:        a.id,
          type:      a.type,
          content:   a.content,
          adminName: a.admin?.name ?? "Sistema",
          createdAt: a.createdAt.toISOString(),
        })),
      }}
      admins={admins}
    />
  );
}
