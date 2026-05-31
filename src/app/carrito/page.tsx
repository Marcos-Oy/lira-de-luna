"use client";

import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CartItem from "@/components/cart/CartItem";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/context/CartContext";

export default function CarritoPage() {
  const { items, subtotal, clearCart } = useCart();
  const router  = useRouter();
  const envio   = subtotal >= 30000 ? 0 : 5990;
  const total   = subtotal + envio;
  const [subscribe, setSubscribe] = useState(true);

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <h1 className="font-heading text-4xl text-brand-dark mb-10">
            Tu carrito
          </h1>

          {items.length === 0 ? (
            <div className="text-center py-24">
              <p className="font-heading text-3xl text-brand-dark mb-3">
                Tu carrito está vacío
              </p>
              <p className="text-sm text-brand-taupe font-light mb-8">
                Explora nuestra tienda y encuentra tu pieza especial.
              </p>
              <Link
                href="/tienda"
                className="inline-block bg-brand-sand hover:bg-brand-taupe text-white text-[11px] tracking-[0.25em] uppercase px-8 py-3.5 transition-colors"
              >
                Ir a la tienda
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Items list */}
              <div className="lg:col-span-2 space-y-0 divide-y divide-brand-beige border-t border-brand-beige">
                {items.map((item) => (
                  <CartItem
                    key={`${item.product.id}-${item.size ?? ""}`}
                    product={item.product}
                    quantity={item.quantity}
                    size={item.size}
                  />
                ))}
                <div className="pt-4">
                  <button
                    onClick={clearCart}
                    className="text-[10px] tracking-[0.15em] uppercase text-brand-taupe hover:text-red-400 transition-colors underline underline-offset-4"
                  >
                    Vaciar carrito
                  </button>
                </div>
              </div>

              {/* Order summary */}
              <div className="lg:col-span-1">
                <div className="bg-brand-beige-light p-8 sticky top-24">
                  <h2 className="font-heading text-xl text-brand-dark mb-6">
                    Resumen del pedido
                  </h2>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between">
                      <span className="text-xs text-brand-taupe tracking-wide">
                        Subtotal
                      </span>
                      <span className="text-xs text-brand-dark font-medium">
                        ${subtotal.toLocaleString("es-CL")} CLP
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-brand-taupe tracking-wide">
                        Envío
                      </span>
                      <span className="text-xs text-brand-dark font-medium">
                        {envio === 0 ? (
                          <span className="text-brand-sand">Gratis</span>
                        ) : (
                          `$${envio.toLocaleString("es-CL")} CLP`
                        )}
                      </span>
                    </div>
                    {envio > 0 && (
                      <p className="text-[10px] text-brand-taupe leading-relaxed">
                        Agrega ${(30000 - subtotal).toLocaleString("es-CL")} CLP
                        más para envío gratis.
                      </p>
                    )}
                  </div>

                  <div className="border-t border-brand-beige pt-4 mb-7">
                    <div className="flex justify-between">
                      <span className="text-[11px] tracking-[0.15em] uppercase text-brand-dark font-medium">
                        Total
                      </span>
                      <span className="font-heading text-xl text-brand-dark">
                        ${total.toLocaleString("es-CL")} CLP
                      </span>
                    </div>
                  </div>

                  {/* Coupon */}
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Código de descuento"
                      className="flex-1 bg-brand-cream border border-brand-beige text-brand-dark placeholder:text-brand-taupe text-xs px-3 py-2.5 outline-none focus:border-brand-sand transition-colors"
                    />
                    <button className="border border-brand-beige text-brand-taupe text-[10px] tracking-[0.15em] uppercase px-4 hover:border-brand-sand hover:text-brand-dark transition-colors">
                      Aplicar
                    </button>
                  </div>

                  {/* Newsletter checkbox (guests) */}
                  <label className="flex items-start gap-2.5 cursor-pointer mb-5">
                    <input
                      type="checkbox"
                      checked={subscribe}
                      onChange={(e) => setSubscribe(e.target.checked)}
                      className="mt-0.5 w-3.5 h-3.5 accent-brand-sand shrink-0"
                    />
                    <span className="text-[10px] text-brand-taupe leading-relaxed">
                      Suscribirme a novedades, ofertas y lanzamientos
                    </span>
                  </label>

                  <button
                    onClick={() => router.push("/checkout")}
                    className="w-full bg-brand-sand hover:bg-brand-taupe text-white text-[11px] tracking-[0.25em] uppercase py-4 transition-colors"
                  >
                    Proceder al pago
                  </button>

                  <Link
                    href="/tienda"
                    className="block text-center text-[10px] tracking-[0.15em] uppercase text-brand-taupe hover:text-brand-dark transition-colors mt-4 underline underline-offset-4"
                  >
                    Continuar comprando
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
