"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { submitLandingPageLead } from "@/app/actions/public/submitLead";
import { isSafeRedirectUrl, sanitizeHtml } from "@/lib/sanitize";
import type { LandingPageConfig } from "@/lib/crm";
import type { LPProduct } from "./page";

interface Props {
  id: string;
  config: LandingPageConfig;
  products: LPProduct[];
  isPreview?: boolean;
}

// ── Code injection helper ─────────────────────────────────────
// Properly re-creates <script> elements so browsers execute them.
// Plain dangerouslySetInnerHTML does NOT run scripts.
function injectHtmlNodes(html: string, container: HTMLElement) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  Array.from(tmp.childNodes).forEach((node) => {
    if ((node as Element).tagName === "SCRIPT") {
      const orig = node as HTMLScriptElement;
      const s = document.createElement("script");
      Array.from(orig.attributes).forEach((a) => s.setAttribute(a.name, a.value));
      s.textContent = orig.textContent;
      container.appendChild(s);
    } else {
      container.appendChild(node.cloneNode(true));
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────

function getEffectivePrice(p: LPProduct): number {
  if (!p.saleEnabled || p.saleDiscountPct == null) return p.price;
  const now = Date.now();
  if (p.saleStartAt && new Date(p.saleStartAt).getTime() > now) return p.price;
  if (p.saleEndAt && new Date(p.saleEndAt).getTime() < now) return p.price;
  return Math.round(p.price * (1 - p.saleDiscountPct / 100));
}

function fmtPrice(n: number) {
  return `$${n.toLocaleString("es-CL")}`;
}

// ── Lead Form ─────────────────────────────────────────────────

function LeadForm({
  config, landingPageId, redirectTo, onSuccess, ctaOverride, isPreview,
}: {
  config: LandingPageConfig;
  landingPageId: string;
  redirectTo?: string;
  onSuccess?: () => void;
  ctaOverride?: string;
  isPreview?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", email: "", phone: "", whatsappNumber: "" });
  const [error, setError] = useState<string | null>(null);

  function setField(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (isPreview) { onSuccess?.(); return; }
    if (config.collectName && !form.name.trim()) { setError("Por favor ingresa tu nombre."); return; }
    if (config.collectEmail && config.requireEmail && !form.email.trim()) { setError("El correo es requerido."); return; }
    if (config.collectPhone && config.requirePhone && !form.phone.trim()) { setError("El teléfono es requerido."); return; }
    startTransition(async () => {
      const res = await submitLandingPageLead({
        landingPageId, name: form.name,
        email: form.email || undefined, phone: form.phone || undefined,
        whatsappNumber: form.whatsappNumber || undefined,
      });
      if ("error" in res && res.error) { setError(res.error); return; }
      try { sessionStorage.setItem(`lp_lead_${landingPageId}`, "1"); } catch { /* ignore */ }
      if (redirectTo && isSafeRedirectUrl(redirectTo)) { window.location.href = redirectTo; }
      else { onSuccess?.(); }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {config.collectName && (
        <input
          value={form.name} onChange={(e) => setField("name", e.target.value)}
          placeholder="Nombre completo *"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-white"
          style={{ color: "#5C4A3E" }} required
        />
      )}
      {config.collectEmail && (
        <input
          type="email" value={form.email} onChange={(e) => setField("email", e.target.value)}
          placeholder={`Correo electrónico${config.requireEmail ? " *" : ""}`}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-white"
          style={{ color: "#5C4A3E" }} required={config.requireEmail}
        />
      )}
      {config.collectPhone && (
        <input
          value={form.phone} onChange={(e) => setField("phone", e.target.value)}
          placeholder={`Teléfono${config.requirePhone ? " *" : ""}`}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-white"
          style={{ color: "#5C4A3E" }} required={config.requirePhone}
        />
      )}
      {config.collectWhatsapp && (
        <input
          value={form.whatsappNumber} onChange={(e) => setField("whatsappNumber", e.target.value)}
          placeholder="WhatsApp"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-white"
          style={{ color: "#5C4A3E" }}
        />
      )}
      {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
      <button
        type="submit" disabled={isPending}
        className="w-full text-white rounded-xl py-3.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ backgroundColor: config.accentColor }}
      >
        {isPending && <Loader2 size={16} className="animate-spin" />}
        {ctaOverride ?? config.ctaLabel}
      </button>
      <p className="text-[10px] text-center" style={{ color: "#8E7A6B" }}>
        Tus datos están seguros. No los compartimos.
      </p>
    </form>
  );
}

function ThankYou({ config }: { config: LandingPageConfig }) {
  return (
    <div className="text-center py-6">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
        style={{ backgroundColor: config.accentColor + "22" }}
      >
        ✓
      </div>
      <h3
        className="text-xl font-semibold mb-2"
        style={{ color: "#5C4A3E", fontFamily: "Cormorant Garamond, Georgia, serif" }}
      >
        {config.thankYouTitle}
      </h3>
      <p className="text-sm" style={{ color: "#8E7A6B" }}>{config.thankYouText}</p>
    </div>
  );
}

// ── Lead Gate Modal ───────────────────────────────────────────

function LeadGateModal({
  config, landingPageId, redirectTo, subtitle, onClose, isPreview,
}: {
  config: LandingPageConfig;
  landingPageId: string;
  redirectTo: string;
  subtitle?: string;
  onClose: () => void;
  isPreview?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden bg-white">
        <div className="px-6 pt-6 pb-4 text-center relative" style={{ backgroundColor: config.bgColor }}>
          <button onClick={onClose} className="absolute top-4 right-4 text-[#8E7A6B] hover:text-[#5C4A3E]">
            <X size={18} />
          </button>
          <h2
            className="text-xl font-semibold mb-1"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#5C4A3E" }}
          >
            {config.formTitle}
          </h2>
          <p className="text-xs" style={{ color: "#8E7A6B" }}>
            {subtitle ?? config.formSubtitle}
          </p>
        </div>
        <div className="px-6 py-5">
          <LeadForm
            config={config}
            landingPageId={landingPageId}
            redirectTo={redirectTo}
            ctaOverride={config.productCtaLabel + " →"}
            isPreview={isPreview}
          />
        </div>
      </div>
    </div>
  );
}

// ── Video Block ───────────────────────────────────────────────

function resolveVideoEmbed(url: string): { type: "youtube" | "vimeo" | "direct"; src: string } {
  // YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  if (yt) return {
    type: "youtube",
    src: `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1&autoplay=1&mute=1&playsinline=1&loop=1&playlist=${yt[1]}`,
  };

  // Vimeo: vimeo.com/ID or vimeo.com/channels/x/ID
  const vm = url.match(/vimeo\.com\/(?:video\/|channels\/\S+\/)?(\d+)/);
  if (vm) return {
    type: "vimeo",
    src: `https://player.vimeo.com/video/${vm[1]}?dnt=1&autoplay=1&muted=1&loop=1&background=0`,
  };

  return { type: "direct", src: url };
}

function VideoBlock({ config }: { config: LandingPageConfig }) {
  if (!config.videoUrl) return null;
  const { type, src } = resolveVideoEmbed(config.videoUrl);
  const isVertical = config.videoOrientation === "vertical";

  const inner = type === "direct" ? (
    <video
      src={src}
      autoPlay
      muted
      loop
      playsInline
      controls
      className="w-full h-full object-contain rounded-2xl"
    />
  ) : (
    <iframe
      src={src}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      className="absolute inset-0 w-full h-full rounded-2xl"
    />
  );

  return (
    <section className="py-12 px-5">
      <div className={`mx-auto ${isVertical ? "max-w-sm" : "max-w-3xl"}`}>
        {config.videoTitle && (
          <h2
            className="text-2xl font-semibold text-center mb-6"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#5C4A3E" }}
          >
            {config.videoTitle}
          </h2>
        )}
        <div
          className={`relative w-full overflow-hidden rounded-2xl shadow-lg bg-black ${
            isVertical ? "" : ""
          }`}
          style={{ paddingBottom: isVertical ? "177.78%" : "56.25%" }}
        >
          <div className="absolute inset-0">{inner}</div>
        </div>
        {config.videoCaption && (
          <p className="text-xs text-center mt-4" style={{ color: "#8E7A6B" }}>
            {config.videoCaption}
          </p>
        )}
      </div>
    </section>
  );
}

// ── Product Carousel ──────────────────────────────────────────

function ProductCarousel({
  products, config, landingPageId, alreadyLead, isPreview,
}: {
  products: LPProduct[];
  config: LandingPageConfig;
  landingPageId: string;
  alreadyLead: boolean;
  isPreview?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0); // index of the first card of the current page
  const total = products.length;
  const totalPages = Math.ceil(total / 2);

  const scrollTo = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[index] as HTMLElement;
    if (card) {
      track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: "smooth" });
    }
    setActive(index);
  }, []);

  // Auto-advance pages every 3.5 s
  useEffect(() => {
    if (totalPages <= 1) return;
    const t = setInterval(() => {
      setActive((i) => {
        const currentPage = Math.floor(i / 2);
        const next = ((currentPage + 1) % totalPages) * 2;
        scrollTo(next);
        return next;
      });
    }, 3500);
    return () => clearInterval(t);
  }, [totalPages, scrollTo]);

  // Sync active page when user manually scrolls
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    function onScroll() {
      if (!track) return;
      const firstCard = track.children[0] as HTMLElement;
      if (!firstCard) return;
      // page width = 2 cards + 1 gap (gap-3 = 12 px)
      const pageWidth = firstCard.offsetWidth * 2 + 12;
      const page = Math.round(track.scrollLeft / pageWidth);
      setActive(Math.min(page * 2, total - 1));
    }
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, [total]);

  const [gateProduct, setGateProduct] = useState<LPProduct | null>(null);

  function handleProductClick(p: LPProduct) {
    if (isPreview) return;
    // Gate is independent of showForm — only requireLeadBeforeStore controls it
    if (!config.requireLeadBeforeStore || alreadyLead) {
      window.location.href = `/producto/${p.slug}`;
    } else {
      setGateProduct(p);
    }
  }

  const currentPage = Math.floor(active / 2);

  return (
    <div className="relative">
      {/* Track — 2 cards per page */}
      <div
        ref={trackRef}
        className="flex overflow-x-auto gap-3 pb-2 scroll-smooth"
        style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {products.map((p) => {
          const effectivePrice = getEffectivePrice(p);
          const hasDiscount = effectivePrice < p.price;
          return (
            <div
              key={p.id}
              style={{ scrollSnapAlign: "start", flexShrink: 0, width: "calc(50% - 6px)" }}
            >
              <div
                className="group rounded-2xl overflow-hidden border cursor-pointer transition-all hover:shadow-md h-full flex flex-col"
                style={{ borderColor: config.accentColor + "33", backgroundColor: "white" }}
                onClick={() => handleProductClick(p)}
              >
                <div className="w-full aspect-square overflow-hidden bg-[#EDE2D8] relative">
                  {p.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={p.image} alt={p.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[#8E7A6B] text-xs">sin imagen</div>
                  )}
                  {hasDiscount && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                      −{p.saleDiscountPct}%
                    </span>
                  )}
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <p className="text-sm font-medium leading-tight mb-1 line-clamp-2 flex-1" style={{ color: "#5C4A3E" }}>
                    {p.name}
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-semibold" style={{ color: config.accentColor }}>
                      {fmtPrice(effectivePrice)}
                    </span>
                    {hasDiscount && (
                      <span className="text-xs line-through" style={{ color: "#8E7A6B" }}>
                        {fmtPrice(p.price)}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="w-full text-white rounded-xl py-2 text-xs font-medium transition-opacity hover:opacity-90"
                    style={{ backgroundColor: config.accentColor }}
                  >
                    {config.productCtaLabel}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Prev / Next — step one page (2 cards) at a time */}
      {totalPages > 1 && (
        <>
          <button
            onClick={() => scrollTo(((currentPage - 1 + totalPages) % totalPages) * 2)}
            className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-md border flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ borderColor: config.accentColor + "44" }}
          >
            <ChevronLeft size={15} style={{ color: config.accentColor }} />
          </button>
          <button
            onClick={() => scrollTo(((currentPage + 1) % totalPages) * 2)}
            className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-md border flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ borderColor: config.accentColor + "44" }}
          >
            <ChevronRight size={15} style={{ color: config.accentColor }} />
          </button>
        </>
      )}

      {/* Page dots — one per pair of products */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i * 2)}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{ backgroundColor: currentPage === i ? config.accentColor : config.accentColor + "44" }}
            />
          ))}
        </div>
      )}

      {/* Gate modal */}
      {gateProduct && !isPreview && (
        <LeadGateModal
          config={config}
          landingPageId={landingPageId}
          redirectTo={`/producto/${gateProduct.slug}`}
          onClose={() => setGateProduct(null)}
        />
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

export default function LandingPageView({ id, config, products, isPreview }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [showStoreGate, setShowStoreGate] = useState(false);
  const [alreadyLead, setAlreadyLead] = useState(() => {
    try { return !!sessionStorage.getItem(`lp_lead_${id}`); } catch { return false; }
  });

  // Inject custom head code (Meta Pixel, Calendly script, etc.)
  useEffect(() => {
    if (isPreview) return;
    if (!config.customHeadHtml) return;
    injectHtmlNodes(config.customHeadHtml, document.head);
  }, [config.customHeadHtml, isPreview]);

  // Inject custom body code
  useEffect(() => {
    if (isPreview) return;
    if (!config.customBodyHtml) return;
    const zone = document.getElementById("lp-custom-body");
    if (zone) injectHtmlNodes(config.customBodyHtml, zone);
  }, [config.customBodyHtml, isPreview]);

  function handleFormSuccess() {
    setSubmitted(true);
    setAlreadyLead(true);
  }

  const headingFont = "Cormorant Garamond, Georgia, serif";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: config.bgColor, fontFamily: "system-ui, sans-serif" }}
    >
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="text-center py-5 border-b" style={{ borderColor: config.accentColor + "33" }}>
        <span
          className="text-base tracking-[0.3em] uppercase font-medium"
          style={{ color: config.accentColor, fontFamily: headingFont }}
        >
          Lira de Luna
        </span>
      </header>

      <main className="flex-1">

        {/* ── 1. HERO ───────────────────────────────────────── */}
        <section
          className="relative px-5 py-16 md:py-24 text-center"
          style={{
            background: config.heroImage
              ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${config.heroImage}) center/cover no-repeat`
              : undefined,
          }}
        >
          <div className="max-w-2xl mx-auto">
            <h1
              className="text-4xl sm:text-5xl font-semibold leading-tight mb-4"
              style={{ fontFamily: headingFont, color: config.heroImage ? "#fff" : "#5C4A3E" }}
            >
              {config.headline}
            </h1>
            {config.subheadline && (
              <p
                className="text-lg sm:text-xl"
                style={{ color: config.heroImage ? "rgba(255,255,255,0.85)" : "#8E7A6B" }}
              >
                {config.subheadline}
              </p>
            )}
            <a
              href={config.showForm ? "#formulario" : "#productos"}
              className="inline-block mt-8 px-8 py-3.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: config.accentColor }}
            >
              {config.ctaLabel}
            </a>
          </div>
        </section>

        {config.showVideo && config.videoPosition === "after_hero" && <VideoBlock config={config} />}

        {/* ── 2. PRUEBA SOCIAL ──────────────────────────────── */}
        {config.showSocialProof && (
          <section className="py-12 px-5 text-center" style={{ backgroundColor: config.accentColor + "15" }}>
            <span
              className="text-6xl font-bold"
              style={{ color: config.accentColor, fontFamily: headingFont }}
            >
              {config.socialProofCount}
            </span>
            <p className="text-lg mt-1" style={{ color: "#8E7A6B" }}>{config.socialProofText}</p>
          </section>
        )}

        {/* Texto cuerpo — después de prueba social */}
        {config.bodyText && (
          <section className="px-5 py-10">
            <p
              className="text-base leading-relaxed max-w-2xl mx-auto text-center whitespace-pre-line"
              style={{ color: "#5C4A3E" }}
            >
              {config.bodyText}
            </p>
          </section>
        )}

        {config.showVideo && config.videoPosition === "after_social" && <VideoBlock config={config} />}

        {/* ── 3. PRODUCTOS (carrusel 2×slide) ───────────────── */}
        {config.showProducts && products.length > 0 && (
          <section id="productos" className="py-14 px-5">
            <div className="max-w-5xl mx-auto">
              <h2
                className="text-2xl font-semibold text-center mb-3"
                style={{ fontFamily: headingFont, color: "#5C4A3E" }}
              >
                Nuestras piezas
              </h2>
              {config.requireLeadBeforeStore && !alreadyLead && (
                <p className="text-xs text-center mb-8 max-w-sm mx-auto" style={{ color: "#8E7A6B" }}>
                  Deja tus datos más abajo para ver todos los detalles de cada pieza.
                </p>
              )}
              <div className="px-5">
                <ProductCarousel
                  products={products}
                  config={config}
                  landingPageId={id}
                  alreadyLead={alreadyLead}
                  isPreview={isPreview}
                />
              </div>
            </div>
          </section>
        )}

        {config.showVideo && config.videoPosition === "after_products" && <VideoBlock config={config} />}

        {/* ── 4. BENEFICIOS ─────────────────────────────────── */}
        {config.showFeatures && config.features.length > 0 && (
          <section className="py-14 px-5" style={{ backgroundColor: config.accentColor + "0a" }}>
            <div className="max-w-4xl mx-auto">
              <h2
                className="text-2xl font-semibold text-center mb-10"
                style={{ fontFamily: headingFont, color: "#5C4A3E" }}
              >
                ¿Por qué elegirnos?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {config.features.map((f, i) => (
                  <div
                    key={i}
                    className="text-center p-6 rounded-2xl border"
                    style={{ borderColor: config.accentColor + "33", backgroundColor: "rgba(255,255,255,0.7)" }}
                  >
                    <div
                      className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center text-lg"
                      style={{ backgroundColor: config.accentColor + "22" }}
                    >
                      ✦
                    </div>
                    <h3 className="font-semibold mb-1" style={{ color: "#5C4A3E", fontFamily: headingFont }}>
                      {f.title}
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: "#8E7A6B" }}>{f.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {config.showFeatures && config.featuresImage && (
          <section className="px-5 pb-10">
            <div className="max-w-4xl mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={config.featuresImage}
                alt=""
                className="w-full rounded-2xl object-cover shadow-md"
                style={{ maxHeight: "480px" }}
              />
            </div>
          </section>
        )}

        {config.showVideo && config.videoPosition === "after_benefits" && <VideoBlock config={config} />}

        {/* ── 5. FORMULARIO ─────────────────────────────────── */}
        {config.showForm && <section
          id="formulario"
          className="py-16 px-5"
          style={{ backgroundColor: config.accentColor + "0d" }}
        >
          <div className="max-w-md mx-auto">
            <h2
              className="text-3xl font-semibold text-center mb-2"
              style={{ fontFamily: headingFont, color: "#5C4A3E" }}
            >
              {config.formTitle}
            </h2>
            {config.formSubtitle && (
              <p className="text-sm text-center mb-8" style={{ color: "#8E7A6B" }}>
                {config.formSubtitle}
              </p>
            )}
            <div
              className="rounded-2xl p-6 sm:p-8 shadow-sm border"
              style={{ backgroundColor: "rgba(255,255,255,0.97)", borderColor: config.accentColor + "33" }}
            >
              {!submitted ? (
                <LeadForm config={config} landingPageId={id} onSuccess={handleFormSuccess} isPreview={isPreview} />
              ) : (
                <ThankYou config={config} />
              )}
            </div>
          </div>
        </section>}

      </main>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer
        className="text-center py-5 border-t text-xs"
        style={{ borderColor: config.accentColor + "22", color: "#8E7A6B" }}
      >
        © Lira de Luna ·{" "}
        <button
          onClick={() => {
            if (isPreview) return;
            if (config.requireLeadBeforeStore && !alreadyLead) {
              setShowStoreGate(true);
            } else {
              window.location.href = "/tienda";
            }
          }}
          className="underline hover:opacity-80"
        >
          Ir a la tienda
        </button>
      </footer>

      {/* Custom body code zone (Calendly widget div, etc.) */}
      <div id="lp-custom-body" />

      {/* Gate modal for footer */}
      {showStoreGate && !isPreview && (
        <LeadGateModal
          config={config}
          landingPageId={id}
          redirectTo="/tienda"
          subtitle="Déjanos tus datos para acceder a toda nuestra tienda."
          onClose={() => setShowStoreGate(false)}
        />
      )}
    </div>
  );
}
