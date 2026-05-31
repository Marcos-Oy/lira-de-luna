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
import ProfileForm from "./ProfileForm";

export const metadata: Metadata = { title: "Mi perfil — Lira de Luna" };

export default async function PerfilPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/cuenta/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, whatsappNumber: true, country: true, passwordHash: true, createdAt: true },
  });

  if (!user) redirect("/cuenta/login");

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <div className="bg-brand-beige-light border-b border-brand-beige py-10">
          <div className="max-w-5xl mx-auto px-6 flex items-center gap-5">
            <div className="w-14 h-14 rounded-full bg-brand-sand flex items-center justify-center text-white font-heading text-xl">
              {(user.name?.[0] ?? user.email[0]).toUpperCase()}
            </div>
            <div>
              <h1 className="font-heading text-3xl text-brand-dark">{user.name ?? "Mi cuenta"}</h1>
              <p className="text-xs text-brand-taupe mt-0.5">{user.email}</p>
            </div>
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
                    i === 3
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
                Mi perfil
              </h2>
              <ProfileForm
                initialName={user.name ?? ""}
                initialPhone={user.phone ?? ""}
                initialWhatsapp={user.whatsappNumber ?? ""}
                initialCountry={user.country ?? "CL"}
                email={user.email}
                hasPassword={!!user.passwordHash}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
