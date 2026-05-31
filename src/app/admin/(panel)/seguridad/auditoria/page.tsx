import { prisma } from "@/lib/db";
import AuditoriaClient from "./AuditoriaClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Auditoría Admin — Admin" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp       = await searchParams;
  const page     = Math.max(1, parseInt(sp.page ?? "1") || 1);
  const action   = sp.action?.trim()   ?? "";
  const resource = sp.resource?.trim() ?? "";
  const adminId  = sp.adminId          ?? "";
  const dateFrom = sp.dateFrom         ?? "";
  const dateTo   = sp.dateTo           ?? "";

  const where: Record<string, unknown> = {};
  if (action)   where.action   = { contains: action };
  if (resource) where.resource = { contains: resource };
  if (adminId)  where.adminUserId = adminId;
  if (dateFrom || dateTo) {
    const dtFilter: Record<string, Date> = {};
    if (dateFrom) dtFilter.gte = new Date(dateFrom);
    if (dateTo)   { const d = new Date(dateTo); d.setHours(23,59,59,999); dtFilter.lte = d; }
    where.createdAt = dtFilter;
  }

  const today = new Date();
  today.setHours(0,0,0,0);

  const [logs, total, todayCount, admins] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * PAGE_SIZE,
      take:    PAGE_SIZE,
      include: { adminUser: { select: { name: true, email: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.count({ where: { createdAt: { gte: today } } }),
    prisma.adminUser.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <AuditoriaClient
      logs={logs.map((l) => ({
        ...l,
        details:   l.details   as Record<string, unknown> | null,
        createdAt: l.createdAt.toISOString(),
        adminUser: l.adminUser,
      }))}
      total={total}
      page={page}
      totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
      todayCount={todayCount}
      admins={admins}
      filters={{ action, resource, adminId, dateFrom, dateTo }}
    />
  );
}
