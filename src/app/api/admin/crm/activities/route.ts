import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { AdminJWTPayload } from "@/controllers/admin-auth.controller";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    jwt.verify(token, process.env.ADMIN_JWT_SECRET!) as AdminJWTPayload;

    const leadId = req.nextUrl.searchParams.get("leadId");
    if (!leadId) return NextResponse.json({ error: "leadId requerido" }, { status: 400 });

    const activities = await prisma.leadActivity.findMany({
      where: { leadId },
      include: { admin: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      activities: activities.map((a) => ({
        id: a.id,
        type: a.type,
        content: a.content,
        adminName: a.admin?.name ?? "Sistema",
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
