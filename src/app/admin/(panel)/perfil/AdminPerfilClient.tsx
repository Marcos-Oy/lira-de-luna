"use client";

import { useState, useTransition } from "react";
import { Check, Eye, EyeOff, User, Lock, Trash2 } from "lucide-react";
import { updateSelfAdminProfile, changeAdminPassword, deleteSelfAdminAccount } from "@/app/actions/admin/adminUsers";
import { adminLogoutAction } from "@/app/actions/admin/auth";

interface Props {
  adminName: string;
  adminEmail: string;
  adminRole: string;
  whatsappNumber: string | null;
}

const cls = "w-full bg-[#EDE2D8] border border-[#D8BFAE] text-[#5C4A3E] text-xs px-3 py-2.5 outline-none focus:border-[#CDA78F] transition-colors";
const row = "grid grid-cols-3 gap-4 items-center";
const label = "text-xs text-[#8E7A6B]";

function SaveButton({ pending, saved, label: text }: { pending: boolean; saved: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={`flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase px-5 py-2.5 transition-colors disabled:opacity-50 ${
        saved ? "bg-emerald-500 text-white" : "bg-[#CDA78F] hover:bg-[#8E7A6B] text-white"
      }`}
    >
      {saved && <Check size={12} strokeWidth={2} />}
      {pending ? "Guardando…" : saved ? "Guardado" : (text ?? "Guardar")}
    </button>
  );
}

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
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E7A6B] hover:text-[#5C4A3E]"
      >
        {show ? <EyeOff size={13} strokeWidth={1.5} /> : <Eye size={13} strokeWidth={1.5} />}
      </button>
    </div>
  );
}

