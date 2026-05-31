import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import type { PageTexts } from "@/types/personalization";
import PreguntasFrecuentesClient from "./PreguntasFrecuentesClient";

export const metadata: Metadata = { title: "Preguntas Frecuentes — Lira de Luna" };

export default async function PreguntasFrecuentesPage() {
  const settings = await prisma.storeSettings.findFirst({
    where: { id: "singleton" },
    select: { pageTexts: true },
  });
  const texts = (settings?.pageTexts as PageTexts | null) ?? {};

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">
        <div className="bg-brand-beige py-16 text-center">
          <p className="text-[10px] tracking-[0.3em] uppercase text-brand-taupe mb-3">Estamos para ayudarte</p>
          <h1 className="font-heading text-5xl text-brand-dark mb-4">Preguntas Frecuentes</h1>
          <p className="text-sm text-brand-taupe font-light max-w-xs mx-auto">
            Encuentra respuesta a las dudas más comunes sobre nuestros productos y servicios.
          </p>
        </div>
        <PreguntasFrecuentesClient texts={texts} />
      </main>
      <Footer />
    </>
  );
}
