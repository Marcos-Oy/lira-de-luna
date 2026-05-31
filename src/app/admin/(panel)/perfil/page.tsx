import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyAdminToken } from "@/controllers/admin-auth.controller";
import { redirect } from "next/navigation";
import AdminPerfilClient from "./AdminPerfilClient";

export default async function AdminPerfilPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  const payload = token ? verifyAdminToken(token) : null;
  if (!payload) redirect("/admin/login");

  const admin = await prisma.adminUser.findUnique({
    where: { id: payload.adminId },
    select: { name: true, email: true, role: true, whatsappNumber: true },
  });

  if (!admin) redirect("/admin/login");

  return (
    <AdminPerfilClient
      adminName={admin.name}
      adminEmail={admin.email}
      adminRole={admin.role}
      whatsappNumber={admin.whatsappNumber}
    />
  );
}
