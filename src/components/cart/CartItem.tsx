"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import type { Product } from "@/lib/mock-data";
import { useCart } from "@/context/CartContext";

export default function CartItem({
  product,
  quantity,
  size,
}: {
  product: Product;
  quantity: number;
  size?: string;
}) {
  const { updateQuantity, removeItem } = useCart();

  return (
    <div className="flex gap-5 py-7">
      {/* Image */}
      <Link
        href={`/producto/${product.slug}`}
        className="relative w-24 h-24 shrink-0 bg-brand-beige-light overflow-hidden"
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
          sizes="96px"
        />
      </Link>

      {/* Info */}
      <div className="flex-1 flex flex-col justify-between">
        <div className="flex justify-between gap-4">
          <div>
            <p className="text-[10px] tracking-[0.12em] uppercase text-brand-taupe mb-0.5">
              {product.collection}
            </p>
            <Link href={`/producto/${product.slug}`}>
              <h3 className="text-sm text-brand-dark hover:text-brand-sand transition-colors">
                {product.name}
              </h3>
            </Link>
            {size && size !== "Única" && (
              <p className="text-[10px] text-brand-taupe mt-0.5">Talla {size}</p>
            )}
            <p className="text-[10px] text-brand-taupe mt-1">
              {product.materials.join(" · ")}
            </p>
          </div>
          <button
            onClick={() => removeItem(product.id)}
            aria-label="Eliminar"
            className="text-brand-taupe hover:text-brand-dark transition-colors shrink-0 h-fit"
          >
            <X size={15} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex items-center justify-between mt-4">
          {/* Qty control */}
          <div className="flex items-center border border-brand-beige">
            <button
              onClick={() => updateQuantity(product.id, quantity - 1)}
              className="w-8 h-8 flex items-center justify-center text-brand-taupe hover:text-brand-dark transition-colors"
              aria-label="Quitar uno"
            >
              <Minus size={12} strokeWidth={1.5} />
            </button>
            <span className="w-8 text-center text-xs text-brand-dark">
              {quantity}
            </span>
            <button
              onClick={() => updateQuantity(product.id, quantity + 1)}
              className="w-8 h-8 flex items-center justify-center text-brand-taupe hover:text-brand-dark transition-colors"
              aria-label="Agregar uno"
            >
              <Plus size={12} strokeWidth={1.5} />
            </button>
          </div>

          {/* Price */}
          <p className="font-heading text-base text-brand-dark">
            ${(product.price * quantity).toLocaleString("es-CL")} CLP
          </p>
        </div>
      </div>
    </div>
  );
}
