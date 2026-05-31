import { prisma } from "@/lib/db";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MayoristaClient from "./MayoristaClient";
import { PackageSearch } from "lucide-react";

export default async function MayoristaPage() {
  const settings = await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", wholesaleEnabled: false },
  });

  if (!settings.wholesaleEnabled) {
    return (
      <>
        <AnnouncementBar />
        <Navbar />
        <main className="min-h-[60vh] flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-[#EDE2D8] flex items-center justify-center mx-auto mb-6">
              <PackageSearch size={28} strokeWidth={1} className="text-[#CDA78F]" />
            </div>
            <h1 className="font-heading text-3xl text-brand-dark tracking-widest uppercase mb-3">
              Próximamente
            </h1>
            <p className="text-sm text-brand-taupe leading-relaxed">
              Nuestra sección de ventas al por mayor está en preparación.
              Si tienes interés en compras mayoristas, escríbenos directamente.
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

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      saleType: { in: ["WHOLESALE", "WEIGHT"] },
    },
    include: {
      collection: { select: { name: true } },
      wholesaleTiers: { orderBy: { minQuantity: "asc" } },
      weightProduct: true,
    },
    orderBy: { saleType: "asc" },
  });

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main>
        {/* Hero */}
        <section className="bg-[#3D2E28] py-16 px-6 text-center">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#CDA78F] mb-3">Canal exclusivo</p>
          <h1 className="font-heading text-4xl md:text-5xl text-[#EDE2D8] tracking-widest uppercase mb-4">
            Venta al por Mayor
          </h1>
          <p className="text-sm text-white/60 max-w-lg mx-auto leading-relaxed">
            Precios especiales para revendedores, tiendas y boutiques.
            Compra por cantidad o por peso según el producto.
          </p>
        </section>

        {/* Info strip */}
        <section className="bg-[#EDE2D8] border-b border-[#D8BFAE]">
          <div className="max-w-4xl mx-auto px-6 py-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {[
              { label: "Por cantidad", desc: "Tiers de precio según volumen. A más unidades, mejor precio por pieza." },
              { label: "Por peso", desc: "Precio fijo por gramo. Solicita la cantidad exacta que necesitas." },
              { label: "Pedido mínimo", desc: "Cada producto tiene su mínimo indicado. Consulta antes de cotizar." },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#CDA78F] font-medium">{item.label}</p>
                <p className="text-xs text-[#8E7A6B] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Products */}
        <section className="max-w-7xl mx-auto px-6 py-12">
          <MayoristaClient products={products} />
        </section>
      </main>
      <Footer />
    </>
  );
}
