"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Scale, Hash, ShoppingBag, ChevronDown, ChevronUp } from "lucide-react";
import { useCart } from "@/context/CartContext";

type Tier = { id: string; minQuantity: number; pricePerUnit: number };
type WeightProduct = { metalType: string; pricePerGram: number; minGrams: number; stock: number };

type Product = {
  id: string; slug: string; name: string; price: number;
  description: string | null; images: unknown; materials: unknown;
  saleType: string;
  collection: { name: string };
  wholesaleTiers: Tier[];
  weightProduct: WeightProduct | null;
};

const METAL_LABELS: Record<string, string> = {
  ORO_18K: "Oro 18k", ORO_14K: "Oro 14k", ORO_10K: "Oro 10k",
  PLATA_925: "Plata .925", PLATA_800: "Plata .800",
  ORO_BLANCO_18K: "Oro blanco 18k", ORO_ROSA_18K: "Oro rosado 18k",
};

function getFirstImage(images: unknown): string {
  if (Array.isArray(images) && typeof images[0] === "string") return images[0];
  return "";
}

function WholesaleCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(product.wholesaleTiers[0]?.minQuantity ?? 1);
  const [added, setAdded] = useState(false);

  const tiers = product.wholesaleTiers;
  const applicableTier = [...tiers].reverse().find((t) => qty >= t.minQuantity) ?? tiers[0];
  const unitPrice = applicableTier?.pricePerUnit ?? product.price;
  const total = unitPrice * qty;
  const img = getFirstImage(product.images);

  function handleAdd() {
    const mats = Array.isArray(product.materials) ? (product.materials as string[]) : [];
    addItem({ id: product.id, slug: product.slug, name: product.name, price: unitPrice, image: img, images: img ? [img] : [], collection: product.collection.name, collectionSlug: product.slug, description: product.description ?? "", materials: mats }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="bg-[#F7F4F1] border border-[#D8BFAE]">
      {/* Image */}
      <div className="relative aspect-square bg-[#EDE2D8] overflow-hidden">
        {img && <Image src={img} alt={product.name} fill className="object-cover hover:scale-105 transition-transform duration-500" sizes="(max-width:768px) 100vw, 33vw" />}
        <span className="absolute top-3 left-3 bg-blue-600 text-white text-[8px] tracking-[0.15em] uppercase px-2 py-1 flex items-center gap-1">
          <Hash size={8} /> Por cantidad
        </span>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <p className="text-[10px] tracking-[0.15em] uppercase text-[#CDA78F]">{product.collection.name}</p>
          <h3 className="font-heading text-lg text-[#5C4A3E] mt-0.5">{product.name}</h3>
          {product.description && <p className="text-xs text-[#8E7A6B] mt-1 leading-relaxed line-clamp-2">{product.description}</p>}
        </div>

        {/* Tiers */}
        <div className="space-y-1.5">
          <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Precio por volumen</p>
          <div className="divide-y divide-[#EDE2D8]">
            {tiers.map((tier, i) => {
              const nextMin = tiers[i + 1]?.minQuantity;
              const isActive = qty >= tier.minQuantity && (!nextMin || qty < nextMin);
              return (
                <div key={tier.id} className={`flex items-center justify-between py-1.5 px-2 transition-colors ${isActive ? "bg-blue-50" : ""}`}>
                  <span className="text-xs text-[#5C4A3E]">
                    {nextMin ? `${tier.minQuantity} – ${nextMin - 1} uds.` : `${tier.minQuantity}+ uds.`}
                  </span>
                  <span className={`text-xs font-medium ${isActive ? "text-blue-600" : "text-[#8E7A6B]"}`}>
                    ${tier.pricePerUnit.toLocaleString("es-CL")} c/u
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quantity input */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-[#D8BFAE]">
              <button onClick={() => setQty((q) => Math.max(tiers[0]?.minQuantity ?? 1, q - 1))} className="w-8 h-8 flex items-center justify-center text-[#8E7A6B] hover:bg-[#EDE2D8] transition-colors text-sm">−</button>
              <input type="number" value={qty} onChange={(e) => setQty(Math.max(tiers[0]?.minQuantity ?? 1, parseInt(e.target.value) || 1))} className="w-16 h-8 text-center text-xs text-[#5C4A3E] outline-none bg-transparent" />
              <button onClick={() => setQty((q) => q + 1)} className="w-8 h-8 flex items-center justify-center text-[#8E7A6B] hover:bg-[#EDE2D8] transition-colors text-sm">+</button>
            </div>
            <div className="text-right flex-1">
              <p className="text-xs text-[#8E7A6B]">Total estimado</p>
              <p className="text-sm font-heading text-[#5C4A3E]">${total.toLocaleString("es-CL")} CLP</p>
            </div>
          </div>
          {tiers[0] && qty < tiers[0].minQuantity && (
            <p className="text-[10px] text-amber-600">Mínimo {tiers[0].minQuantity} unidades</p>
          )}
        </div>

        <button onClick={handleAdd} className={`w-full flex items-center justify-center gap-2 text-[10px] tracking-[0.2em] uppercase py-3 transition-colors ${added ? "bg-emerald-500 text-white" : "bg-[#3D2E28] hover:bg-[#5C4A3E] text-[#EDE2D8]"}`}>
          <ShoppingBag size={14} strokeWidth={1.5} />
          {added ? "¡Añadido!" : "Agregar al carrito"}
        </button>
      </div>
    </div>
  );
}

function WeightCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const wt = product.weightProduct!;
  const [grams, setGrams] = useState(wt.minGrams);
  const [added, setAdded] = useState(false);
  const img = getFirstImage(product.images);
  const total = Math.round(wt.pricePerGram * grams);

  function handleAdd() {
    const mats = Array.isArray(product.materials) ? (product.materials as string[]) : [];
    addItem({ id: product.id, slug: product.slug, name: `${product.name} (${grams}g)`, price: total, image: img, images: img ? [img] : [], collection: product.collection.name, collectionSlug: product.slug, description: product.description ?? "", materials: mats }, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="bg-[#F7F4F1] border border-[#D8BFAE]">
      <div className="relative aspect-square bg-[#EDE2D8] overflow-hidden">
        {img && <Image src={img} alt={product.name} fill className="object-cover hover:scale-105 transition-transform duration-500" sizes="(max-width:768px) 100vw, 33vw" />}
        <span className="absolute top-3 left-3 bg-purple-600 text-white text-[8px] tracking-[0.15em] uppercase px-2 py-1 flex items-center gap-1">
          <Scale size={8} /> Por peso
        </span>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <p className="text-[10px] tracking-[0.15em] uppercase text-[#CDA78F]">{product.collection.name}</p>
          <h3 className="font-heading text-lg text-[#5C4A3E] mt-0.5">{product.name}</h3>
          {product.description && <p className="text-xs text-[#8E7A6B] mt-1 leading-relaxed line-clamp-2">{product.description}</p>}
        </div>

        {/* Specs */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Metal", value: METAL_LABELS[wt.metalType] ?? wt.metalType },
            { label: "Precio/gramo", value: `$${wt.pricePerGram.toLocaleString("es-CL")} CLP` },
            { label: "Mínimo", value: `${wt.minGrams} g` },
            { label: "Stock disponible", value: `${wt.stock} g` },
          ].map((s) => (
            <div key={s.label} className="bg-[#EDE2D8]/60 px-3 py-2">
              <p className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">{s.label}</p>
              <p className="text-xs text-[#5C4A3E] font-medium mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Gram input + calculator */}
        <div className="space-y-2">
          <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Cantidad en gramos</label>
          <div className="flex items-center gap-3">
            <input
              type="number" step="0.1"
              value={grams}
              onChange={(e) => setGrams(Math.max(wt.minGrams, parseFloat(e.target.value) || wt.minGrams))}
              className="w-28 border border-[#D8BFAE] bg-white px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
            />
            <span className="text-xs text-[#8E7A6B]">gramos</span>
            <div className="text-right flex-1">
              <p className="text-xs text-[#8E7A6B]">Total estimado</p>
              <p className="text-sm font-heading text-[#5C4A3E]">${total.toLocaleString("es-CL")} CLP</p>
            </div>
          </div>
          {grams < wt.minGrams && (
            <p className="text-[10px] text-amber-600">Mínimo {wt.minGrams} g</p>
          )}
          {grams > wt.stock && (
            <p className="text-[10px] text-red-500">Stock máximo disponible: {wt.stock} g</p>
          )}
        </div>

        <button onClick={handleAdd} disabled={grams > wt.stock} className={`w-full flex items-center justify-center gap-2 text-[10px] tracking-[0.2em] uppercase py-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${added ? "bg-emerald-500 text-white" : "bg-[#3D2E28] hover:bg-[#5C4A3E] text-[#EDE2D8]"}`}>
          <ShoppingBag size={14} strokeWidth={1.5} />
          {added ? "¡Añadido!" : "Agregar al carrito"}
        </button>
      </div>
    </div>
  );
}

export default function MayoristaClient({ products }: { products: Product[] }) {
  const [activeTab, setActiveTab] = useState<"todos" | "WHOLESALE" | "WEIGHT">("todos");

  const wholesale = products.filter((p) => p.saleType === "WHOLESALE");
  const byWeight = products.filter((p) => p.saleType === "WEIGHT");

  const shown = useMemo(() => {
    if (activeTab === "WHOLESALE") return wholesale;
    if (activeTab === "WEIGHT") return byWeight;
    return products;
  }, [activeTab, products, wholesale, byWeight]);

  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-brand-taupe">No hay productos mayoristas disponibles por el momento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: "todos", label: `Todos (${products.length})` },
          { key: "WHOLESALE", label: `Por cantidad (${wholesale.length})`, icon: Hash },
          { key: "WEIGHT", label: `Por peso (${byWeight.length})`, icon: Scale },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase px-5 py-2.5 transition-colors ${activeTab === key ? "bg-[#3D2E28] text-[#EDE2D8]" : "border border-[#D8BFAE] text-[#8E7A6B] bg-[#F7F4F1] hover:border-[#5C4A3E] hover:text-[#5C4A3E]"}`}
          >
            {Icon && <Icon size={11} />}{label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {shown.map((p) =>
          p.saleType === "WHOLESALE"
            ? <WholesaleCard key={p.id} product={p} />
            : <WeightCard key={p.id} product={p} />
        )}
      </div>

      {/* Contact CTA */}
      <div className="mt-12 bg-[#3D2E28] px-8 py-10 text-center">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#CDA78F] mb-2">¿Necesitas ayuda?</p>
        <h3 className="font-heading text-2xl text-[#EDE2D8] tracking-widest uppercase mb-3">
          Cotización personalizada
        </h3>
        <p className="text-sm text-white/55 max-w-md mx-auto mb-6">
          Para pedidos grandes, envíos internacionales o precios especiales, escríbenos directamente.
        </p>
        <a href="mailto:hola@liradeluna.cl" className="inline-block bg-[#CDA78F] hover:bg-[#EDE2D8] hover:text-[#3D2E28] text-white text-[10px] tracking-[0.25em] uppercase px-10 py-3.5 transition-colors">
          Solicitar cotización
        </a>
      </div>
    </div>
  );
}
