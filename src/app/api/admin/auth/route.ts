import { AdminAuthController } from "@/controllers/admin-auth.controller";
import { NextRequest } from "next/server";

// POST /api/admin/auth — login
export async function POST(req: NextRequest) {
  const body = await req.json();
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined;
  return AdminAuthController.login(body, ip ?? undefined);
}

// GET /api/admin/auth — get current admin
export async function GET() {
  return AdminAuthController.me();
}

// DELETE /api/admin/auth — logout
export async function DELETE() {
  return AdminAuthController.logout();
}
