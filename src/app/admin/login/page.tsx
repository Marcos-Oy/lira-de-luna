"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    setLoading(false);

    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Error al iniciar sesión");
    }
  }

  return (
    <div className="min-h-screen bg-[#2A1F1A] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo / header */}
        <div className="text-center mb-10">
          <p className="font-heading text-3xl text-[#CDA78F] tracking-widest mb-1">Lira de Luna</p>
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#8E7A6B]">Panel de administración</p>
        </div>

        {/* Card */}
        <div className="bg-[#3D2E28] border border-[#5C4A3E] p-8">
          <div className="flex items-center gap-2 mb-6">
            <Shield size={14} strokeWidth={1.5} className="text-[#CDA78F]" />
            <h1 className="text-[11px] tracking-[0.2em] uppercase text-[#CDA78F]">Acceso seguro</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-[#8E7A6B] mb-1.5">
                Correo electrónico
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full bg-[#2A1F1A] border border-[#5C4A3E] text-[#EDE2D8] text-xs px-3 py-2.5 outline-none focus:border-[#CDA78F] transition-colors placeholder:text-[#5C4A3E]"
                placeholder="admin@liradeluna.cl"
              />
            </div>

            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-[#8E7A6B] mb-1.5">
                Contraseña
              </label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full bg-[#2A1F1A] border border-[#5C4A3E] text-[#EDE2D8] text-xs px-3 py-2.5 outline-none focus:border-[#CDA78F] transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#CDA78F] hover:bg-[#8E7A6B] disabled:opacity-50 text-white text-[10px] tracking-[0.25em] uppercase py-3 transition-colors mt-2"
            >
              {loading ? "Verificando..." : "Ingresar"}
            </button>
          </form>
        </div>

        <p className="text-center text-[9px] text-[#5C4A3E] mt-6 tracking-widest">
          SOLO PERSONAL AUTORIZADO
        </p>
      </div>
    </div>
  );
}
