"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email:    formData.get("email")    as string,
      password: formData.get("password") as string,
      redirect: false,
    });

    if (!result || result.error) {
      setError("Correo o contraseña incorrectos.");
      setIsPending(false);
      return;
    }

    // Full reload garantiza que el servidor lea la cookie recién seteada
    window.location.href = "/cuenta";
  }

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1 bg-brand-cream">
        <div className="min-h-[80vh] flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-sm">

            <div className="text-center mb-10">
              <h1 className="font-heading text-4xl text-brand-dark mb-2">Bienvenida</h1>
              <p className="text-xs text-brand-taupe font-light">
                Accede a tu cuenta para ver tus pedidos y favoritos.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-brand-taupe mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-taupe" />
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="tu@correo.com"
                    className="w-full bg-white border border-brand-beige text-brand-dark text-xs pl-9 pr-3 py-3 outline-none focus:border-brand-sand transition-colors placeholder:text-brand-beige"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] tracking-[0.15em] uppercase text-brand-taupe">
                    Contraseña
                  </label>
                  <a href="/cuenta/recuperar" className="text-[10px] text-brand-sand hover:underline">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <div className="relative">
                  <Lock size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-taupe" />
                  <input
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="w-full bg-white border border-brand-beige text-brand-dark text-xs pl-9 pr-3 py-3 outline-none focus:border-brand-sand transition-colors"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-brand-sand hover:bg-brand-taupe text-white text-[10px] tracking-[0.25em] uppercase py-3.5 transition-colors disabled:opacity-50"
              >
                {isPending ? "Ingresando..." : "Ingresar"}
              </button>
            </form>

            <p className="text-center text-xs text-brand-taupe mt-8 font-light">
              ¿Aún no tienes cuenta?{" "}
              <Link href="/cuenta/registro" className="text-brand-sand hover:underline">
                Créala aquí
              </Link>
            </p>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
