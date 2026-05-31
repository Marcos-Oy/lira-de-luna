import Image from "next/image";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative w-full h-[85vh] min-h-[500px] overflow-hidden">
      {/* Background image */}
      <Image
        src="https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=1600&h=900&q=90&auto=format&fit=crop"
        alt="Modelo con collar luna — Lira de Luna"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />

      {/* Warm overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-cream/75 via-brand-cream/35 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex items-center">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-md">
            <p className="text-[10px] tracking-[0.35em] uppercase text-brand-taupe mb-4">
              Belleza que conecta
            </p>
            <h1 className="font-heading text-5xl md:text-6xl text-brand-dark leading-[1.1] mb-5">
              Joyas que cuentan
              <br />
              tu historia
            </h1>
            <p className="text-sm font-light text-brand-taupe leading-relaxed mb-8 max-w-xs">
              Diseños minimalistas en plata y baño de oro,
              <br />
              hechos para acompañarte siempre.
            </p>
            <Link
              href="/tienda"
              className="inline-block bg-brand-sand hover:bg-brand-taupe text-white text-[11px] tracking-[0.25em] uppercase px-8 py-3.5 transition-colors"
            >
              Comprar ahora
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
