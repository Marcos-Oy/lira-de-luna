"use client";

import { Heart } from "lucide-react";
import { toggleWishlist } from "@/app/actions/cuenta";
import { useTransition } from "react";

export default function RemoveWishlistButton({ productId }: { productId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => { void toggleWishlist(productId); })}
      disabled={pending}
      aria-label="Quitar de favoritos"
      className="absolute top-2 right-2 w-7 h-7 bg-white/80 flex items-center justify-center hover:bg-white transition-colors"
    >
      <Heart
        size={13}
        strokeWidth={1.5}
        className={pending ? "text-brand-beige" : "fill-brand-sand text-brand-sand"}
      />
    </button>
  );
}
