import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import type { SiteConfig } from "@/context/SiteConfigContext";
import type { SessionUser } from "@/context/UserContext";
import ServiceWorkerRegistration from "@/components/store/ServiceWorkerRegistration";
import PushPermissionPrompt from "@/components/store/PushPermissionPrompt";
import PwaInstallPrompt from "@/components/store/PwaInstallPrompt";
import WhatsAppFloatingButton from "@/components/store/WhatsAppFloatingButton";
import type { BrandColors, PageTexts } from "@/types/personalization";
import { DEFAULT_COLORS, DEFAULT_ANNOUNCEMENT, DEFAULT_FEATURES_STRIP, DEFAULT_FOOTER_TAGLINE } from "@/types/personalization";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Lira de Luna — Joyas que cuentan tu historia",
  description:
    "Diseños minimalistas en plata y baño de oro, hechos para acompañarte siempre. Belleza que conecta.",
};

function buildColorStyle(colors: BrandColors): string {
  return `:root,.dark{--brand-sand:${colors.sand};--brand-taupe:${colors.taupe};--brand-dark:${colors.dark};--brand-cream:${colors.cream};--brand-beige:${colors.beige};--brand-beige-light:${colors.beigeLight};}`;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, settings] = await Promise.all([
    auth(),
    prisma.storeSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    }),
  ]);

  const user: SessionUser = session?.user?.id
    ? { id: session.user.id, name: session.user.name ?? null, email: session.user.email! }
    : null;

  const dbColors = settings.brandColors as BrandColors | null;
  const dbTexts  = settings.pageTexts  as PageTexts   | null;

  const siteConfig: SiteConfig = {
    retailEnabled:      settings.retailEnabled,
    wholesaleEnabled:   settings.wholesaleEnabled,
    logoUrl:            settings.logoUrl,
    storeName:          settings.storeName,
    pushEnabled:        settings.pushEnabled,
    pushVapidPublicKey: settings.pushVapidPublicKey,
    announcementBar:       dbTexts?.announcementBar ?? DEFAULT_ANNOUNCEMENT,
    whatsappButtonEnabled:  settings.whatsappButtonEnabled,
    whatsappContactNumber:  settings.whatsappContactNumber,
    featuresStrip:      dbTexts?.featuresStrip   ?? DEFAULT_FEATURES_STRIP,
    footerTagline:      dbTexts?.footerTagline    ?? DEFAULT_FOOTER_TAGLINE,
    socialLinks:        dbTexts?.socialLinks ?? '[{"platform":"instagram","url":"https://instagram.com"},{"platform":"tiktok","url":"https://tiktok.com"}]',
  };

  const hasCustomColors = dbColors !== null;
  const colors: BrandColors = dbColors ?? DEFAULT_COLORS;

  return (
    <html
      lang="es"
      className={`${cormorant.variable} ${montserrat.variable} h-full antialiased`}
    >
      <head>
        <meta name="theme-color" content={colors.sand} />
        <link rel="apple-touch-icon" href={settings.pwaCustomerIconUrl ?? "/icons/customer.svg"} />
        {hasCustomColors && (
          <style dangerouslySetInnerHTML={{ __html: buildColorStyle(colors) }} />
        )}
      </head>
      <body className="min-h-full flex flex-col bg-brand-cream">
        <Providers siteConfig={siteConfig} user={user}>
          <ServiceWorkerRegistration />
          {children}
          <WhatsAppFloatingButton />
          <PushPermissionPrompt />
          <PwaInstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
