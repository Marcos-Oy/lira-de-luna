"use client";

import Link from "next/link";
import { useSiteConfig } from "@/context/SiteConfigContext";
import { SOCIAL_ICON_MAP, parseSocialLinks } from "@/components/SocialIcons";

const footerLinks = {
  tienda: [
    { href: "/tienda", label: "Todos los productos" },
    { href: "/colecciones/collares", label: "Collares" },
    { href: "/colecciones/aretes", label: "Aretes" },
    { href: "/colecciones/anillos", label: "Anillos" },
    { href: "/colecciones/pulseras", label: "Pulseras" },
  ],
  info: [
    { href: "/nosotros", label: "Nosotros" },
    { href: "/guia-de-cuidado", label: "Guía de cuidado" },
    { href: "/envios", label: "Envíos y devoluciones" },
    { href: "/preguntas-frecuentes", label: "Preguntas frecuentes" },
  ],
};

export default function Footer() {
  const { storeName, footerTagline, socialLinks } = useSiteConfig();
  const links = parseSocialLinks(socialLinks);

  return (
    <footer className="bg-brand-beige-light border-t border-brand-beige mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="font-heading text-2xl tracking-widest uppercase text-brand-dark mb-3">
              {storeName}
            </div>
            <p className="text-xs tracking-[0.15em] text-brand-taupe mb-6 leading-relaxed whitespace-pre-line">
              {footerTagline}
            </p>
            <div className="flex items-center gap-4">
              {links.map((link, i) => {
                const entry = SOCIAL_ICON_MAP[link.platform];
                if (!entry || !link.url) return null;
                const { Icon, label } = entry;
                return (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="text-brand-taupe hover:text-brand-dark transition-colors"
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Tienda */}
          <div>
            <h4 className="text-[11px] tracking-[0.2em] uppercase text-brand-dark font-medium mb-5">
              Tienda
            </h4>
            <ul className="space-y-3">
              {footerLinks.tienda.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs tracking-wide text-brand-taupe hover:text-brand-dark transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Información */}
          <div>
            <h4 className="text-[11px] tracking-[0.2em] uppercase text-brand-dark font-medium mb-5">
              Información
            </h4>
            <ul className="space-y-3">
              {footerLinks.info.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs tracking-wide text-brand-taupe hover:text-brand-dark transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-[11px] tracking-[0.2em] uppercase text-brand-dark font-medium mb-5">
              Únete a la comunidad
            </h4>
            <p className="text-xs text-brand-taupe leading-relaxed mb-4">
              Recibe novedades, inspiración y descuentos exclusivos.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="tu@email.com"
                className="flex-1 bg-brand-cream border border-brand-beige text-brand-dark placeholder:text-brand-taupe text-xs px-3 py-2.5 outline-none focus:border-brand-sand transition-colors"
              />
              <button className="bg-brand-sand hover:bg-brand-taupe text-white text-[10px] tracking-[0.15em] uppercase px-4 py-2.5 transition-colors">
                Ok
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-brand-beige mt-12 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[10px] tracking-wide text-brand-taupe">
            © 2025 Lira de Luna. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/privacidad"
              className="text-[10px] tracking-wide text-brand-taupe hover:text-brand-dark transition-colors"
            >
              Política de privacidad
            </Link>
            <Link
              href="/terminos"
              className="text-[10px] tracking-wide text-brand-taupe hover:text-brand-dark transition-colors"
            >
              Términos y condiciones
            </Link>
            <Link
              href="/admin/login"
              className="text-[10px] tracking-wide text-brand-beige hover:text-brand-taupe transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
