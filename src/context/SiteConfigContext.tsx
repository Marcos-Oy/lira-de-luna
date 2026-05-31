"use client";

import { createContext, useContext } from "react";

export type SiteConfig = {
  retailEnabled: boolean;
  wholesaleEnabled: boolean;
  logoUrl: string | null;
  storeName: string;
  pushEnabled: boolean;
  pushVapidPublicKey: string | null;
  announcementBar: string;
  whatsappButtonEnabled: boolean;
  whatsappContactNumber: string | null;
  featuresStrip: string;
  footerTagline: string;
  socialLinks: string;
};

const defaultConfig: SiteConfig = {
  retailEnabled: true,
  wholesaleEnabled: false,
  logoUrl: null,
  storeName: "Lira de Luna",
  pushEnabled: false,
  pushVapidPublicKey: null,
  announcementBar: "Envíos gratis en pedidos +$30.000 CLP",
  whatsappButtonEnabled: false,
  whatsappContactNumber: null,
  featuresStrip: JSON.stringify([{icon:"Moon",title:"Diseños exclusivos",subtitle:"Hechos con intención"},{icon:"Leaf",title:"Materiales de calidad",subtitle:"Plata .925 y baño de oro"},{icon:"Gift",title:"Empaque especial",subtitle:"Listo para regalar"},{icon:"ShieldCheck",title:"Compra segura",subtitle:"Pagos protegidos"}]),
  footerTagline: "Joyas que cuentan tu historia.\nHechas con intención, para acompañarte siempre.",
  socialLinks: '[{"platform":"instagram","url":"https://instagram.com"},{"platform":"tiktok","url":"https://tiktok.com"}]',
};

const SiteConfigContext = createContext<SiteConfig>(defaultConfig);

export function SiteConfigProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config: SiteConfig;
}) {
  return (
    <SiteConfigContext.Provider value={config}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}
