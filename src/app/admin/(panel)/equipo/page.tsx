import { AdminUserModel } from "@/models/admin-user.model";
import { cookies } from "next/headers";
import { verifyAdminToken } from "@/controllers/admin-auth.controller";
import EquipoClient from "./EquipoClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Equipo — Admin" };

export default async function EquipoPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  const currentAdmin = token ? verifyAdminToken(token) : null;

  const adminUsers = await AdminUserModel.findAll();

  return (
    <EquipoClient
      adminUsers={adminUsers}
      currentAdminId={currentAdmin?.adminId ?? ""}
      currentAdminRole={currentAdmin?.role ?? ""}
    />
  );
}
