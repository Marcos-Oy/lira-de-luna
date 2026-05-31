export default function NewsletterSection() {
  return (
    <section className="bg-brand-beige py-20">
      <div className="max-w-lg mx-auto px-6 text-center">
        <p className="text-[10px] tracking-[0.3em] uppercase text-brand-taupe mb-3">
          Comunidad Lira
        </p>
        <h2 className="font-heading text-4xl text-brand-dark mb-4">
          Belleza que conecta
        </h2>
        <p className="text-sm font-light text-brand-taupe leading-relaxed mb-8">
          Suscríbete y recibe novedades, historias detrás de cada pieza y
          descuentos exclusivos para nuestra comunidad.
        </p>
        <div className="flex gap-0 max-w-sm mx-auto">
          <input
            type="email"
            placeholder="Tu correo electrónico"
            className="flex-1 bg-brand-cream border border-brand-beige border-r-0 text-brand-dark placeholder:text-brand-taupe text-xs px-4 py-3.5 outline-none focus:border-brand-sand transition-colors"
          />
          <button className="bg-brand-sand hover:bg-brand-taupe text-white text-[10px] tracking-[0.2em] uppercase px-6 py-3.5 transition-colors whitespace-nowrap">
            Suscribirme
          </button>
        </div>
        <p className="text-[10px] text-brand-taupe mt-4 opacity-70">
          Sin spam. Solo belleza e intención.
        </p>
      </div>
    </section>
  );
}
