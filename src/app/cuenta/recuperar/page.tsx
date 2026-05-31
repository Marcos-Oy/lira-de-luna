"use client";

import { useState } from "react";
import Link from "next/link";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Mail, Check, MessageCircle } from "lucide-react";
import { requestPasswordReset } from "@/app/actions/auth";

export default function RecuperarPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [waLink, setWaLink]   = useState<string | null>(null);
  const [error, setError]     = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await requestPasswordReset(email);
      setSent(true);
      setWaLink("waLink" in res ? (res.waLink ?? null) : null);
    } catch {
      setError("Ocurrió un error. Intenta de nuevo.");
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

            {!sent ? (
              <>
                <div className="text-center mb-10">
                  <h1 className="font-heading text-4xl text-brand-dark mb-2">¿Olvidaste tu contraseña?</h1>
                  <p className="text-xs text-brand-taupe font-light leading-relaxed">
                    Escribe tu correo y te enviaremos un enlace para restablecerla.
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
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@correo.com"
                        className="w-full bg-white border border-brand-beige text-brand-dark text-xs pl-9 pr-3 py-3 outline-none focus:border-brand-sand transition-colors placeholder:text-brand-beige"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-sand hover:bg-brand-taupe text-white text-[10px] tracking-[0.25em] uppercase py-3.5 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Enviando..." : "Enviar enlace"}
                  </button>
                </form>

                <p className="text-center text-xs text-brand-taupe mt-8 font-light">
                  <Link href="/cuenta/login" className="text-brand-sand hover:underline">
                    ← Volver al inicio de sesión
                  </Link>
                </p>
              </>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check size={24} strokeWidth={1.5} className="text-emerald-500" />
                </div>
                <h1 className="font-heading text-3xl text-brand-dark mb-3">Correo enviado</h1>
                <p className="text-xs text-brand-taupe font-light leading-relaxed mb-8">
                  Si existe una cuenta con <strong>{email}</strong>, recibirás un enlace para restablecer tu contraseña.
                  Revisa también tu carpeta de spam.
                </p>

                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full border border-emerald-400 text-emerald-600 hover:bg-emerald-50 text-[10px] tracking-[0.2em] uppercase py-3 transition-colors mb-4"
                  >
                    <MessageCircle size={14} strokeWidth={1.5} />
                    También enviar por WhatsApp
                  </a>
                )}

                <Link
                  href="/cuenta/login"
                  className="text-[10px] tracking-[0.15em] uppercase text-brand-taupe hover:text-brand-dark transition-colors underline underline-offset-4"
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
