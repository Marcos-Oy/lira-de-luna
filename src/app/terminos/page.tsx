import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import type { PageTexts } from "@/types/personalization";

export const metadata: Metadata = { title: "Términos y Condiciones — Lira de Luna" };

const DEFAULT_SECTIONS = [
  { title: "1. Aceptación de los términos", body: "Al acceder y utilizar este sitio web, aceptas quedar vinculado por estos Términos y Condiciones." },
  { title: "2. Productos y precios", body: "Todos los precios están en Pesos Chilenos (CLP). Nos reservamos el derecho de modificar precios sin previo aviso." },
  { title: "3. Proceso de compra", body: "Una vez confirmado tu pedido y procesado el pago, recibirás un correo de confirmación. En caso de producto agotado, procesaremos el reembolso completo." },
  { title: "4. Pagos", body: "Aceptamos tarjetas de crédito/débito y transferencia. Todos los pagos son procesados de forma segura por MercadoPago." },
  { title: "5. Envíos", body: "Realizamos envíos a todo Chile. Los tiempos y costos se detallan en nuestra Política de Envíos." },
  { title: "6. Devoluciones y cambios", body: "Aceptamos devoluciones dentro de los 15 días naturales de recepción, en estado original. Contacta a hola@liradeluna.com." },
  { title: "7. Garantía", body: "Todos nuestros productos tienen 6 meses de garantía contra defectos de fabricación." },
  { title: "8. Propiedad intelectual", body: "Todo el contenido de este sitio (fotografías, textos, diseños, logo) es propiedad exclusiva de Lira de Luna." },
  { title: "9. Legislación aplicable", body: "Estos términos se rigen por las leyes de la República de Chile." },
];

function renderContent(text: string) {
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map((para, i) => {
    const trimmed = para.trim();
    if (trimmed.startsWith("###")) {
      return (
        <h2 key={i} className="font-heading text-xl text-brand-dark mb-3 mt-8 first:mt-0">
          {trimmed.replace(/^###\s*/, "")}
        </h2>
      );
    }
    return (
      <p key={i} className="text-sm text-brand-taupe font-light leading-relaxed mb-4">
        {trimmed}
      </p>
    );
  });
}

export default async function TerminosPage() {
  const settings = await prisma.storeSettings.findFirst({
    where: { id: "singleton" },
    select: { pageTexts: true },
  });
  const texts = (settings?.pageTexts as PageTexts | null) ?? {};
  const customContent = texts.terminos;

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">
        <div className="bg-brand-beige-light border-b border-brand-beige py-12 text-center">
          <h1 className="font-heading text-4xl text-brand-dark">Términos y Condiciones</h1>
          <p className="text-xs text-brand-taupe mt-2">Última actualización: 20 de mayo de 2025</p>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-16 space-y-10">
          {customContent ? (
            <div className="space-y-2">{renderContent(customContent)}</div>
          ) : (
            DEFAULT_SECTIONS.map((s) => (
              <div key={s.title}>
                <h2 className="font-heading text-xl text-brand-dark mb-3">{s.title}</h2>
                <p className="text-sm text-brand-taupe font-light leading-relaxed">{s.body}</p>
              </div>
            ))
          )}
          <div className="border-t border-brand-beige pt-8 text-center">
            <p className="text-xs text-brand-taupe font-light">
              ¿Tienes preguntas?{" "}
              <a href="mailto:hola@liradeluna.com" className="text-brand-sand hover:underline">
                hola@liradeluna.com
              </a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
