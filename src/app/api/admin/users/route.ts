import { AdminController } from "@/controllers/admin.controller";
import { verifyAdminToken } from "@/controllers/admin-auth.controller";
import { NextRequest, NextResponse } from "next/server";

function getAdminFromRequest(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  return AdminController.getUsers(admin);
}

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await req.json();
  return AdminController.createUser(body, admin);
}
