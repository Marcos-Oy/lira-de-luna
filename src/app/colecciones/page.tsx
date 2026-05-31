import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CollectionCard from "@/components/collections/CollectionCard";
import { collections } from "@/lib/mock-data";
import { prisma } from "@/lib/db";
import { Layers } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Colecciones — Lira de Luna",
};

export default async function ColeccionesPage() {
  const settings = await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  if (!settings.retailEnabled) {
    return (
      <>
        <AnnouncementBar />
        <Navbar />
        <main className="min-h-[60vh] flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-[#EDE2D8] flex items-center justify-center mx-auto mb-6">
              <Layers size={28} strokeWidth={1} className="text-[#CDA78F]" />
            </div>
            <h1 className="font-heading text-3xl text-brand-dark tracking-widest uppercase mb-3">
              No disponible
            </h1>
            <p className="text-sm text-brand-taupe leading-relaxed">
              Las colecciones no están disponibles en este momento.
            </p>
            <a
              href="mailto:hola@liradeluna.cl"
              className="mt-6 inline-block bg-brand-sand hover:bg-brand-taupe text-white text-[11px] tracking-[0.2em] uppercase px-8 py-3 transition-colors"
            >
              Contactar
            </a>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">
        <div className="bg-brand-beige-light border-b border-brand-beige py-12 text-center">
          <p className="text-[10px] tracking-[0.3em] uppercase text-brand-taupe mb-2">
            Descubrir
          </p>
          <h1 className="font-heading text-5xl text-brand-dark">Colecciones</h1>
          <p className="text-sm text-brand-taupe font-light mt-3 max-w-sm mx-auto">
            Cada colección, una historia diferente para llevar contigo.
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {collections.map((col) => (
              <CollectionCard key={col.id} collection={col} />
            ))}
          </div>

          {/* Collection descriptions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-20">
            {collections.map((col) => (
              <div key={col.id} className="border-t border-brand-beige pt-8">
                <h2 className="font-heading text-2xl text-brand-dark mb-2">
                  {col.name}
                </h2>
                <p className="text-sm text-brand-taupe font-light leading-relaxed mb-4">
                  {col.description}
                </p>
                <p className="text-[10px] tracking-[0.15em] uppercase text-brand-taupe">
                  {col.productCount} piezas disponibles
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
