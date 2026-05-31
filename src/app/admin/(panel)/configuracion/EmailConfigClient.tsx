"use client";

import { useState, useTransition, useRef } from "react";
import { Check, Eye, EyeOff, Send } from "lucide-react";
import { updateEmailConfig, testEmailConfig } from "@/app/actions/admin/settings";

interface Props {
  emailHost: string | null;
  emailPort: number | null;
  emailSecure: boolean;
  emailUser: string | null;
  emailPassword: string | null;
  emailFromName: string | null;
  emailFromAddr: string | null;
}

function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full bg-[#EDE2D8] border border-[#D8BFAE] text-[#5C4A3E] text-xs px-3 py-2.5 pr-10 outline-none focus:border-[#CDA78F] transition-colors"
      />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E7A6B] hover:text-[#5C4A3E]">
        {show ? <EyeOff size={13} strokeWidth={1.5} /> : <Eye size={13} strokeWidth={1.5} />}
      </button>
    </div>
  );
}

const cls = "w-full bg-[#EDE2D8] border border-[#D8BFAE] text-[#5C4A3E] text-xs px-3 py-2.5 outline-none focus:border-[#CDA78F] transition-colors";

export default function EmailConfigClient(props: Props) {
  const [host,        setHost]        = useState(props.emailHost ?? "");
  const [port,        setPort]        = useState(String(props.emailPort ?? "587"));
  const [secure,      setSecure]      = useState(props.emailSecure);
  const [user,        setUser]        = useState(props.emailUser ?? "");
  const [password,    setPassword]    = useState(props.emailPassword ?? "");
  const [fromName,    setFromName]    = useState(props.emailFromName ?? "");
  const [fromAddr,    setFromAddr]    = useState(props.emailFromAddr ?? "");
  const [testEmail,   setTestEmail]   = useState("");
  const [saved,       setSaved]       = useState(false);
  const [testResult,  setTestResult]  = useState<{ ok?: boolean; msg?: string } | null>(null);
  const [isPending,   startTransition] = useTransition();

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      await updateEmailConfig({
        emailHost: host, emailPort: Number(port) || 587, emailSecure: secure,
        emailUser: user, emailPassword: password, emailFromName: fromName,
        emailFromAddr: fromAddr,
      });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    });
  }

  function handleTest() {
    if (!testEmail) return;
    setTestResult(null);
    startTransition(async () => {
      const res = await testEmailConfig(testEmail);
      setTestResult({ ok: res.ok, msg: res.ok ? "Correo enviado exitosamente" : (res.error ?? "Error al enviar") });
    });
  }

  const row = "grid grid-cols-3 gap-4 items-center";
  const label = "text-xs text-[#8E7A6B]";

  return (
    <div className="p-6 space-y-5">

      {/* SMTP */}
      <p className="text-[10px] tracking-[0.12em] uppercase text-[#8E7A6B] font-medium border-b border-[#EDE2D8] pb-2">
        Servidor SMTP
      </p>
      <p className="text-[10px] text-[#8E7A6B] -mt-3">
        Puedes usar Gmail (<code className="bg-[#EDE2D8] px-1">smtp.gmail.com</code>), Outlook (<code className="bg-[#EDE2D8] px-1">smtp.office365.com</code>) o tu servidor corporativo.
        Para Gmail activa &ldquo;Contraseña de aplicación&rdquo; en tu cuenta.
      </p>

      <div className={row}>
        <label className={label}>Servidor (host)</label>
        <div className="col-span-2">
          <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.gmail.com" className={cls} />
        </div>
      </div>
      <div className={row}>
        <label className={label}>Puerto</label>
        <div className="col-span-2 flex items-center gap-4">
          <input value={port} onChange={(e) => setPort(e.target.value)} placeholder="587" className={`${cls} w-24`} />
          <label className="flex items-center gap-2 text-xs text-[#5C4A3E] cursor-pointer">
            <button
              type="button"
              role="switch"
              aria-checked={secure}
              onClick={() => setSecure((s) => !s)}
              className={`relative inline-flex w-9 h-5 rounded-full transition-colors ${secure ? "bg-emerald-500" : "bg-[#D8BFAE]"}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${secure ? "left-4" : "left-0.5"}`} />
            </button>
            TLS/SSL
          </label>
        </div>
      </div>
      <div className={row}>
        <label className={label}>Usuario</label>
        <div className="col-span-2">
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="hola@liradeluna.cl" className={cls} />
        </div>
      </div>
      <div className={row}>
        <label className={label}>Contraseña</label>
        <div className="col-span-2">
          <SecretInput value={password} onChange={setPassword} placeholder="Contraseña o App Password" />
        </div>
      </div>

      {/* Remitente */}
      <p className="text-[10px] tracking-[0.12em] uppercase text-[#8E7A6B] font-medium border-b border-[#EDE2D8] pb-2 pt-2">
        Remitente
      </p>
      <div className={row}>
        <label className={label}>Nombre</label>
        <div className="col-span-2">
          <input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Lira de Luna" className={cls} />
        </div>
      </div>
      <div className={row}>
        <label className={label}>Correo</label>
        <div className="col-span-2">
          <input value={fromAddr} onChange={(e) => setFromAddr(e.target.value)} placeholder="hola@liradeluna.cl" className={cls} />
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className={`flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase px-5 py-2.5 transition-colors disabled:opacity-50 ${saved ? "bg-emerald-500 text-white" : "bg-[#CDA78F] hover:bg-[#8E7A6B] text-white"}`}
        >
          {saved && <Check size={12} strokeWidth={2} />}
          {isPending ? "Guardando…" : saved ? "Guardado" : "Guardar configuración"}
        </button>
      </div>

      {/* Test */}
      <div className="border-t border-[#EDE2D8] pt-4">
        <p className="text-[10px] tracking-[0.12em] uppercase text-[#8E7A6B] font-medium mb-3">
          Probar configuración
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="correo@prueba.com"
            className={`flex-1 ${cls}`}
          />
          <button
            type="button"
            onClick={handleTest}
            disabled={isPending || !testEmail}
            className="flex items-center gap-1.5 bg-[#5C4A3E] hover:bg-[#3D2E28] text-white text-[10px] tracking-[0.15em] uppercase px-4 py-2.5 transition-colors disabled:opacity-50"
          >
            <Send size={11} strokeWidth={1.5} />
            {isPending ? "Enviando…" : "Enviar prueba"}
          </button>
        </div>
        {testResult && (
          <p className={`text-[10px] mt-2 ${testResult.ok ? "text-emerald-600" : "text-red-500"}`}>
            {testResult.msg}
          </p>
        )}
      </div>
    </div>
  );
}
