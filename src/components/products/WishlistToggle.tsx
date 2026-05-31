"use client";

import { Heart } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleWishlist } from "@/app/actions/cuenta";

interface Props {
  productId: string;
  initialWished: boolean;
}

export default function WishlistToggle({ productId, initialWished }: Props) {
  const [wished, setWished] = useState(initialWished);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await toggleWishlist(productId);
      if ("error" in result && result.error === "No autenticado") {
        router.push("/cuenta/login");
        return;
      }
      if ("action" in result) {
        setWished(result.action === "added");
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      aria-label={wished ? "Quitar de favoritos" : "Agregar a favoritos"}
      className="absolute top-3 right-3 text-brand-taupe hover:text-brand-sand transition-colors disabled:opacity-50"
    >
      <Heart
        size={17}
        strokeWidth={1.5}
        className={wished ? "fill-brand-sand text-brand-sand" : ""}
      />
    </button>
  );
}
