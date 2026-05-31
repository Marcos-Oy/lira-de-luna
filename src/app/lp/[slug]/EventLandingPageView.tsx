"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar, MapPin, Globe, Users, Link2,
  Loader2, Ticket, ChevronRight, ChevronLeft,
} from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { registerForEvent, type RegisterEventInput } from "@/app/actions/public/registerEvent";
import { createEventCheckout } from "@/app/actions/payment";
import { sanitizeHtml } from "@/lib/sanitize";
import type { EventConfig } from "@/lib/crm";

interface Props {
  id:     string;
  slug:   string;
  config: EventConfig;
  registrationCount: number;
}

type PaymentMethod = "transfer" | "mercadoPago" | "flowPay";

function fmtEventDate(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function fmtDateRange(startStr: string, endStr: string) {
  const start = new Date(startStr + "T12:00:00");
  const end   = new Date(endStr   + "T12:00:00");
  const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  const startPart = sameMonth
    ? start.toLocaleDateString("es-CL", { day: "numeric" })
    : start.toLocaleDateString("es-CL", { day: "numeric", month: "long" });
  const endPart = end.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
  return `${startPart} al ${endPart}`;
}

function embedUrl(url: string): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return url;
}

function getMapEmbedUrl(locationText: string, locationUrl?: string): string | null {
  if (locationUrl) {
    try {
      const u = new URL(locationUrl);
      const q = u.searchParams.get("q");
      if (q) return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
      const placeMatch = u.pathname.match(/\/maps\/place\/([^/@]+)/);
      if (placeMatch) {
        const place = decodeURIComponent(placeMatch[1]).replace(/\+/g, " ");
        return `https://maps.google.com/maps?q=${encodeURIComponent(place)}&output=embed`;
      }
    } catch {}
  }
  if (locationText) return `https://maps.google.com/maps?q=${encodeURIComponent(locationText)}&output=embed`;
  return null;
}

const METHOD_LABELS: Record<string, string> = {
  transfer:    "Transferencia bancaria",
  mercadoPago: "MercadoPago",
  flowPay:     "Flow Pay",
};

