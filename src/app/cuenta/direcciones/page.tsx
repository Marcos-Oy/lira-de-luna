import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { User, Package, Heart, MapPin } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import LogoutButton from "../LogoutButton";
import AddressManager from "./AddressManager";

export const metadata: Metadata = { title: "Mis direcciones — Lira de Luna" };

export default async function DireccionesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/cuenta/login");

  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { id: "asc" }],
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
                    i === 2
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
                Mis direcciones
              </h2>
              <AddressManager addresses={addresses} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
