import { prisma } from "@/lib/db";
import SeguridadClient from "./SeguridadClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Logs de Seguridad — Admin" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function SeguridadPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp       = await searchParams;
  const page     = Math.max(1, parseInt(sp.page     ?? "1") || 1);
  const event    = sp.event    ?? "";
  const severity = sp.severity ?? "";
  const ip       = sp.ip?.trim()    ?? "";
  const email    = sp.email?.trim() ?? "";
  const dateFrom = sp.dateFrom ?? "";
  const dateTo   = sp.dateTo   ?? "";

  const where: Record<string, unknown> = {};
  if (event)    where.event    = event;
  if (severity) where.severity = severity;
  if (ip)       where.ip       = { contains: ip };
  if (email)    where.email    = { contains: email };
  if (dateFrom || dateTo) {
    const dtFilter: Record<string, Date> = {};
    if (dateFrom) dtFilter.gte = new Date(dateFrom);
    if (dateTo)   { const d = new Date(dateTo); d.setHours(23,59,59,999); dtFilter.lte = d; }
    where.createdAt = dtFilter;
  }

  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [logs, total, kpis] = await Promise.all([
    prisma.securityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * PAGE_SIZE,
      take:    PAGE_SIZE,
    }),
    prisma.securityLog.count({ where }),
    // KPIs del día
    Promise.all([
      prisma.securityLog.count({ where: { createdAt: { gte: today } } }),
      prisma.securityLog.count({ where: { createdAt: { gte: today }, event: { contains: "FAILED" } } }),
      prisma.securityLog.count({ where: { createdAt: { gte: today }, event: { contains: "BLOCKED" } } }),
      prisma.securityLog.count({ where: { createdAt: { gte: today }, severity: "CRITICAL" } }),
    ]),
  ]);

  const [todayTotal, todayFailed, todayBlocked, todayCritical] = kpis;

  return (
    <SeguridadClient
      logs={logs.map((l) => ({
        ...l,
        details:   l.details   as Record<string, unknown> | null,
        createdAt: l.createdAt.toISOString(),
      }))}
      total={total}
      page={page}
      totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
      kpis={{ todayTotal, todayFailed, todayBlocked, todayCritical }}
      filters={{ event, severity, ip, email, dateFrom, dateTo }}
    />
  );
}
