import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });
  const name = s?.storeName ?? "Lira de Luna";
  const icon = s?.pwaCustomerIconUrl ?? "/icons/customer.svg";

  return {
    name,
    short_name: name,
    description: "Joyería minimalista — Diseños que cuentan tu historia",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F4F1",
    theme_color: "#CDA78F",
    orientation: "portrait-primary",
    icons: [
      { src: icon,                      sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/customer-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/customer-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
