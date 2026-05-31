import { AdminController } from "@/controllers/admin.controller";
import { verifyAdminToken } from "@/controllers/admin-auth.controller";
import { NextRequest, NextResponse } from "next/server";

function getAdminFromRequest(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  return AdminController.updateUser(id, body, admin);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  return AdminController.deleteUser(id, admin);
}
