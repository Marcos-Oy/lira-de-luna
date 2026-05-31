import Image from "next/image";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Moon, Leaf, Sparkles, Heart } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import type { PageTexts } from "@/types/personalization";

export const metadata: Metadata = { title: "Nosotros — Lira de Luna" };

const values = [
  { icon: Moon,     title: "Inspiración lunar",   body: "Cada pieza nace de la conexión con los ciclos de la luna: renovación, intención y femineidad." },
  { icon: Leaf,     title: "Materiales conscientes", body: "Trabajamos exclusivamente con plata .925 y baño de oro de 18k. Calidad que se siente." },
  { icon: Sparkles, title: "Diseño minimalista",  body: "Menos es más. Cada detalle es intencional, cada línea tiene un propósito." },
  { icon: Heart,    title: "Hecho con amor",      body: "Cada pieza se inspecciona a mano antes de llegar a ti. Tu experiencia es nuestra prioridad." },
];

const DEFAULT_STORY = `Lira de Luna nació de la creencia de que cada joya cuenta una historia. No vendemos accesorios: vendemos símbolos personales, recuerdos que se llevan en la piel, energía que acompaña cada momento de tu vida.

Nuestra inspiración viene de la luna, esa presencia constante y silenciosa que nos recuerda que la belleza más profunda está en la calma, en los ciclos, en la conexión con lo esencial.

Cada pieza es diseñada con minimalismo y propósito. Plata .925, baño de oro de 18k y piedras naturales seleccionadas con intención. Para que cuando la uses, sientas que algo especial te acompaña.`;

export default async function NosotrosPage() {
  const settings = await prisma.storeSettings.findFirst({
    where: { id: "singleton" },
    select: { pageTexts: true },
  });
  const texts = (settings?.pageTexts as PageTexts | null) ?? {};
  const story = texts.nosotros ?? DEFAULT_STORY;

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <div className="relative h-[60vh] overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1400&h=700&q=85&auto=format&fit=crop"
            alt="Lira de Luna — nuestra historia"
            fill
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-brand-cream/60" />
          <div className="absolute inset-0 flex items-center justify-center text-center">
            <div>
              <p className="text-[10px] tracking-[0.4em] uppercase text-brand-taupe mb-4">Nuestra historia</p>
              <h1 className="font-heading text-5xl md:text-7xl text-brand-dark">Lira de Luna</h1>
              <p className="text-sm text-brand-taupe font-light mt-4 tracking-[0.1em]">Belleza que conecta</p>
            </div>
          </div>
        </div>

        {/* Story section */}
        <section className="max-w-3xl mx-auto px-6 py-24 text-center">
          <h2 className="font-heading text-4xl text-brand-dark mb-6">Más que joyas, conexiones</h2>
          {story.split("\n\n").map((para, i) => (
            <p key={i} className="text-sm text-brand-taupe font-light leading-8 mb-6 last:mb-0">
              {para.trim()}
            </p>
          ))}
        </section>

        {/* Values */}
        <section className="bg-brand-beige-light py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="font-heading text-4xl text-brand-dark">Lo que nos guía</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {values.map((val) => (
                <div key={val.title} className="text-center">
                  <div className="flex justify-center mb-5">
                    <val.icon size={28} strokeWidth={1.25} className="text-brand-sand" />
                  </div>
                  <h3 className="font-heading text-xl text-brand-dark mb-3">{val.title}</h3>
                  <p className="text-xs text-brand-taupe font-light leading-relaxed">{val.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-brand-beige py-20 text-center">
          <p className="text-[10px] tracking-[0.3em] uppercase text-brand-taupe mb-4">
            Pequeños símbolos para recordar quién eres
          </p>
          <h2 className="font-heading text-4xl text-brand-dark mb-8">Encuentra tu pieza especial</h2>
          <a
            href="/tienda"
            className="inline-block bg-brand-sand hover:bg-brand-taupe text-white text-[11px] tracking-[0.25em] uppercase px-10 py-4 transition-colors"
          >
            Explorar tienda
          </a>
        </section>
      </main>
      <Footer />
    </>
  );
}
