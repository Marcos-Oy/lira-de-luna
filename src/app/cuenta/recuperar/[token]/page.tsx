"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Lock, Check, Eye, EyeOff } from "lucide-react";
import { resetPassword } from "@/app/actions/auth";

export default function ResetPasswordPage() {
  const params   = useParams<{ token: string }>();
  const router   = useRouter();
  const [pw, setPw]         = useState("");
  const [show, setShow]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(false);
  const [error, setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await resetPassword(params.token, pw);
      if (res.error) { setError(res.error); return; }
      setDone(true);
      setTimeout(() => router.push("/cuenta/login"), 3000);
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
            {!done ? (
              <>
                <div className="text-center mb-10">
                  <h1 className="font-heading text-4xl text-brand-dark mb-2">Nueva contraseña</h1>
                  <p className="text-xs text-brand-taupe font-light">Elige una contraseña segura de al menos 8 caracteres.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] uppercase text-brand-taupe mb-1.5">
                      Nueva contraseña
                    </label>
                    <div className="relative">
                      <Lock size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-taupe" />
                      <input
                        type={show ? "text" : "password"}
                        required
                        minLength={8}
                        value={pw}
                        onChange={(e) => setPw(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        className="w-full bg-white border border-brand-beige text-brand-dark text-xs pl-9 pr-10 py-3 outline-none focus:border-brand-sand transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShow((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-taupe hover:text-brand-dark"
                      >
                        {show ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
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
                    {loading ? "Guardando..." : "Guardar contraseña"}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check size={24} strokeWidth={1.5} className="text-emerald-500" />
                </div>
                <h1 className="font-heading text-3xl text-brand-dark mb-3">¡Listo!</h1>
                <p className="text-xs text-brand-taupe font-light mb-6">
                  Tu contraseña fue actualizada. Serás redirigida al inicio de sesión en un momento.
                </p>
                <Link href="/cuenta/login" className="text-brand-sand text-xs underline">
                  Ir ahora
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
