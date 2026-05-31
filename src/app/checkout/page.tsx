import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CheckoutClient from "./CheckoutClient";

export default async function CheckoutPage() {
  const session  = await auth();
  const userId   = session?.user?.id ?? null;

  const [settings, userAddress] = await Promise.all([
    prisma.storeSettings.findUnique({ where: { id: "singleton" } }),
    userId
      ? prisma.address.findFirst({ where: { userId, isDefault: true } })
      : null,
  ]);

  const paymentMethods = {
    mercadoPago: settings?.mercadoPagoEnabled ?? false,
    flowPay:     settings?.flowPayEnabled     ?? false,
    transfer:    settings?.transferEnabled    ?? false,
    transferInfo: settings?.transferEnabled ? {
      bankName:      settings.transferBankName      ?? "",
      accountName:   settings.transferAccountName   ?? "",
      accountNumber: settings.transferAccountNumber ?? "",
      accountType:   settings.transferAccountType   ?? "",
      rut:           settings.transferRut            ?? "",
      instructions:  settings.transferInstructions  ?? "",
    } : null,
  };

  const shipping = {
    freeShippingFrom: settings?.freeShippingFrom ?? 30000,
    standardShipping: settings?.standardShipping ?? 5990,
    processingDays:   settings?.processingDays   ?? "1-2",
  };

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1 bg-brand-cream">
        <CheckoutClient
          user={session?.user ? { id: userId!, name: session.user.name ?? "", email: session.user.email ?? "" } : null}
          savedAddress={userAddress ?? null}
          paymentMethods={paymentMethods}
          shipping={shipping}
        />
      </main>
      <Footer />
    </>
  );
}
