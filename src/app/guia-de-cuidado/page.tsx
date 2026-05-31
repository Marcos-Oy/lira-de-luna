import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Droplets, Package, Sparkles, AlertCircle } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import type { PageTexts } from "@/types/personalization";

export const metadata: Metadata = { title: "Guía de Cuidado — Lira de Luna" };

const sections = [
  {
    icon: Droplets,
    title: "Limpieza",
    tips: [
      "Limpia con un paño suave de microfibra después de cada uso.",
      "Para limpiezas profundas, usa agua tibia con unas gotas de jabón neutro.",
      "Evita usar químicos abrasivos, cloro o productos de limpieza del hogar.",
      "Seca completamente antes de guardar.",
    ],
  },
  {
    icon: Package,
    title: "Almacenamiento",
    tips: [
      "Guarda cada pieza por separado para evitar rayones.",
      "Usa la bolsa de lino o caja incluida con tu compra.",
      "Evita la humedad y el calor directo.",
      "Mantén alejadas de la luz solar directa por períodos prolongados.",
    ],
  },
  {
    icon: Sparkles,
    title: "Uso diario",
    tips: [
      "Colócate las joyas después de aplicar perfume, crema o maquillaje.",
      "Retíralas antes de dormir, bañarte o nadar.",
      "Evita el contacto con agua de mar, cloro de alberca y sudor excesivo.",
      "El baño de oro puede desgastarse con el tiempo — el cuidado adecuado lo prolonga.",
    ],
  },
  {
    icon: AlertCircle,
    title: "Materiales",
    tips: [
      "Plata .925: 92.5% plata pura, durable y de alta calidad.",
      "Baño de oro 18k: capa de oro aplicada sobre plata .925.",
      "Piedra de luna: piedra natural delicada, evitar golpes.",
      "Perla cultivada: requiere limpieza con paño húmedo, sin jabón.",
    ],
  },
];

const DEFAULT_HEADER_BODY =
  "Tus joyas están hechas para durar. Con el cuidado correcto, acompañarán cada momento de tu historia.";
const DEFAULT_QUOTE =
  '"Una joya cuidada es una joya que te acompaña toda la vida."';

export default async function GuiaDeCuidadoPage() {
  const settings = await prisma.storeSettings.findFirst({
    where: { id: "singleton" },
    select: { pageTexts: true },
  });
  const texts = (settings?.pageTexts as PageTexts | null) ?? {};
  const headerBody = texts.guiaCuidado ?? DEFAULT_HEADER_BODY;
  const quote      = texts.guiaCuidadoQuote ?? DEFAULT_QUOTE;

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <div className="bg-brand-beige py-20 text-center">
          <p className="text-[10px] tracking-[0.3em] uppercase text-brand-taupe mb-3">Cuida tu inversión</p>
          <h1 className="font-heading text-5xl md:text-6xl text-brand-dark mb-4">Guía de Cuidado</h1>
          <p className="text-sm text-brand-taupe font-light max-w-sm mx-auto leading-relaxed">{headerBody}</p>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {sections.map((section) => (
              <div key={section.title}>
                <div className="flex items-center gap-3 mb-6">
                  <section.icon size={22} strokeWidth={1.25} className="text-brand-sand" />
                  <h2 className="font-heading text-2xl text-brand-dark">{section.title}</h2>
                </div>
                <ul className="space-y-4">
                  {section.tips.map((tip, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-brand-sand text-xs mt-0.5 shrink-0">◆</span>
                      <p className="text-sm text-brand-taupe font-light leading-relaxed">{tip}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Editorial quote */}
          <div className="border-t border-brand-beige mt-20 pt-16 text-center">
            <blockquote className="font-heading text-3xl md:text-4xl text-brand-dark italic leading-snug max-w-xl mx-auto">
              {quote}
            </blockquote>
            <p className="text-[10px] tracking-[0.2em] uppercase text-brand-taupe mt-6">— Lira de Luna</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
