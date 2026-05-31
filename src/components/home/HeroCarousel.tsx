"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type BannerSlide = {
  id: string;
  image: string;
  eyebrow: string;
  heading: string;
  body: string | null;
  ctaLabel: string;
  ctaHref: string;
};

const fallbackSlides: BannerSlide[] = [
  {
    id: "1",
    image: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=1600&h=700&q=90&auto=format&fit=crop",
    eyebrow: "Belleza que conecta",
    heading: "Joyas que cuentan\ntu historia",
    body: "Diseños minimalistas en plata y baño de oro,\nhechos para acompañarte siempre.",
    ctaLabel: "Comprar ahora",
    ctaHref: "/tienda",
  },
  {
    id: "2",
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1600&h=700&q=90&auto=format&fit=crop",
    eyebrow: "Nueva colección",
    heading: "Collares Luna\nCreciente",
    body: "Símbolos de renovación y femineidad.\nCadenas ajustables en baño de oro 18k.",
    ctaLabel: "Ver colección",
    ctaHref: "/colecciones/collares",
  },
  {
    id: "3",
    image: "https://images.unsplash.com/photo-1573408301185-9519f94945c2?w=1600&h=700&q=90&auto=format&fit=crop",
    eyebrow: "Empaque especial",
    heading: "El regalo\nperfecto",
    body: "Cada pieza llega en caja beige mate\ncon detalles dorados, lista para regalar.",
    ctaLabel: "Explorar",
    ctaHref: "/tienda",
  },
];

interface Props {
  slides?: BannerSlide[];
}

export default function HeroCarousel({ slides: propSlides }: Props) {
  const slides = propSlides && propSlides.length > 0 ? propSlides : fallbackSlides;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(
    () => setActive((a) => (a + 1) % slides.length),
    [slides.length]
  );
  const prev = useCallback(
    () => setActive((a) => (a - 1 + slides.length) % slides.length),
    [slides.length]
  );

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [paused, next]);

  return (
    <section
      className="relative w-full h-[58vh] min-h-[400px] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === active ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          <Image
            src={slide.image}
            alt={slide.heading.replace(/\n/g, " ")}
            fill
            priority={i === 0}
            className="object-cover object-center"
            sizes="100vw"
            unoptimized={!slide.image.startsWith("https://images.unsplash.com")}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-cream/75 via-brand-cream/30 to-transparent" />

          {/* Content */}
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl mx-auto px-6 w-full">
              <div className="max-w-sm">
                <p className="text-[10px] tracking-[0.35em] uppercase text-brand-taupe mb-3">
                  {slide.eyebrow}
                </p>
                <h1 className="font-heading text-4xl md:text-5xl text-brand-dark leading-[1.1] mb-4 whitespace-pre-line">
                  {slide.heading}
                </h1>
                {slide.body && (
                  <p className="text-xs font-light text-brand-taupe leading-relaxed mb-6 whitespace-pre-line">
                    {slide.body}
                  </p>
                )}
                <Link
                  href={slide.ctaHref}
                  className="inline-block bg-brand-sand hover:bg-brand-taupe text-white text-[10px] tracking-[0.25em] uppercase px-7 py-3 transition-colors"
                >
                  {slide.ctaLabel}
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Arrows */}
      <button
        onClick={prev}
        aria-label="Anterior"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 flex items-center justify-center bg-brand-cream/70 hover:bg-brand-cream text-brand-taupe hover:text-brand-dark transition-colors"
      >
        <ChevronLeft size={16} strokeWidth={1.5} />
      </button>
      <button
        onClick={next}
        aria-label="Siguiente"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 flex items-center justify-center bg-brand-cream/70 hover:bg-brand-cream text-brand-taupe hover:text-brand-dark transition-colors"
      >
        <ChevronRight size={16} strokeWidth={1.5} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            aria-label={`Ir a slide ${i + 1}`}
            className={`transition-all duration-300 rounded-full ${
              i === active
                ? "w-6 h-1.5 bg-brand-sand"
                : "w-1.5 h-1.5 bg-brand-taupe/50 hover:bg-brand-taupe"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
