"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/lib/mock-data";
import { getActiveSalePrice } from "@/lib/mock-data";
import { useCart } from "@/context/CartContext";
import WishlistToggle from "./WishlistToggle";

export default function ProductCard({ product, isWished = false }: { product: Product; isWished?: boolean }) {
  const [added, setAdded]   = useState(false);
  const { addItem } = useCart();

  // stock === 0 → agotado; undefined → disponible (sin control activado)
  const outOfStock = product.stock === 0 || product.badge === "AGOTADO";
  const salePrice = outOfStock ? null : getActiveSalePrice(product);

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    if (outOfStock) return;
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <article className={`group bg-brand-cream ${outOfStock ? "opacity-80" : ""}`}>
      {/* Image container */}
      <Link href={`/producto/${product.slug}`} className="block relative overflow-hidden aspect-square">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className={`object-cover transition-transform duration-500 ${outOfStock ? "" : "group-hover:scale-105"}`}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {/* Badge */}
        {outOfStock ? (
          <span className="absolute top-3 left-3 bg-[#5C4A3E] text-white text-[9px] tracking-[0.15em] uppercase px-2.5 py-1">
            Agotado
          </span>
        ) : salePrice ? (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-[9px] tracking-[0.15em] uppercase px-2.5 py-1">
            Oferta
          </span>
        ) : product.badge === "NUEVO" || product.isNew ? (
          <span className="absolute top-3 left-3 bg-brand-beige text-brand-dark text-[9px] tracking-[0.15em] uppercase px-2.5 py-1">
            Nuevo
          </span>
        ) : null}

        {/* Wishlist */}
        <WishlistToggle productId={product.id} initialWished={isWished} />

        {/* Quick add / sin stock — aparece en hover */}
        {outOfStock ? (
          <div className="absolute bottom-0 left-0 right-0 bg-[#5C4A3E]/80 text-white/60 text-[9px] tracking-[0.2em] uppercase py-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 cursor-not-allowed">
            Sin stock
          </div>
        ) : (
          <button
            onClick={handleAdd}
            aria-label="Añadir al carrito"
            className="absolute bottom-0 left-0 right-0 bg-brand-dark/80 text-white text-[9px] tracking-[0.2em] uppercase py-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
          >
            <ShoppingBag size={11} strokeWidth={1.5} />
            {added ? "¡Añadido!" : "Añadir al carrito"}
          </button>
        )}
      </Link>

      {/* Info */}
      <div className="pt-3 pb-4 px-1">
        <Link href={`/producto/${product.slug}`}>
          <p className="text-[10px] tracking-[0.12em] uppercase text-brand-taupe mb-1">
            {product.collection}
          </p>
          <h3 className="font-heading text-base text-brand-dark leading-snug group-hover:text-brand-sand transition-colors">
            {product.name}
          </h3>
          {salePrice ? (
            <div className="flex items-baseline gap-2 mt-1 flex-wrap">
              <p className="font-heading text-sm text-red-500">
                ${salePrice.toLocaleString("es-CL")} CLP
              </p>
              <p className="font-heading text-xs text-brand-taupe/50 line-through">
                ${product.price.toLocaleString("es-CL")}
              </p>
            </div>
          ) : (
            <p className={`font-heading text-sm mt-1 ${outOfStock ? "text-brand-taupe/50 line-through" : "text-brand-taupe"}`}>
              ${product.price.toLocaleString("es-CL")} CLP
            </p>
          )}
          {outOfStock && (
            <p className="text-[10px] tracking-[0.1em] uppercase text-[#8E7A6B]/70 mt-0.5">
              Sin stock
            </p>
          )}
        </Link>
      </div>
    </article>
  );
}
