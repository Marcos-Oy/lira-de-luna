"use client";

import Image from "next/image";
import { useState } from "react";
import { Heart, Truck, RefreshCcw, ShieldCheck } from "lucide-react";
import type { Product, ProductVariant } from "@/lib/mock-data";
import { getActiveSalePrice } from "@/lib/mock-data";
import { useCart } from "@/context/CartContext";

export default function ProductDetail({
  product,
  variants = [],
}: {
  product: Product;
  variants?: ProductVariant[];
}) {
  const [activeImage, setActiveImage] = useState(0);
  const [wished, setWished] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  const hasVariants = variants.length > 0;
  const selectedVariant = hasVariants ? variants.find((v) => v.label === selectedSize) : null;
  const variantStock = selectedVariant?.stock ?? 0;

  const isGlobalOutOfStock = !hasVariants && (product.stock === 0 || product.badge === "AGOTADO");
  const isVariantOutOfStock = hasVariants && selectedSize !== null && variantStock === 0;
  const outOfStock = isGlobalOutOfStock || isVariantOutOfStock;
  const needsSizeSelection = hasVariants && selectedSize === null;
  const canAddToCart = !outOfStock && !needsSizeSelection;

  const salePrice = isGlobalOutOfStock ? null : getActiveSalePrice(product);

  function handleAddToCart() {
    if (!canAddToCart) return;
    addItem(product, 1, selectedSize ?? undefined);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-square bg-brand-beige-light overflow-hidden">
            <Image
              src={product.images[activeImage] ?? product.image}
              alt={product.name}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            {isGlobalOutOfStock ? (
              <span className="absolute top-4 left-4 bg-[#5C4A3E] text-white text-[9px] tracking-[0.15em] uppercase px-3 py-1.5">
                Agotado
              </span>
            ) : salePrice ? (
              <span className="absolute top-4 left-4 bg-red-500 text-white text-[9px] tracking-[0.15em] uppercase px-3 py-1.5">
                Oferta
              </span>
            ) : product.badge ? (
              <span className="absolute top-4 left-4 bg-brand-beige text-brand-dark text-[9px] tracking-[0.15em] uppercase px-3 py-1.5">
                {product.badge}
              </span>
            ) : null}
          </div>

          {product.images.length > 1 && (
            <div className="flex gap-3 flex-wrap">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`relative w-20 h-20 overflow-hidden border-2 transition-colors ${
                    activeImage === i
                      ? "border-brand-sand"
                      : "border-transparent hover:border-brand-beige"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${product.name} vista ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <p className="text-[10px] tracking-[0.2em] uppercase text-brand-taupe mb-2">
            {product.collection}
          </p>
          <h1 className="font-heading text-4xl md:text-5xl text-brand-dark mb-3">
            {product.name}
          </h1>

          {salePrice ? (
            <div className="mb-6">
              <div className="flex items-baseline gap-3 flex-wrap">
                <p className="font-heading text-3xl text-red-500">
                  ${salePrice.toLocaleString("es-CL")} CLP
                </p>
                <p className="font-heading text-xl text-brand-taupe/50 line-through">
                  ${product.price.toLocaleString("es-CL")}
                </p>
              </div>
              {product.saleEndAt && (
                <p className="text-[11px] text-brand-taupe/70 tracking-wide mt-1">
                  Oferta válida hasta{" "}
                  {new Date(product.saleEndAt).toLocaleDateString("es-CL", {
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              )}
            </div>
          ) : (
            <p className="font-heading text-2xl text-brand-taupe mb-6">
              ${product.price.toLocaleString("es-CL")} CLP
            </p>
          )}

          <p className="text-sm text-brand-taupe font-light leading-relaxed mb-8">
            {product.description}
          </p>

          {/* Materials */}
          <div className="mb-6">
            <p className="text-[10px] tracking-[0.15em] uppercase text-brand-dark mb-2">
              Materiales
            </p>
            <div className="flex flex-wrap gap-2">
              {product.materials.map((mat) => (
                <span
                  key={mat}
                  className="text-[10px] tracking-wide bg-brand-beige-light text-brand-taupe px-3 py-1.5"
                >
                  {mat}
                </span>
              ))}
            </div>
          </div>

          {/* Size / variant selector */}
          <div className="mb-8">
            <p className="text-[10px] tracking-[0.15em] uppercase text-brand-dark mb-3">
              {hasVariants ? "Talla" : "Talla única"}
            </p>
            <div className="flex flex-wrap gap-2">
              {hasVariants ? (
                variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => v.stock > 0 && setSelectedSize(v.label)}
                    disabled={v.stock === 0}
                    title={v.stock === 0 ? "Sin stock" : `${v.stock} disponible${v.stock !== 1 ? "s" : ""}`}
                    className={`w-11 h-11 text-xs border transition-colors ${
                      v.stock === 0
                        ? "border-[#EDE2D8] text-[#D8BFAE] bg-[#FAF9F8] cursor-not-allowed line-through"
                        : selectedSize === v.label
                        ? "border-brand-sand bg-brand-sand text-white"
                        : "border-brand-beige text-brand-taupe hover:border-brand-sand hover:text-brand-dark"
                    }`}
                  >
                    {v.label}
                  </button>
                ))
              ) : (
                <button
                  onClick={() => setSelectedSize("Única")}
                  className={`w-11 h-11 text-xs border transition-colors ${
                    selectedSize === "Única"
                      ? "border-brand-sand bg-brand-sand text-white"
                      : "border-brand-beige text-brand-taupe hover:border-brand-sand hover:text-brand-dark"
                  }`}
                >
                  Única
                </button>
              )}
            </div>
          </div>

          {/* Stock / selection indicator */}
          {hasVariants ? (
            needsSizeSelection ? (
              <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-[#F7F4F1] border border-[#D8BFAE]">
                <span className="w-2 h-2 rounded-full bg-[#CDA78F] shrink-0" />
                <p className="text-xs text-[#8E7A6B] tracking-wide">
                  Selecciona una talla para continuar
                </p>
              </div>
            ) : isVariantOutOfStock ? (
              <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-[#EDE2D8] border border-[#D8BFAE]">
                <span className="w-2 h-2 rounded-full bg-[#C5B0A0] shrink-0" />
                <p className="text-xs text-[#8E7A6B] tracking-wide">
                  Talla {selectedSize}{" "}
                  <strong className="text-[#5C4A3E]">sin stock</strong> en este momento
                </p>
              </div>
            ) : variantStock <= 5 && variantStock > 0 ? (
              <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <p className="text-xs text-amber-700 tracking-wide">
                  ¡Solo quedan{" "}
                  <strong>{variantStock}</strong>{" "}
                  unidades en talla {selectedSize}!
                </p>
              </div>
            ) : null
          ) : isGlobalOutOfStock ? (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-[#EDE2D8] border border-[#D8BFAE]">
              <span className="w-2 h-2 rounded-full bg-[#C5B0A0] shrink-0" />
              <p className="text-xs text-[#8E7A6B] tracking-wide">
                Este producto está{" "}
                <strong className="text-[#5C4A3E]">sin stock</strong> en este momento.
              </p>
            </div>
          ) : typeof product.stock === "number" && product.stock <= 5 ? (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <p className="text-xs text-amber-700 tracking-wide">
                ¡Solo quedan <strong>{product.stock}</strong> unidades!
              </p>
            </div>
          ) : null}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <button
              onClick={handleAddToCart}
              disabled={!canAddToCart}
              className={`flex-1 text-[11px] tracking-[0.25em] uppercase py-4 transition-colors disabled:cursor-not-allowed ${
                outOfStock
                  ? "bg-[#D8BFAE] text-white/60"
                  : needsSizeSelection
                  ? "bg-[#D8BFAE] text-white/60"
                  : added
                  ? "bg-emerald-500 text-white"
                  : "bg-brand-sand hover:bg-brand-taupe text-white"
              }`}
            >
              {outOfStock
                ? "Sin stock"
                : needsSizeSelection
                ? "Selecciona una talla"
                : added
                ? "¡Añadido!"
                : "Añadir al carrito"}
            </button>
            <button
              onClick={() => setWished((w) => !w)}
              aria-label="Agregar a favoritos"
              className="w-14 h-14 border border-brand-beige hover:border-brand-sand flex items-center justify-center transition-colors shrink-0"
            >
              <Heart
                size={18}
                strokeWidth={1.5}
                className={wished ? "fill-brand-sand text-brand-sand" : "text-brand-taupe"}
              />
            </button>
          </div>

          {/* Policies */}
          <div className="border-t border-brand-beige pt-6 space-y-4">
            {[
              { icon: Truck,      text: "Envío gratis en pedidos mayores a $999 CLP" },
              { icon: RefreshCcw, text: "Cambios y devoluciones en 15 días" },
              { icon: ShieldCheck, text: "Pago 100% seguro — datos protegidos" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <Icon size={16} strokeWidth={1.25} className="text-brand-sand shrink-0" />
                <span className="text-xs text-brand-taupe font-light">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
