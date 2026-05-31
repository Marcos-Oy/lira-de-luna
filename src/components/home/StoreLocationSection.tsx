"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import type { StoreLocation } from "@/types/personalization";

interface Props {
  locations: StoreLocation[];
  mapsApiKey: string | null;
}

export default function StoreLocationSection({ locations, mapsApiKey }: Props) {
  const [activeId, setActiveId] = useState(locations[0]?.id ?? "");

  if (locations.length === 0) return null;

  const active = locations.find((l) => l.id === activeId) ?? locations[0];

  function buildEmbedUrl(address: string) {
    if (mapsApiKey) {
      return `https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${encodeURIComponent(address)}&language=es`;
    }
    return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed&hl=es`;
  }

  function buildMapsUrl(address: string) {
    return `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
  }

  return (
    <section className="bg-[#EDE2D8] py-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-10">
          <p className="text-[9px] tracking-[0.25em] uppercase text-[#CDA78F] mb-2">Visítanos</p>
          <h2 className="font-cormorant text-3xl text-[#5C4A3E]">¿Dónde estamos?</h2>
        </div>

        {/* Location tabs — only shown when multiple */}
        {locations.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => setActiveId(loc.id)}
                className={`px-5 py-2 text-[10px] tracking-[0.15em] uppercase border transition-colors ${
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

        {/* Content: address + map */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Address card */}
          <div className="bg-[#F7F4F1] p-8 flex flex-col gap-4">
            {locations.length > 1 && (
              <p className="text-[9px] tracking-[0.2em] uppercase text-[#CDA78F]">{active.name}</p>
            )}
            <div className="flex items-start gap-3">
              <MapPin size={16} strokeWidth={1.5} className="text-[#CDA78F] mt-0.5 shrink-0" />
              <p className="text-sm text-[#5C4A3E] leading-relaxed font-light whitespace-pre-line">
                {active.address}
              </p>
            </div>
            <a
              href={buildMapsUrl(active.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.18em] uppercase text-[#CDA78F] hover:text-[#8E7A6B] transition-colors mt-2 self-start border-b border-[#CDA78F]/40 hover:border-[#8E7A6B]/40 pb-0.5"
            >
              Abrir en Google Maps
            </a>
          </div>

          {/* Map iframe */}
          <div className="w-full aspect-[4/3] overflow-hidden shadow-sm">
            <iframe
              key={active.id}
              src={buildEmbedUrl(active.address)}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Mapa — ${active.name}`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
