"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { User, Mail, Lock, Phone } from "lucide-react";
import { registerAction } from "@/app/actions/auth";

export default function RegistroPage() {
  const router = useRouter();
  const [loading,      setLoading]      = useState(false);
  const [fieldErrors,  setFieldErrors]  = useState<Record<string, string[]>>({});
  const [globalError,  setGlobalError]  = useState("");
  const [subscribe,    setSubscribe]    = useState(true);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setGlobalError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await registerAction({
        name:                formData.get("name") as string,
        email:               formData.get("email") as string,
        password:            formData.get("password") as string,
        phone:               formData.get("phone") as string,
        subscribeNewsletter: subscribe,
      });

      // Si llegamos aquí sin redirect hubo error
      if (result?.fieldErrors) setFieldErrors(result.fieldErrors);
      else if (result?.error) setGlobalError(result.error);
    } catch {
      // signIn redirige con NEXT_REDIRECT, lo capturamos como éxito
      router.push("/cuenta");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1 bg-brand-cream">
        <div className="min-h-[80vh] flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-sm">

            <div className="text-center mb-10">
              <h1 className="font-heading text-4xl text-brand-dark mb-2">Crea tu cuenta</h1>
              <p className="text-xs text-brand-taupe font-light">
                Únete y disfruta de seguimiento de pedidos, favoritos y más.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-brand-taupe mb-1.5">
                  Nombre completo
                </label>
                <div className="relative">
                  <User size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-taupe" />
                  <input
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Tu nombre"
                    className="w-full bg-white border border-brand-beige text-brand-dark text-xs pl-9 pr-3 py-3 outline-none focus:border-brand-sand transition-colors placeholder:text-brand-beige"
                  />
                </div>
                {fieldErrors.name && <p className="text-[10px] text-red-500 mt-1">{fieldErrors.name[0]}</p>}
              </div>

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
                {fieldErrors.email && <p className="text-[10px] text-red-500 mt-1">{fieldErrors.email[0]}</p>}
              </div>

              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-brand-taupe mb-1.5">
                  Teléfono <span className="text-brand-beige normal-case tracking-normal">(opcional, para WhatsApp)</span>
                </label>
                <div className="relative">
                  <Phone size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-taupe" />
                  <input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+56 9 1234 5678"
                    className="w-full bg-white border border-brand-beige text-brand-dark text-xs pl-9 pr-3 py-3 outline-none focus:border-brand-sand transition-colors placeholder:text-brand-beige"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-brand-taupe mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-taupe" />
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    className="w-full bg-white border border-brand-beige text-brand-dark text-xs pl-9 pr-3 py-3 outline-none focus:border-brand-sand transition-colors placeholder:text-brand-beige"
                  />
                </div>
                {fieldErrors.password && <p className="text-[10px] text-red-500 mt-1">{fieldErrors.password[0]}</p>}
              </div>

              {/* Newsletter subscription checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={subscribe}
                  onChange={(e) => setSubscribe(e.target.checked)}
                  className="mt-0.5 w-3.5 h-3.5 accent-brand-sand shrink-0"
                />
                <span className="text-xs text-brand-taupe leading-relaxed">
                  Suscribirme a novedades, ofertas y lanzamientos especiales
                </span>
              </label>

              {globalError && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2">{globalError}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-sand hover:bg-brand-taupe text-white text-[10px] tracking-[0.25em] uppercase py-3.5 transition-colors disabled:opacity-50"
              >
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </button>
            </form>

            <p className="text-center text-xs text-brand-taupe mt-8 font-light">
              ¿Ya tienes cuenta?{" "}
              <Link href="/cuenta/login" className="text-brand-sand hover:underline">
                Inicia sesión
              </Link>
            </p>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
