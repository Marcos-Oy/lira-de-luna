import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { User, Package, Heart, MapPin } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import LogoutButton from "../LogoutButton";
import RemoveWishlistButton from "./RemoveWishlistButton";

export const metadata: Metadata = { title: "Mis favoritos — Lira de Luna" };

export default async function FavoritosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/cuenta/login");

  const wishlist = await prisma.wishlistItem.findMany({
    where: { userId: session.user.id },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          price: true,
          images: true,
          collection: { select: { name: true } },
        },
      },
    },
    orderBy: { addedAt: "desc" },
  });

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <div className="bg-brand-beige-light border-b border-brand-beige py-10">
          <div className="max-w-5xl mx-auto px-6">
            <h1 className="font-heading text-3xl text-brand-dark">Mi cuenta</h1>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Sidebar */}
            <aside className="space-y-1">
              {[
                { icon: Package, label: "Pedidos",     href: "/cuenta" },
                { icon: Heart,   label: "Favoritos",   href: "/cuenta/favoritos" },
                { icon: MapPin,  label: "Direcciones", href: "/cuenta/direcciones" },
                { icon: User,    label: "Perfil",      href: "/cuenta/perfil" },
              ].map(({ icon: Icon, label, href }, i) => (
                <Link
                  key={label}
                  href={href}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-xs tracking-[0.12em] uppercase transition-colors ${
                    i === 1
                      ? "bg-brand-beige text-brand-dark"
                      : "text-brand-taupe hover:text-brand-dark hover:bg-brand-beige-light"
                  }`}
                >
                  <Icon size={14} strokeWidth={1.5} />
                  {label}
                </Link>
              ))}
              <LogoutButton />
            </aside>

            {/* Content */}
            <div className="md:col-span-3">
              <h2 className="text-[11px] tracking-[0.2em] uppercase text-brand-dark mb-6">
                Mis favoritos
              </h2>

              {wishlist.length === 0 ? (
                <div className="border-t border-brand-beige pt-8 text-center py-16">
                  <Heart size={32} strokeWidth={1} className="text-brand-beige mx-auto mb-3" />
                  <p className="text-sm text-brand-taupe font-light">Aún no tienes productos favoritos.</p>
                  <Link
                    href="/tienda"
                    className="inline-block mt-5 bg-brand-sand hover:bg-brand-taupe text-white text-[10px] tracking-[0.25em] uppercase px-7 py-3 transition-colors"
                  >
                    Explorar tienda
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {wishlist.map(({ id: wishId, product }) => {
                    const images = product.images as string[];
                    return (
                      <div key={wishId} className="group relative bg-brand-cream">
                        <Link href={`/producto/${product.slug}`}>
                          <div className="relative aspect-square overflow-hidden bg-brand-beige-light">
                            <Image
                              src={images[0] ?? ""}
                              alt={product.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              sizes="(max-width: 640px) 50vw, 33vw"
                            />
                          </div>
                          <div className="p-3">
                            <p className="text-[9px] tracking-[0.15em] uppercase text-brand-taupe mb-0.5">
                              {product.collection.name}
                            </p>
                            <p className="text-xs text-brand-dark leading-snug mb-1">
                              {product.name}
                            </p>
                            <p className="font-heading text-sm text-brand-taupe">
                              ${product.price.toLocaleString("es-CL")} CLP
                            </p>
                          </div>
                        </Link>
                        <RemoveWishlistButton productId={product.id} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
