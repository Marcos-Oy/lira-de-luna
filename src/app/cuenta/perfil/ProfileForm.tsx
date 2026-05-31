"use client";

import { useState } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { updateProfile, changePassword, deleteAccount } from "@/app/actions/cuenta";
import { logoutAction } from "@/app/actions/auth";
import { COUNTRIES } from "@/lib/countries";

const cls = "w-full bg-brand-cream border border-brand-beige text-brand-dark placeholder:text-brand-taupe text-xs px-3 py-3 outline-none focus:border-brand-sand transition-colors";

function PasswordInput({ id, value, onChange, placeholder }: {
  id: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={`${cls} pr-10`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-taupe hover:text-brand-dark"
      >
        {show ? <EyeOff size={13} strokeWidth={1.5} /> : <Eye size={13} strokeWidth={1.5} />}
      </button>
    </div>
  );
}

export default function ProfileForm({
  initialName,
  initialPhone,
  initialWhatsapp,
  initialCountry,
  email,
  hasPassword,
}: {
  initialName:     string;
  initialPhone:    string;
  initialWhatsapp: string;
  initialCountry:  string;
  email:           string;
  hasPassword:     boolean;
}) {
  // ── Datos personales ──────────────────────────────────────
  const [name,     setName]    = useState(initialName);
  const [phone,    setPhone]   = useState(initialPhone);
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp);
  const [country,  setCountry] = useState(initialCountry);
  const [saving, setSaving]     = useState(false);
  const [infoMsg, setInfoMsg]   = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Cambiar contraseña ────────────────────────────────────
  const [current, setCurrent]   = useState("");
  const [newPass, setNewPass]   = useState("");
  const [confirm, setConfirm]   = useState("");
  const [passSaving, setPassSaving] = useState(false);
  const [passMsg, setPassMsg]   = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Eliminar cuenta ───────────────────────────────────────
  const [deleteStep, setDeleteStep]   = useState<"idle" | "confirm">("idle");
  const [deletePass, setDeletePass]   = useState("");
  const [deleteOAuth, setDeleteOAuth] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleInfoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setInfoMsg(null);
    const result = await updateProfile({ name, phone, whatsappNumber: whatsapp, country });
    setSaving(false);
    setInfoMsg(result.error
      ? { type: "error", text: result.error }
      : { type: "success", text: "Perfil actualizado correctamente." }
    );
  }

  async function handleDeleteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDeleteError("");
    setDeleteSaving(true);
    const result = await deleteAccount(deletePass);
    setDeleteSaving(false);
    if (result.error) {
      setDeleteError(result.error);
    } else {
      await logoutAction();
    }
  }

  async function handlePassSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPassMsg(null);
    if (newPass !== confirm) {
      setPassMsg({ type: "error", text: "Las contraseñas no coinciden" });
      return;
    }
    setPassSaving(true);
    const result = await changePassword({ currentPassword: current, newPassword: newPass });
    setPassSaving(false);
    if (result.error) {
      setPassMsg({ type: "error", text: result.error });
    } else {
      setPassMsg({ type: "success", text: "Contraseña actualizada correctamente." });
      setCurrent(""); setNewPass(""); setConfirm("");
    }
  }

  return (
    <div className="space-y-10 max-w-md">

      {/* ── Datos personales ── */}
      <form onSubmit={handleInfoSubmit} className="space-y-5">
        <h3 className="text-[10px] tracking-[0.2em] uppercase text-brand-dark border-b border-brand-beige pb-2">
          Datos personales
        </h3>

        {/* Email — read only */}
        <div>
          <label className="block text-[10px] tracking-[0.18em] uppercase text-brand-taupe mb-2">
            Correo electrónico
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full bg-brand-beige-light border border-brand-beige text-brand-taupe text-xs px-3 py-3 outline-none cursor-not-allowed"
          />
          <p className="text-[10px] text-brand-taupe mt-1">El correo no se puede cambiar.</p>
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-[10px] tracking-[0.18em] uppercase text-brand-taupe mb-2">
            Nombre completo
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={cls}
            placeholder="Tu nombre"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-[10px] tracking-[0.18em] uppercase text-brand-taupe mb-2">
            Teléfono <span className="normal-case tracking-normal opacity-60">(opcional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={cls}
            placeholder="+56 9 1234 5678"
          />
        </div>

        {/* WhatsApp */}
        <div>
          <label htmlFor="whatsapp" className="block text-[10px] tracking-[0.18em] uppercase text-brand-taupe mb-2">
            WhatsApp <span className="normal-case tracking-normal opacity-60">(recuperación de contraseña)</span>
          </label>
          <input
            id="whatsapp"
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className={`${cls} font-mono`}
            placeholder="56912345678"
          />
          <p className="text-[10px] text-brand-taupe mt-1">
            Con código de país, sin espacios ni guiones.
          </p>
        </div>

        {/* País */}
        <div>
          <label htmlFor="country" className="block text-[10px] tracking-[0.18em] uppercase text-brand-taupe mb-2">
            País
          </label>
          <select
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={cls}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>

        {infoMsg && (
          <p className={`text-xs ${infoMsg.type === "success" ? "text-brand-sand" : "text-red-400"}`}>
            {infoMsg.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="bg-brand-sand hover:bg-brand-taupe disabled:opacity-60 text-white text-[10px] tracking-[0.2em] uppercase px-8 py-3 transition-colors"
        >
          {saving ? "Guardando…" : "Guardar datos"}
        </button>
      </form>

      {/* ── Cambiar contraseña ── */}
      {hasPassword && (
        <form onSubmit={handlePassSubmit} className="space-y-5">
          <h3 className="text-[10px] tracking-[0.2em] uppercase text-brand-dark border-b border-brand-beige pb-2">
            Cambiar contraseña
          </h3>

          <div>
            <label htmlFor="current-pass" className="block text-[10px] tracking-[0.18em] uppercase text-brand-taupe mb-2">
              Contraseña actual
            </label>
            <PasswordInput id="current-pass" value={current} onChange={setCurrent} placeholder="Tu contraseña actual" />
          </div>

          <div>
            <label htmlFor="new-pass" className="block text-[10px] tracking-[0.18em] uppercase text-brand-taupe mb-2">
              Nueva contraseña
            </label>
            <PasswordInput id="new-pass" value={newPass} onChange={setNewPass} placeholder="Mínimo 8 caracteres" />
          </div>

          <div>
            <label htmlFor="confirm-pass" className="block text-[10px] tracking-[0.18em] uppercase text-brand-taupe mb-2">
              Confirmar nueva contraseña
            </label>
            <PasswordInput id="confirm-pass" value={confirm} onChange={setConfirm} placeholder="Repite la nueva contraseña" />
          </div>

          {passMsg && (
            <p className={`text-xs ${passMsg.type === "success" ? "text-brand-sand" : "text-red-400"}`}>
              {passMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={passSaving}
            className="bg-brand-sand hover:bg-brand-taupe disabled:opacity-60 text-white text-[10px] tracking-[0.2em] uppercase px-8 py-3 transition-colors"
          >
            {passSaving ? "Guardando…" : "Cambiar contraseña"}
          </button>
        </form>
      )}

      {/* ── Eliminar cuenta ── */}
      <div className="border border-red-200 bg-white">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-red-100">
          <Trash2 size={14} strokeWidth={1.5} className="text-red-400" />
          <div>
            <h3 className="text-[10px] tracking-[0.2em] uppercase text-red-600 font-medium">Eliminar cuenta</h3>
            <p className="text-[10px] text-brand-taupe mt-0.5">Esta acción es permanente e irreversible</p>
          </div>
        </div>
        <div className="px-5 py-5">
          {deleteStep === "idle" ? (
            <div className="flex items-start gap-4">
              <p className="text-xs text-brand-taupe flex-1">
                Se eliminarán tu cuenta, historial de pedidos, favoritos y direcciones guardadas.
              </p>
              <button
                type="button"
                onClick={() => setDeleteStep("confirm")}
                className="shrink-0 text-[10px] tracking-[0.15em] uppercase px-4 py-2.5 border border-red-300 text-red-500 hover:bg-red-50 transition-colors"
              >
                Eliminar cuenta
              </button>
            </div>
          ) : (
            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              <p className="text-xs text-red-600 font-medium">
                {hasPassword
                  ? "Confirma tu contraseña para eliminar la cuenta definitivamente."
                  : "Confirma que deseas eliminar tu cuenta."}
              </p>
              {hasPassword && (
                <div>
                  <label htmlFor="delete-pass" className="block text-[10px] tracking-[0.18em] uppercase text-brand-taupe mb-2">
                    Contraseña actual
                  </label>
                  <PasswordInput id="delete-pass" value={deletePass} onChange={setDeletePass} placeholder="Tu contraseña" />
                </div>
              )}
              {!hasPassword && (
                <label className="flex items-center gap-2 cursor-pointer text-xs text-brand-taupe">
                  <input
                    type="checkbox"
                    checked={deleteOAuth}
                    onChange={(e) => setDeleteOAuth(e.target.checked)}
                    className="accent-red-500"
                  />
                  Entiendo que esta acción es irreversible
                </label>
              )}
              {deleteError && (
                <p className="text-xs text-red-500">{deleteError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setDeleteStep("idle"); setDeletePass(""); setDeleteOAuth(false); setDeleteError(""); }}
                  className="flex-1 border border-brand-beige text-[10px] tracking-[0.15em] uppercase text-brand-taupe py-3 hover:border-brand-sand transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={deleteSaving || (hasPassword ? !deletePass : !deleteOAuth)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white text-[10px] tracking-[0.15em] uppercase py-3 transition-colors disabled:opacity-50"
                >
                  {deleteSaving ? "Eliminando…" : "Confirmar eliminación"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

    </div>
  );
}
