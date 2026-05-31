"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const categories = ["Collares", "Aretes", "Anillos", "Pulseras"];
const materials = ["Plata .925", "Baño de oro 18k", "Piedra de luna", "Perla cultivada"];
const priceRanges = [
  { label: "Menos de $500", value: "0-500" },
  { label: "$500 – $700", value: "500-700" },
  { label: "$700 – $900", value: "700-900" },
  { label: "Más de $900", value: "900+" },
];

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-brand-beige pb-5 mb-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full mb-4"
      >
        <span className="text-[10px] tracking-[0.2em] uppercase text-brand-dark font-medium">
          {title}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={1.5}
          className={`text-brand-taupe transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && children}
    </div>
  );
}

export default function ProductFilters() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedPrice, setSelectedPrice] = useState<string>("");

  const toggle = (
    value: string,
    set: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    set((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] tracking-[0.2em] uppercase text-brand-dark font-medium">
          Filtros
        </h3>
        <button className="text-[9px] tracking-wide text-brand-taupe hover:text-brand-dark underline transition-colors">
          Limpiar
        </button>
      </div>

      <FilterSection title="Categoría">
        <div className="space-y-2.5">
          {categories.map((cat) => (
            <label key={cat} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedCategories.includes(cat)}
                onChange={() => toggle(cat, setSelectedCategories)}
                className="w-3.5 h-3.5 accent-brand-sand"
              />
              <span className="text-xs text-brand-taupe group-hover:text-brand-dark transition-colors">
                {cat}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Material">
        <div className="space-y-2.5">
          {materials.map((mat) => (
            <label key={mat} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedMaterials.includes(mat)}
                onChange={() => toggle(mat, setSelectedMaterials)}
                className="w-3.5 h-3.5 accent-brand-sand"
              />
              <span className="text-xs text-brand-taupe group-hover:text-brand-dark transition-colors">
                {mat}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Precio">
        <div className="space-y-2.5">
          {priceRanges.map((range) => (
            <label key={range.value} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="radio"
                name="price"
                value={range.value}
                checked={selectedPrice === range.value}
                onChange={() => setSelectedPrice(range.value)}
                className="w-3.5 h-3.5 accent-brand-sand"
              />
              <span className="text-xs text-brand-taupe group-hover:text-brand-dark transition-colors">
                {range.label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>
    </div>
  );
}
