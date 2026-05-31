"use client";

import { SessionProvider } from "next-auth/react";
import { CartProvider } from "@/context/CartContext";
import { SiteConfigProvider, type SiteConfig } from "@/context/SiteConfigContext";
import { UserProvider, type SessionUser } from "@/context/UserContext";

export default function Providers({
  children,
  siteConfig,
  user,
}: {
  children: React.ReactNode;
  siteConfig: SiteConfig;
  user: SessionUser;
}) {
  return (
    <SessionProvider>
      <UserProvider user={user}>
        <SiteConfigProvider config={siteConfig}>
          <CartProvider>{children}</CartProvider>
        </SiteConfigProvider>
      </UserProvider>
    </SessionProvider>
  );
}