function GalleryCarousel({ images, accent }: { images: string[]; accent: string }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: images.length > 1 });
  const [current, setCurrent] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrent(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  if (images.length === 1) {
    return (
      <div className="max-w-2xl mx-auto px-4 mb-8">
        <img src={images[0]} alt="" className="w-full object-cover" style={{ maxHeight: 400 }} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 mb-8">
      <div className="relative overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {images.map((url, i) => (
            <div key={i} className="flex-none w-full">
              <img src={url} alt="" className="w-full aspect-video object-cover" />
            </div>
          ))}
        </div>
        <button
          onClick={() => emblaApi?.scrollPrev()}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
          aria-label="Anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => emblaApi?.scrollNext()}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
          aria-label="Siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="flex justify-center gap-1.5 mt-3">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            className="w-2 h-2 rounded-full transition-colors"
            style={{ backgroundColor: i === current ? accent : "#D8BFAE" }}
            aria-label={`Imagen ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function EventLandingPageView({ id, slug, config: cfg, registrationCount }: Props) {
  const router = useRouter();
  const [isPending, start] = useTransition();

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [phone, setPhone]       = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>(
    cfg.enabledPayments[0] as PaymentMethod ?? "transfer"
  );
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [error, setError] = useState("");

  const accent = cfg.accentColor || "#CDA78F";
  const bg     = cfg.bgColor     || "#F7F4F1";
  const isFull = cfg.eventCapacity > 0 && registrationCount >= cfg.eventCapacity;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (cfg.collectName  && !name.trim())  { setError("Por favor ingresa tu nombre.");  return; }
    if (cfg.requireEmail && !email.trim()) { setError("El email es requerido.");         return; }
    if (cfg.requirePhone && !phone.trim()) { setError("El teléfono es requerido.");      return; }
    if (cfg.ticketMode === "PAID_BY_DAY" && selectedDays.length === 0) {
      setError("Selecciona al menos un día para continuar."); return;
    }

    const input: RegisterEventInput = {
      landingPageId: id,
      name:          name.trim(),
      email:         email.trim(),
      phone:         phone.trim() || undefined,
      whatsapp:      whatsapp.trim() || undefined,
      paymentMethod: (cfg.ticketMode === "PAID" || cfg.ticketMode === "PAID_BY_DAY") ? payMethod : undefined,
      selectedDays:  cfg.ticketMode === "PAID_BY_DAY" ? selectedDays : undefined,
    };

    start(async () => {
      const res = await registerForEvent(input);
      if ("error" in res && res.error) { setError(res.error); return; }
      if ("success" in res && res.success) {
        // Redirigir a pasarela si el pago es por gateway
        if (
          res.paymentStatus === "PENDING_GATEWAY" &&
          (payMethod === "mercadoPago" || payMethod === "flowPay")
        ) {
          const pay = await createEventCheckout(res.ticketCode, payMethod);
          if ("error" in pay) { setError(pay.error!); return; }
          window.location.href = pay.checkoutUrl!;
          return;
        }
        router.push(`/lp/${slug}/ticket/${res.ticketCode}`);
      }
    });
  }

  const videoEmbed = cfg.showVideo && cfg.videoUrl ? embedUrl(cfg.videoUrl) : null;
  const mapEmbedUrl = cfg.eventType !== "ONLINE"
    ? getMapEmbedUrl(cfg.eventLocation, cfg.eventLocationUrl || undefined)
    : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: bg }}>
      {cfg.customHeadHtml && (
        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(cfg.customHeadHtml) }} />
      )}

      {/* Hero */}
      <div
        className="relative"
        style={{ backgroundColor: accent, minHeight: 320 }}
      >
        {cfg.heroImage && (
          <img
            src={cfg.heroImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/50" />
        <div className="relative z-10 px-5 py-12 max-w-2xl mx-auto text-white text-center">
          {cfg.headline && (
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-3" style={{ fontFamily: "Georgia, serif" }}>
              {cfg.headline}
            </h1>
          )}
          {cfg.subheadline && (
            <p className="text-lg opacity-90 mb-6">{cfg.subheadline}</p>
          )}
          {/* Quick date pill */}
          {cfg.eventDate && (
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 text-sm">
              <Calendar size={14} />
              <span>
                {cfg.eventEndDate
                  ? fmtDateRange(cfg.eventDate, cfg.eventEndDate)
                  : fmtEventDate(cfg.eventDate)}
              </span>
              {!cfg.eventEndDate && cfg.eventTime && <><span className="opacity-60">·</span><span>{cfg.eventTime}</span></>}
            </div>
          )}
        </div>
      </div>

      {/* Event info card */}
      <div className="max-w-2xl mx-auto px-4 -mt-6 mb-6">
        <div className="bg-white shadow-md p-5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date */}
            {cfg.eventDate && (
              <div className="flex items-center gap-2 text-sm" style={{ color: accent }}>
                <Calendar size={16} strokeWidth={1.5} />
                <span className="font-medium">
                  {cfg.eventEndDate
                    ? fmtDateRange(cfg.eventDate, cfg.eventEndDate)
                    : fmtEventDate(cfg.eventDate)}
                </span>
                {!cfg.eventEndDate && cfg.eventTime && (
                  <span className="text-[#8E7A6B]">
                    {cfg.eventTime}{cfg.eventEndTime && ` — ${cfg.eventEndTime}`}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Location */}
          {cfg.eventLocation && (
            <div className="flex items-start gap-2 text-sm text-[#5C4A3E]">
              <MapPin size={16} strokeWidth={1.5} className="shrink-0 mt-0.5" style={{ color: accent }} />
              <div>
                <span>{cfg.eventLocation}</span>
                {cfg.eventLocationUrl && (
                  <a
                    href={cfg.eventLocationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs underline mt-0.5"
                    style={{ color: accent }}
                  >
                    Ver en mapa / acceder al enlace →
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Type + capacity */}
          <div className="flex items-center gap-4 text-xs text-[#8E7A6B] border-t pt-3">
            <span className="flex items-center gap-1.5">
              <Globe size={13} strokeWidth={1.5} />
              {cfg.eventType === "IN_PERSON" ? "Presencial" : cfg.eventType === "ONLINE" ? "Online" : "Híbrido"}
            </span>
            {cfg.eventCapacity > 0 && (
              <span className="flex items-center gap-1.5">
                <Users size={13} strokeWidth={1.5} />
                {isFull ? "Evento completo" : `${cfg.eventCapacity - registrationCount} cupos disponibles`}
              </span>
            )}
            <span className="flex items-center gap-1.5 font-medium" style={{ color: accent }}>
              <Ticket size={13} strokeWidth={1.5} />
              {cfg.ticketMode === "FREE"
                ? "Entrada gratuita"
                : cfg.ticketMode === "PAID_BY_DAY"
                ? cfg.dayTickets.length > 0
                  ? `Desde $${Math.min(...cfg.dayTickets.map((d) => d.price)).toLocaleString("es-CL")} CLP`
                  : "Precio por día"
                : `$${cfg.ticketPrice.toLocaleString("es-CL")} CLP`}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic sections — rendered in sectionOrder */}
      {(cfg.sectionOrder ?? ["video", "description", "community", "map", "features", "gallery", "socialProof"]).map((key) => {
        switch (key) {
          case "video":
            return videoEmbed ? (
              <div key="video" className="max-w-2xl mx-auto px-4 mb-8">
                {cfg.videoTitle && <h3 className="text-lg font-semibold text-[#5C4A3E] mb-3" style={{ fontFamily: "Georgia, serif" }}>{cfg.videoTitle}</h3>}
                <div className={`relative overflow-hidden ${cfg.videoOrientation === "vertical" ? "aspect-[9/16] max-w-xs mx-auto" : "aspect-video"}`}>
                  <iframe src={videoEmbed} allow="autoplay; fullscreen" allowFullScreen className="absolute inset-0 w-full h-full" />
                </div>
                {cfg.videoCaption && <p className="text-xs text-[#8E7A6B] mt-2 text-center">{cfg.videoCaption}</p>}
              </div>
            ) : null;

          case "description":
            return cfg.bodyText ? (
              <div key="description" className="max-w-2xl mx-auto px-4 mb-8">
                <div
                  className="event-prose text-[#5C4A3E] leading-relaxed text-sm"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(cfg.bodyText) }}
                />
              </div>
            ) : null;

          case "community":
            return cfg.showWhatsappButton && cfg.whatsappAccess === "always" && cfg.whatsappUrl ? (
              <div key="community" className="max-w-2xl mx-auto px-4 mb-6">
                <a
                  href={cfg.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 text-white font-medium transition-opacity hover:opacity-90"
                  style={{ backgroundColor: accent }}
                >
                  <Link2 size={18} />
                  {cfg.whatsappButtonLabel || "Unirse a la comunidad"}
                </a>
              </div>
            ) : null;

          case "map":
            return mapEmbedUrl ? (
              <div key="map" className="max-w-2xl mx-auto px-4 mb-6">
                <iframe
                  src={mapEmbedUrl}
                  width="100%"
                  height="220"
                  style={{ border: 0, display: "block" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicación del evento"
                />
              </div>
            ) : null;

          case "features":
            return cfg.showFeatures && cfg.features.filter((f) => f.title).length > 0 ? (
              <div key="features" className="max-w-2xl mx-auto px-4 mb-8">
                <div className="grid sm:grid-cols-2 gap-3">
                  {cfg.features.filter((f) => f.title).map((f, i) => (
                    <div key={i} className="bg-white p-4 border-l-2" style={{ borderColor: accent }}>
                      <p className="text-sm font-semibold mb-1" style={{ color: accent, fontFamily: "Georgia, serif" }}>{f.title}</p>
                      <p className="text-xs text-[#8E7A6B] leading-relaxed">{f.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null;

          case "gallery": {
            const imgs = cfg.gallery.filter(Boolean);
            return imgs.length > 0
              ? <GalleryCarousel key="gallery" images={imgs} accent={accent} />
              : null;
          }

          case "socialProof":
            return cfg.showSocialProof ? (
              <div key="socialProof" className="max-w-2xl mx-auto px-4 mb-8 text-center">
                <p className="text-2xl font-bold" style={{ color: accent }}>{cfg.socialProofCount}</p>
                <p className="text-sm text-[#8E7A6B]">{cfg.socialProofText}</p>
              </div>
            ) : null;

          default:
            return null;
        }
      })}

      {/* Registration form */}
      <div className="max-w-2xl mx-auto px-4 pb-12" id="registro">
        <div className="bg-white shadow-md p-6">
          {isFull ? (
            <div className="text-center py-8">
              <p className="text-lg font-semibold text-[#5C4A3E]" style={{ fontFamily: "Georgia, serif" }}>
                Evento completo
              </p>
              <p className="text-sm text-[#8E7A6B] mt-2">No quedan cupos disponibles.</p>
            </div>
          ) : (
            <>
              {cfg.formTitle && (
                <h2 className="text-xl font-bold text-[#5C4A3E] mb-1" style={{ fontFamily: "Georgia, serif", color: accent }}>
                  {cfg.formTitle}
                </h2>
              )}
              {cfg.formSubtitle && (
                <p className="text-sm text-[#8E7A6B] mb-5">{cfg.formSubtitle}</p>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                {cfg.collectName && (
                  <div>
                    <label className="text-xs text-[#8E7A6B] block mb-1">Nombre completo *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full border border-[#D8BFAE] px-3 py-2.5 text-sm text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                      style={{ focusBorderColor: accent } as never}
                    />
                  </div>
                )}
                {cfg.collectEmail && (
                  <div>
                    <label className="text-xs text-[#8E7A6B] block mb-1">
                      Email {cfg.requireEmail && "*"}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required={cfg.requireEmail}
                      className="w-full border border-[#D8BFAE] px-3 py-2.5 text-sm text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                    />
                  </div>
                )}
                {cfg.collectPhone && (
                  <div>
                    <label className="text-xs text-[#8E7A6B] block mb-1">
                      Teléfono {cfg.requirePhone && "*"}
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required={cfg.requirePhone}
                      className="w-full border border-[#D8BFAE] px-3 py-2.5 text-sm text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                    />
                  </div>
                )}
                {cfg.collectWhatsapp && (
                  <div>
                    <label className="text-xs text-[#8E7A6B] block mb-1">Teléfono / WhatsApp</label>
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="+56 9 1234 5678"
                      className="w-full border border-[#D8BFAE] px-3 py-2.5 text-sm text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                    />
                  </div>
                )}

                {/* Day selector for PAID_BY_DAY */}
                {cfg.ticketMode === "PAID_BY_DAY" && cfg.dayTickets.length > 0 && (
                  <div>
                    <label className="text-xs text-[#8E7A6B] block mb-2">
                      Selecciona los días que asistirás *
                    </label>
                    <div className="space-y-2">
                      {cfg.dayTickets.map((day) => {
                        const checked = selectedDays.includes(day.date);
                        return (
                          <label
                            key={day.date}
                            className="flex items-center justify-between gap-3 cursor-pointer border px-3 py-2.5 transition-colors"
                            style={{ borderColor: checked ? accent : "#D8BFAE", backgroundColor: checked ? `${accent}10` : "white" }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 border-2 flex items-center justify-center shrink-0 transition-colors"
                                style={{ borderColor: checked ? accent : "#D8BFAE", backgroundColor: checked ? accent : "white" }}
                              >
                                {checked && (
                                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                                    <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </div>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => setSelectedDays(
                                  e.target.checked
                                    ? [...selectedDays, day.date]
                                    : selectedDays.filter((d) => d !== day.date)
                                )}
                                className="sr-only"
                              />
                              <span className="text-sm text-[#5C4A3E]">{day.label || day.date}</span>
                            </div>
                            <span className="text-sm font-semibold shrink-0" style={{ color: accent }}>
                              ${day.price.toLocaleString("es-CL")} CLP
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    {selectedDays.length > 0 && (
                      <div className="mt-3 flex items-center justify-between border-t border-[#EDE2D8] pt-3">
                        <span className="text-sm text-[#8E7A6B]">
                          {cfg.ticketName} ({selectedDays.length} día{selectedDays.length > 1 ? "s" : ""})
                        </span>
                        <span className="text-lg font-bold" style={{ color: accent }}>
                          ${cfg.dayTickets
                            .filter((d) => selectedDays.includes(d.date))
                            .reduce((sum, d) => sum + d.price, 0)
                            .toLocaleString("es-CL")} CLP
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment method selector */}
                {(cfg.ticketMode === "PAID" || (cfg.ticketMode === "PAID_BY_DAY" && selectedDays.length > 0)) && cfg.enabledPayments.length > 0 && (
                  <div>
                    <label className="text-xs text-[#8E7A6B] block mb-2">Método de pago *</label>
                    <div className="space-y-2">
                      {cfg.enabledPayments.map((m) => (
                        <label key={m} className="flex items-center gap-3 cursor-pointer group">
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                              payMethod === m ? "border-[#CDA78F]" : "border-[#D8BFAE]"
                            }`}
                            style={{ borderColor: payMethod === m ? accent : undefined }}
                          >
                            {payMethod === m && (
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
                            )}
                          </div>
                          <input
                            type="radio"
                            name="payMethod"
                            value={m}
                            checked={payMethod === m}
                            onChange={() => setPayMethod(m as PaymentMethod)}
                            className="sr-only"
                          />
                          <span className="text-sm text-[#5C4A3E]">{METHOD_LABELS[m] ?? m}</span>
                        </label>
                      ))}
                    </div>

                    {/* Price summary (only for PAID mode — PAID_BY_DAY shows it above) */}
                    {cfg.ticketMode === "PAID" && (
                      <div className="mt-3 flex items-center justify-between border-t border-[#EDE2D8] pt-3">
                        <span className="text-sm text-[#8E7A6B]">{cfg.ticketName}</span>
                        <span className="text-lg font-bold" style={{ color: accent }}>
                          ${cfg.ticketPrice.toLocaleString("es-CL")} CLP
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3.5 text-white font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: accent }}
                >
                  {isPending ? (
                    <><Loader2 size={16} className="animate-spin" /><span>Procesando…</span></>
                  ) : (
                    <>{cfg.ctaLabel || "Reservar entrada"}<ChevronRight size={16} /></>
                  )}
                </button>

                <p className="text-[10px] text-[#8E7A6B] text-center">
                  Recibirás tu entrada con código único al completar el registro.
                </p>
              </form>
            </>
          )}
        </div>
      </div>

      {cfg.customBodyHtml && (
        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(cfg.customBodyHtml) }} />
      )}
    </div>
  );
}
