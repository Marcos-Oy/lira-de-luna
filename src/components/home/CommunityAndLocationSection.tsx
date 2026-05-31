"use client";

import { useState, useTransition } from "react";
import { MapPin, Check } from "lucide-react";
import type { StoreLocation } from "@/types/personalization";
import { subscribeNewsletter } from "@/app/actions/newsletter";

function googleMapsUrlToEmbed(url: string): string | null {
  if (url.includes("/maps/embed")) return url;
  const m = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (m) return `https://maps.google.com/maps?q=${m[1]},${m[2]}&output=embed&hl=es`;
  return null;
}

interface Props {
  locations: StoreLocation[];
  mapsApiKey: string | null;
}

export default function CommunityAndLocationSection({ locations, mapsApiKey }: Props) {
  const [activeId, setActiveId] = useState(locations[0]?.id ?? "");
  const hasLocations = locations.length > 0;
  const active = locations.find((l) => l.id === activeId) ?? locations[0];

  const [email, setEmail]       = useState("");
  const [nlState, setNlState]   = useState<"idle" | "ok" | "error">("idle");
  const [isPending, startTrans] = useTransition();

  function handleSubscribe() {
    if (!email.trim() || !email.includes("@")) { setNlState("error"); return; }
    startTrans(async () => {
      const res = await subscribeNewsletter({ email: email.trim(), source: "homepage" });
      setNlState("error" in res ? "error" : "ok");
      if (!("error" in res)) setEmail("");
    });
  }

  function buildEmbedUrl(loc: { address: string; mapUrl?: string }) {
    if (loc.mapUrl) {
      const converted = googleMapsUrlToEmbed(loc.mapUrl);
      if (converted) return converted;
    }
    if (mapsApiKey) {
      return `https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${encodeURIComponent(loc.address)}&language=es`;
    }
    return `https://maps.google.com/maps?q=${encodeURIComponent(loc.address)}&output=embed&hl=es`;
  }

  function buildMapsUrl(loc: { address: string; mapUrl?: string }) {
    return loc.mapUrl ?? `https://www.google.com/maps/search/${encodeURIComponent(loc.address)}`;
  }

  return (
    <section className="bg-brand-beige py-20">
      <div
        className={
          hasLocations
            ? "max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
            : "max-w-lg mx-auto px-6 text-center"
        }
      >
        {/* ── Newsletter ──────────────────────────────────── */}
        <div>
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
          {nlState === "ok" ? (
            <div className="flex items-center gap-2 max-w-sm py-3.5 px-4 bg-brand-cream border border-brand-beige text-xs text-brand-dark">
              <Check size={13} strokeWidth={2} className="text-brand-sand shrink-0" />
              ¡Listo! Ya estás en nuestra comunidad.
            </div>
          ) : (
            <>
              <div className="flex gap-0 max-w-sm">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setNlState("idle"); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
                  placeholder="Tu correo electrónico"
                  className={`flex-1 bg-brand-cream border border-r-0 text-brand-dark placeholder:text-brand-taupe text-xs px-4 py-3.5 outline-none transition-colors ${nlState === "error" ? "border-red-300 focus:border-red-400" : "border-brand-beige focus:border-brand-sand"}`}
                />
                <button
                  onClick={handleSubscribe}
                  disabled={isPending}
                  className="bg-brand-sand hover:bg-brand-taupe text-white text-[10px] tracking-[0.2em] uppercase px-6 py-3.5 transition-colors whitespace-nowrap disabled:opacity-60"
                >
                  {isPending ? "..." : "Suscribirme"}
                </button>
              </div>
              {nlState === "error" && (
                <p className="text-[10px] text-red-400 mt-1.5">Ingresa un correo válido.</p>
              )}
            </>
          )}
          <p className="text-[10px] text-brand-taupe mt-4 opacity-70">
            Sin spam. Solo belleza e intención.
          </p>
        </div>

        {/* ── Ubicación ───────────────────────────────────── */}
        {hasLocations && active && (
          <div>
            <p className="text-[9px] tracking-[0.25em] uppercase text-[#CDA78F] mb-1">
              Visítanos
            </p>
            <h3 className="font-cormorant text-2xl text-[#5C4A3E] mb-6">
              ¿Dónde estamos?
            </h3>

            {/* Tabs — solo si hay varias sucursales */}
            {locations.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => setActiveId(loc.id)}
                    className={`px-4 py-1.5 text-[10px] tracking-[0.15em] uppercase border transition-colors ${
                      loc.id === active.id
                        ? "bg-[#CDA78F] border-[#CDA78F] text-white"
                        : "bg-transparent border-[#CDA78F]/50 text-[#8E7A6B] hover:border-[#CDA78F] hover:text-[#5C4A3E]"
                    }`}
                  >
                    {loc.name}
                  </button>
                ))}
              </div>
            )}

            {/* Mapa */}
            <div className="w-full aspect-[4/3] overflow-hidden shadow-sm mb-4">
              <iframe
                key={active.id}
                src={buildEmbedUrl(active)}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Mapa — ${active.name}`}
              />
            </div>

            {/* Dirección */}
            <div className="flex items-start gap-2.5">
              <MapPin size={14} strokeWidth={1.5} className="text-[#CDA78F] mt-0.5 shrink-0" />
              <div>
                {locations.length > 1 && (
                  <p className="text-[9px] tracking-[0.15em] uppercase text-[#CDA78F] mb-0.5">
                    {active.name}
                  </p>
                )}
                <p className="text-sm text-[#5C4A3E] leading-relaxed font-light whitespace-pre-line">
                  {active.address}
                </p>
                <a
                  href={buildMapsUrl(active)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.18em] uppercase text-[#CDA78F] hover:text-[#8E7A6B] transition-colors mt-2 border-b border-[#CDA78F]/40 hover:border-[#8E7A6B]/40 pb-0.5"
                >
                  Abrir en Google Maps
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
