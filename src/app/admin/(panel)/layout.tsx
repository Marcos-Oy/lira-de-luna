import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminNotificationBootstrap from "@/components/admin/AdminNotificationBootstrap";
import PwaAdminInstallPrompt from "@/components/admin/PwaAdminInstallPrompt";
import { verifyAdminToken } from "@/controllers/admin-auth.controller";
import { getStoreSettings } from "@/app/actions/admin/settings";

export const metadata: Metadata = {
  manifest: "/manifest-admin.json",
};

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;

  if (!token) redirect("/admin/login");

  const payload = verifyAdminToken(token);
  if (!payload) redirect("/admin/login");

  const adminName = payload.name ?? payload.email;
  const adminEmail = payload.email;

  const settings = await getStoreSettings();

  return (
    <div className="flex h-screen overflow-hidden bg-[#F2EDE8]">
      <AdminNotificationBootstrap enabled={settings.notifyBrowserEnabled} />
      <AdminSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminHeader adminName={adminName} adminEmail={adminEmail} />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
      <PwaAdminInstallPrompt />
    </div>
  );
}
