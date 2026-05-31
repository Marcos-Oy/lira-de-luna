import { prisma } from "@/lib/db";
import CampanasClient from "./CampanasClient";

export default async function AdminCampanasPage() {
  const [subscribers, campaigns] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      orderBy: { subscribedAt: "desc" },
      include: { user: { select: { name: true } } },
    }),
    prisma.campaign.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return (
    <CampanasClient
      subscribers={subscribers.map((s) => ({
        id: s.id,
        email: s.email,
        name: s.name ?? s.user?.name ?? null,
        isActive: s.isActive,
        source: s.source,
        subscribedAt: s.subscribedAt.toISOString(),
      }))}
      campaigns={campaigns.map((c) => ({
        id: c.id,
        subject: c.subject,
        status: c.status,
        sentCount: c.sentCount,
        sentAt: c.sentAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
      }))}
    />
  );
}
