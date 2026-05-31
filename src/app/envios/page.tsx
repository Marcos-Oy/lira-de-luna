import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Truck, RefreshCcw, Clock, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import type { PageTexts } from "@/types/personalization";

export const metadata: Metadata = { title: "Envíos y Devoluciones — Lira de Luna" };

const DEFAULT_SECTIONS = [
  {
    icon: Truck,
    title: "Política de envíos",
    items: [
      { q: "¿Cuánto cuesta el envío?", a: "El envío es GRATIS en pedidos mayores a $30.000 CLP. Para pedidos menores, el costo es de $5.990 CLP a todo Chile." },
      { q: "¿Cuánto tarda en llegar mi pedido?", a: "Los pedidos se procesan en 1–2 días hábiles. La entrega tarda entre 3–7 días hábiles según tu ubicación." },
      { q: "¿Puedo rastrear mi pedido?", a: "Sí. Una vez enviado tu pedido, recibirás un email con el número de rastreo." },
    ],
  },
  {
    icon: Clock,
    title: "Tiempos de procesamiento",
    items: [
      { q: "¿Cuándo se procesa mi pedido?", a: "Los pedidos confirmados antes de las 2:00 PM en días hábiles se procesan el mismo día." },
      { q: "¿Qué pasa si compro en fin de semana?", a: "Los pedidos del fin de semana se procesan el siguiente lunes hábil." },
    ],
  },
  {
    icon: RefreshCcw,
    title: "Cambios y devoluciones",
    items: [
      { q: "¿Puedo devolver mi joya?", a: "Aceptamos devoluciones dentro de los 15 días naturales de recepción, en estado original." },
      { q: "¿Cómo solicito una devolución?", a: "Escríbenos a hola@liradeluna.com con tu número de pedido y el motivo." },
      { q: "¿El envío de devolución tiene costo?", a: "Si el producto llegó defectuoso, nosotros cubrimos el costo. Si es por cambio de opinión, el envío corre por cuenta del cliente." },
    ],
  },
  {
    icon: MapPin,
    title: "Paquetería",
    items: [
      { q: "¿Qué paquetería usan?", a: "Trabajamos con las principales empresas de courier según la zona de entrega." },
      { q: "¿Mi joya viene asegurada?", a: "Sí. Todos los envíos están asegurados contra pérdida o daño durante el transporte." },
    ],
  },
];

function renderContent(text: string) {
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map((para, i) => {
    const trimmed = para.trim();
    if (trimmed.startsWith("###")) {
      return (
        <h2 key={i} className="font-heading text-2xl text-brand-dark mb-4 mt-10 first:mt-0 flex items-center gap-2">
          {trimmed.replace(/^###\s*/, "")}
        </h2>
      );
    }
    return (
      <p key={i} className="text-sm text-brand-taupe font-light leading-relaxed mb-3">
        {trimmed}
      </p>
    );
  });
}

export default async function EnviosPage() {
  const settings = await prisma.storeSettings.findFirst({
    where: { id: "singleton" },
    select: { pageTexts: true },
  });
  const texts = (settings?.pageTexts as PageTexts | null) ?? {};
  const customContent = texts.envios;

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">
        <div className="bg-brand-beige py-16 text-center">
          <p className="text-[10px] tracking-[0.3em] uppercase text-brand-taupe mb-3">Todo lo que necesitas saber</p>
          <h1 className="font-heading text-5xl text-brand-dark mb-4">Envíos y Devoluciones</h1>
          <p className="text-sm text-brand-taupe font-light max-w-sm mx-auto">
            Queremos que tu experiencia sea perfecta, desde que haces tu pedido hasta que lo tienes en tus manos.
          </p>
        </div>

        {/* Quick info strip */}
        <div className="bg-brand-cream border-b border-brand-beige py-8">
          <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { label: "Envío gratis",   value: "+$30.000 CLP" },
              { label: "Procesamiento",  value: "1–2 días hábiles" },
              { label: "Entrega",        value: "3–7 días hábiles" },
              { label: "Devoluciones",   value: "15 días naturales" },
            ].map((item) => (
              <div key={item.label}>
                <p className="font-heading text-xl text-brand-dark">{item.value}</p>
                <p className="text-[10px] tracking-[0.12em] uppercase text-brand-taupe mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-16">
          {customContent ? (
            <div>{renderContent(customContent)}</div>
          ) : (
            <div className="space-y-14">
              {DEFAULT_SECTIONS.map((section) => (
                <div key={section.title}>
                  <div className="flex items-center gap-3 mb-7 pb-4 border-b border-brand-beige">
                    <section.icon size={18} strokeWidth={1.25} className="text-brand-sand" />
                    <h2 className="font-heading text-2xl text-brand-dark">{section.title}</h2>
                  </div>
                  <div className="space-y-6">
                    {section.items.map((item) => (
                      <div key={item.q}>
                        <p className="text-sm text-brand-dark font-medium mb-2">{item.q}</p>
                        <p className="text-sm text-brand-taupe font-light leading-relaxed">{item.a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
