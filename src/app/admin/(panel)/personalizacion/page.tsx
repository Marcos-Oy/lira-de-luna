import { prisma } from "@/lib/db";
import AdminPersonalizacionClient from "./AdminPersonalizacionClient";
import type { Metadata } from "next";
import { getPersonalizationData } from "@/app/actions/admin/personalization";
import { getStoreSettings } from "@/app/actions/admin/settings";
import type { StoreLocation } from "@/types/personalization";

export const metadata: Metadata = { title: "Personalización — Admin" };

export default async function AdminPersonalizacionPage() {
  const [personalization, banners, storeSettings] = await Promise.all([
    getPersonalizationData(),
    prisma.banner.findMany({ orderBy: { sortOrder: "asc" } }),
    getStoreSettings(),
  ]);

  const locations = (storeSettings.locations ?? []) as unknown as StoreLocation[];

  return (
    <AdminPersonalizacionClient
      settings={personalization}
      banners={banners}
      storeName={storeSettings.storeName}
      whatsappButtonEnabled={storeSettings.whatsappButtonEnabled}
      whatsappContactNumber={storeSettings.whatsappContactNumber}
      locations={locations}
      supportEmail={storeSettings.supportEmail ?? ""}
      supportPhone={storeSettings.supportPhone ?? ""}
    />
  );
}
