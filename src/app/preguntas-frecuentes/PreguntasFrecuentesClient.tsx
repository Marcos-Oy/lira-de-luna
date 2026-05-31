"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { PageTexts } from "@/types/personalization";

const faqs = [
  {
    category: "Productos",
    items: [
      { q: "¿De qué materiales están hechas las joyas?", a: "Todas nuestras piezas están fabricadas con plata .925 y algunas tienen baño de oro de 18 quilates. También trabajamos con piedras naturales como la piedra de luna y perlas cultivadas." },
      { q: "¿El baño de oro se desgasta?", a: "El baño de oro es una capa aplicada sobre plata .925. Con el cuidado adecuado puede durar mucho tiempo. Evita el contacto con agua, perfumes y cremas." },
      { q: "¿Son joyas hipoalergénicas?", a: "Nuestra plata .925 es generalmente bien tolerada por pieles sensibles. Contáctanos si tienes alergias específicas." },
      { q: "¿Cómo sé mi talla de anillo?", a: "Mide el diámetro interior de un anillo que te quede bien: Talla 5 = 15.7mm, Talla 6 = 16.5mm, Talla 7 = 17.3mm, Talla 8 = 18.2mm." },
    ],
  },
  {
    category: "Pedidos y pagos",
    items: [
      { q: "¿Qué métodos de pago aceptan?", a: "Aceptamos tarjetas de crédito y débito (Visa, Mastercard) y transferencia bancaria." },
      { q: "¿Es seguro pagar en la tienda?", a: "Sí. Todos los pagos se procesan con cifrado SSL. Nunca almacenamos datos de tu tarjeta." },
      { q: "¿Puedo modificar o cancelar mi pedido?", a: "Puedes cancelar dentro de las primeras 2 horas. Una vez en proceso de empaque, no es posible hacer cambios." },
    ],
  },
  {
    category: "Envíos",
    items: [
      { q: "¿Cuánto tarda en llegar mi pedido?", a: "Los pedidos se procesan en 1–2 días hábiles y la entrega toma entre 3–7 días hábiles." },
      { q: "¿El envío es gratis?", a: "Sí, el envío es completamente gratis en pedidos mayores a $30.000 CLP. Para pedidos menores, el costo es de $5.990 CLP." },
    ],
  },
  {
    category: "Cuidado y garantía",
    items: [
      { q: "¿Tienen garantía las joyas?", a: "Sí, todas nuestras piezas tienen 6 meses de garantía contra defectos de fabricación." },
      { q: "¿Hacen reparaciones?", a: "Contáctanos en hola@liradeluna.com y te orientamos según el tipo de reparación." },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-brand-beige">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-5 text-left gap-4"
      >
        <span className="text-sm text-brand-dark">{q}</span>
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          className={`text-brand-taupe shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="text-sm text-brand-taupe font-light leading-relaxed pb-5 -mt-1">{a}</p>
      )}
    </div>
  );
}

function renderFreeText(text: string) {
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map((para, i) => {
    const trimmed = para.trim();
    if (trimmed.startsWith("###")) {
      return (
        <h2 key={i} className="text-[11px] tracking-[0.25em] uppercase text-brand-dark mb-1 pb-4 border-b border-brand-beige mt-10 first:mt-0">
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

export default function PreguntasFrecuentesClient({ texts }: { texts: PageTexts }) {
  const customContent = texts.preguntas;

  return (
    <div className="max-w-3xl mx-auto px-6 py-16 space-y-14">
      {customContent ? (
        <div>{renderFreeText(customContent)}</div>
      ) : (
        faqs.map((section) => (
          <div key={section.category}>
            <h2 className="text-[11px] tracking-[0.25em] uppercase text-brand-dark mb-1 pb-4 border-b border-brand-beige">
              {section.category}
            </h2>
            {section.items.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        ))
      )}

      <div className="bg-brand-beige-light p-8 text-center">
        <p className="font-heading text-2xl text-brand-dark mb-2">¿No encontraste tu respuesta?</p>
        <p className="text-sm text-brand-taupe font-light mb-5">Escríbenos y te respondemos en menos de 24 horas.</p>
        <a
          href="mailto:hola@liradeluna.com"
          className="inline-block bg-brand-sand hover:bg-brand-taupe text-white text-[10px] tracking-[0.25em] uppercase px-7 py-3 transition-colors"
        >
          Contactar
        </a>
      </div>
    </div>
  );
}
