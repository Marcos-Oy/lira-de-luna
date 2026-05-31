"use client";

import {
  Moon, Sun, Star, Heart, Sparkles, Leaf, Gift, Package, ShoppingBag,
  ShieldCheck, Shield, Lock, Truck, MapPin, Crown, Award, Trophy, Gem,
  Zap, Coffee, Feather, Wand2, Palette, CheckCircle2, Globe, Smile,
  Recycle, Scissors, Watch, type LucideIcon,
} from "lucide-react";
import { useSiteConfig } from "@/context/SiteConfigContext";

export const FEATURE_ICON_MAP: Record<string, LucideIcon> = {
  Moon, Sun, Star, Heart, Sparkles, Leaf, Gift, Package, ShoppingBag,
  ShieldCheck, Shield, Lock, Truck, MapPin, Crown, Award, Trophy, Gem,
  Zap, Coffee, Feather, Wand2, Palette, CheckCircle2, Globe, Smile,
  Recycle, Scissors, Watch,
};

export type FeatureItem = { icon: string; title: string; subtitle: string };

export function parseFeatureItems(value: string): FeatureItem[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed as FeatureItem[];
  } catch {}
  // Backward compat: old "Title | subtitle" text format
  const fallbackIcons = ["Moon", "Leaf", "Gift", "ShieldCheck"];
  return value.split("\n").filter(Boolean).map((line, i) => {
    const [title = "", subtitle = ""] = line.split("|").map((s) => s.trim());
    return { icon: fallbackIcons[i] ?? "Star", title, subtitle };
  });
}

export default function FeaturesStrip() {
  const { featuresStrip } = useSiteConfig();
  const features = parseFeatureItems(featuresStrip);

  return (
    <section className="bg-brand-cream border-y border-brand-beige py-8">
      <div className="max-w-7xl mx-auto px-6">
        <div
          className="grid gap-0 divide-x divide-brand-beige"
          style={{ gridTemplateColumns: `repeat(${features.length}, minmax(0, 1fr))` }}
        >
          {features.map((f, i) => {
            const Icon = FEATURE_ICON_MAP[f.icon] ?? Star;
            return (
              <div
                key={i}
                className="flex flex-col md:flex-row items-center gap-3 px-6 py-4 first:pl-0 last:pr-0"
              >
                <Icon size={22} strokeWidth={1.25} className="text-brand-sand shrink-0" />
                <div className="text-center md:text-left">
                  <p className="text-[11px] tracking-[0.15em] uppercase text-brand-dark font-medium">
                    {f.title}
                  </p>
                  <p className="text-[10px] tracking-wide text-brand-taupe mt-0.5">
                    {f.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
