import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  let success = false;

  if (id) {
    try {
      await prisma.newsletterSubscriber.update({
        where: { id },
        data: { isActive: false },
      });
      success = true;
    } catch {
      // subscriber not found — silently ignore
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F4F1] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <p className="font-heading text-2xl text-[#5C4A3E] mb-3" style={{ fontStyle: "italic" }}>Lira de Luna</p>
        {success ? (
          <>
            <h1 className="text-lg text-[#5C4A3E] mb-3">Has sido desuscrito</h1>
            <p className="text-sm text-[#8E7A6B] mb-8">
              Ya no recibirás correos de marketing de nuestra parte. Si cambiaste de opinión puedes volver a suscribirte en la tienda.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg text-[#5C4A3E] mb-3">Enlace inválido</h1>
            <p className="text-sm text-[#8E7A6B] mb-8">No encontramos tu suscripción. Es posible que ya hayas sido desuscrito.</p>
          </>
        )}
        <Link href="/" className="text-[10px] tracking-[0.2em] uppercase text-[#CDA78F] hover:text-[#8E7A6B] underline underline-offset-4">
          Volver a la tienda
        </Link>
      </div>
    </div>
  );
}
