import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import type { PageTexts } from "@/types/personalization";

export const metadata: Metadata = { title: "Política de Privacidad — Lira de Luna" };

const DEFAULT_SECTIONS = [
  { title: "1. Responsable del tratamiento", body: "Lira de Luna es responsable del tratamiento de los datos personales que recopilamos a través de nuestro sitio web. Para consultas sobre privacidad, contáctanos en hola@liradeluna.com." },
  { title: "2. Datos que recopilamos", body: "Recopilamos nombre, correo, dirección de envío, historial de pedidos y datos de navegación mediante cookies. Los datos de pago son procesados por MercadoPago y no los almacenamos." },
  { title: "3. Finalidad del tratamiento", body: "Usamos tus datos para procesar pedidos, enviarte confirmaciones, gestionar tu cuenta y, con tu consentimiento, enviarte comunicaciones de marketing." },
  { title: "4. Conservación de datos", body: "Conservamos tus datos mientras mantengas una cuenta activa o según lo requiera la legislación chilena vigente." },
  { title: "5. Tus derechos", body: "Tienes derecho a acceder, rectificar, cancelar u oponerte al tratamiento de tus datos. Escríbenos a hola@liradeluna.com para ejercer estos derechos." },
  { title: "6. Cookies", body: "Usamos cookies propias para recordar tu carrito y sesión, y cookies de terceros para analítica. Puedes desactivarlas en tu navegador." },
  { title: "7. Cambios en esta política", body: "Podemos actualizar esta política ocasionalmente. Te notificaremos por correo de cambios significativos." },
];

function renderContent(text: string) {
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map((para, i) => {
    const trimmed = para.trim();
    if (trimmed.startsWith("###")) {
      return (
        <h2 key={i} className="font-heading text-2xl text-brand-dark mb-4 mt-8 first:mt-0">
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

export default async function PrivacidadPage() {
  const settings = await prisma.storeSettings.findFirst({
    where: { id: "singleton" },
    select: { pageTexts: true },
  });
  const texts = (settings?.pageTexts as PageTexts | null) ?? {};
  const customContent = texts.privacidad;

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">
        <div className="bg-brand-beige-light border-b border-brand-beige py-12 text-center">
          <h1 className="font-heading text-4xl text-brand-dark">Política de Privacidad</h1>
          <p className="text-xs text-brand-taupe mt-2">Última actualización: 20 de mayo de 2025</p>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-16">
          {customContent ? (
            <div className="space-y-2">{renderContent(customContent)}</div>
          ) : (
            <div className="space-y-10">
              {DEFAULT_SECTIONS.map((s) => (
                <section key={s.title}>
                  <h2 className="font-heading text-2xl text-brand-dark mb-4">{s.title}</h2>
                  <p className="text-sm text-brand-taupe font-light leading-relaxed">{s.body}</p>
                </section>
              ))}
            </div>
          )}
          <div className="border-t border-brand-beige pt-8 text-center mt-10">
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