function SectionCard({ icon: Icon, title, subtitle, children }: {
  icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-[#F7F4F1] border border-[#D8BFAE]">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#D8BFAE]">
        <Icon size={15} strokeWidth={1.5} className="text-[#CDA78F]" />
        <div>
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">{title}</h2>
          {subtitle && <p className="text-[10px] text-[#8E7A6B] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

export default function AdminPerfilClient({ adminName, adminEmail, adminRole, whatsappNumber }: Props) {
  // ── Datos personales ──────────────────────────────────────
  const [name, setName]       = useState(adminName);
  const [email, setEmail]     = useState(adminEmail);
  const [whatsapp, setWhatsapp] = useState(whatsappNumber ?? "");
  const [infoPending, startInfo]   = useTransition();
  const [infoSaved, setInfoSaved]  = useState(false);
  const [infoError, setInfoError]  = useState("");

  // ── Cambiar contraseña ────────────────────────────────────
  const [current, setCurrent]     = useState("");
  const [newPass, setNewPass]     = useState("");
  const [confirm, setConfirm]     = useState("");
  const [passPending, startPass]  = useTransition();
  const [passSaved, setPassSaved] = useState(false);
  const [passError, setPassError] = useState("");

  // ── Eliminar cuenta ───────────────────────────────────────
  const [deleteStep, setDeleteStep]     = useState<"idle" | "confirm">("idle");
  const [deletePass, setDeletePass]     = useState("");
  const [deletePending, startDelete]    = useTransition();
  const [deleteError, setDeleteError]   = useState("");

  function handleInfoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInfoError("");
    setInfoSaved(false);
    startInfo(async () => {
      const res = await updateSelfAdminProfile({ name, email, whatsappNumber: whatsapp });
      if ("error" in res && res.error) {
        setInfoError(res.error);
      } else {
        setInfoSaved(true);
        setTimeout(() => setInfoSaved(false), 3000);
      }
    });
  }

  function handlePassSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPassError("");
    setPassSaved(false);
    if (newPass !== confirm) {
      setPassError("Las contraseñas no coinciden");
      return;
    }
    startPass(async () => {
      const res = await changeAdminPassword({ currentPassword: current, newPassword: newPass });
      if ("error" in res && res.error) {
        setPassError(res.error);
      } else {
        setPassSaved(true);
        setCurrent("");
        setNewPass("");
        setConfirm("");
        setTimeout(() => setPassSaved(false), 3000);
      }
    });
  }

  function handleDeleteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDeleteError("");
    startDelete(async () => {
      const res = await deleteSelfAdminAccount(deletePass);
      if ("error" in res && res.error) {
        setDeleteError(res.error);
      } else {
        await adminLogoutAction();
      }
    });
  }

  return (
    <div className="space-y-8 max-w-2xl">

      {/* Rol — solo lectura */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#EDE2D8] border border-[#D8BFAE]">
        <span className="text-[10px] tracking-[0.15em] uppercase text-[#8E7A6B]">Rol</span>
        <span className="text-[9px] tracking-[0.12em] uppercase px-2 py-0.5 bg-[#CDA78F] text-white">
          {adminRole}
        </span>
        <span className="text-[10px] text-[#8E7A6B] ml-auto">
          El rol lo gestiona un administrador Root
        </span>
      </div>

      {/* Datos personales */}
      <SectionCard icon={User} title="Datos personales" subtitle="Nombre, correo y número de WhatsApp de recuperación">
        <form onSubmit={handleInfoSubmit} className="space-y-5">
          <div className={row}>
            <label htmlFor="admin-name" className={label}>Nombre</label>
            <div className="col-span-2">
              <input
                id="admin-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={cls}
                placeholder="Tu nombre"
              />
            </div>
          </div>

          <div className={row}>
            <label htmlFor="admin-email" className={label}>Correo electrónico</label>
            <div className="col-span-2">
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={cls}
                placeholder="admin@liradeluna.cl"
              />
            </div>
          </div>

          <div className={row}>
            <label htmlFor="admin-whatsapp" className={label}>
              WhatsApp
              <span className="block text-[9px] normal-case tracking-normal opacity-70">recuperación de contraseña</span>
            </label>
            <div className="col-span-2 space-y-1">
              <input
                id="admin-whatsapp"
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className={`${cls} font-mono`}
                placeholder="56912345678"
              />
              <p className="text-[10px] text-[#8E7A6B]">Con código de país, sin espacios.</p>
            </div>
          </div>

          {infoError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2">{infoError}</p>
          )}

          <div className="flex justify-end pt-1">
            <SaveButton pending={infoPending} saved={infoSaved} label="Guardar datos" />
          </div>
        </form>
      </SectionCard>

      {/* Cambiar contraseña */}
      <SectionCard icon={Lock} title="Cambiar contraseña" subtitle="Debes ingresar tu contraseña actual para confirmar el cambio">
        <form onSubmit={handlePassSubmit} className="space-y-5">
          <div className={row}>
            <label htmlFor="current-pass" className={label}>Contraseña actual</label>
            <div className="col-span-2">
              <PasswordInput id="current-pass" value={current} onChange={setCurrent} placeholder="Tu contraseña actual" />
            </div>
          </div>

          <div className={row}>
            <label htmlFor="new-pass" className={label}>Nueva contraseña</label>
            <div className="col-span-2 space-y-1">
              <PasswordInput id="new-pass" value={newPass} onChange={setNewPass} placeholder="Mínimo 8 caracteres" />
              <p className="text-[10px] text-[#8E7A6B]">Mínimo 8 caracteres.</p>
            </div>
          </div>

          <div className={row}>
            <label htmlFor="confirm-pass" className={label}>Confirmar</label>
            <div className="col-span-2">
              <PasswordInput id="confirm-pass" value={confirm} onChange={setConfirm} placeholder="Repite la nueva contraseña" />
            </div>
          </div>

          {passError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2">{passError}</p>
          )}

          <div className="flex justify-end pt-1">
            <SaveButton pending={passPending} saved={passSaved} label="Cambiar contraseña" />
          </div>
        </form>
      </SectionCard>

      {/* Eliminar cuenta */}
      <div className="bg-[#F7F4F1] border border-red-200">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-red-200">
          <Trash2 size={15} strokeWidth={1.5} className="text-red-400" />
          <div>
            <h2 className="text-[11px] tracking-[0.2em] uppercase text-red-600 font-medium">Eliminar cuenta</h2>
            <p className="text-[10px] text-[#8E7A6B] mt-0.5">Esta acción es irreversible</p>
          </div>
        </div>
        <div className="px-6 py-5">
          {deleteStep === "idle" ? (
            <div className="flex items-start gap-4">
              <p className="text-xs text-[#8E7A6B] flex-1">
                Se eliminarán permanentemente tus datos de acceso al panel. Asegúrate de que otro administrador pueda gestionar la tienda.
              </p>
              <button
                type="button"
                onClick={() => setDeleteStep("confirm")}
                className="shrink-0 text-[10px] tracking-[0.15em] uppercase px-4 py-2.5 border border-red-300 text-red-500 hover:bg-red-50 transition-colors"
              >
                Eliminar mi cuenta
              </button>
            </div>
          ) : (
            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              <p className="text-xs text-red-600 font-medium">
                Confirma tu contraseña para eliminar la cuenta definitivamente.
              </p>
              <div className={row}>
                <label className={label}>Contraseña</label>
                <div className="col-span-2">
                  <PasswordInput
                    id="delete-pass"
                    value={deletePass}
                    onChange={setDeletePass}
                    placeholder="Tu contraseña actual"
                  />
                </div>
              </div>
              {deleteError && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2">{deleteError}</p>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => { setDeleteStep("idle"); setDeletePass(""); setDeleteError(""); }}
                  className="text-[10px] tracking-[0.15em] uppercase px-4 py-2.5 border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={deletePending || !deletePass}
                  className="text-[10px] tracking-[0.15em] uppercase px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
                >
                  {deletePending ? "Eliminando…" : "Confirmar eliminación"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

    </div>
  );
}
