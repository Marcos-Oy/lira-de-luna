"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, Eye, EyeOff } from "lucide-react";
import { togglePaymentMethod, updateMercadoPago, updateFlowPay, updateTransfer } from "@/app/actions/admin/settings";

interface Props {
  mercadoPagoEnabled: boolean;
  mercadoPagoPublicKey: string | null;
  mercadoPagoAccessToken: string | null;
  flowPayEnabled: boolean;
  flowPayApiKey: string | null;
  flowPaySecretKey: string | null;
  transferEnabled: boolean;
  transferBankName: string | null;
  transferAccountName: string | null;
  transferAccountNumber: string | null;
  transferAccountType: string | null;
  transferRut: string | null;
  transferInstructions: string | null;
}

function Toggle({ enabled, onChange, isPending }: { enabled: boolean; onChange: (v: boolean) => void; isPending: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={isPending}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${enabled ? "bg-emerald-500" : "bg-[#D8BFAE]"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${enabled ? "left-5" : "left-0.5"}`} />
    </button>
  );
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

function SaveRow({ onSave, isPending, saved }: { onSave: () => void; isPending: boolean; saved: boolean }) {
  return (
    <div className="flex justify-end pt-2">
      <button
        type="button"
        onClick={onSave}
        disabled={isPending}
        className={`flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase px-4 py-2 transition-colors disabled:opacity-50 ${saved ? "bg-emerald-500 text-white" : "bg-[#CDA78F] hover:bg-[#8E7A6B] text-white"}`}
      >
        {saved && <Check size={11} strokeWidth={2} />}
        {isPending ? "Guardando…" : saved ? "Guardado" : "Guardar"}
      </button>
    </div>
  );
}

// ── MercadoPago ───────────────────────────────────────────────

function MercadoPagoSection({ initial }: { initial: Props }) {
  const [enabled, setEnabled]     = useState(initial.mercadoPagoEnabled);
  const [publicKey, setPublicKey] = useState(initial.mercadoPagoPublicKey ?? "");
  const [token, setToken]         = useState(initial.mercadoPagoAccessToken ?? "");
  const [open, setOpen]           = useState(initial.mercadoPagoEnabled);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState("");
  const [isPending, startTransition] = useTransition();

  function handleToggle(val: boolean) {
    setEnabled(val);
    startTransition(async () => {
      await togglePaymentMethod("mercadoPago", val);
    });
  }

  function handleSave() {
    setError(""); setSaved(false);
    startTransition(async () => {
      await updateMercadoPago({ publicKey, accessToken: token });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <div className="border border-[#D8BFAE] bg-[#F7F4F1]">
      <div className="flex items-center gap-3 px-5 py-4">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 flex-1 text-left">
          <ChevronDown size={13} strokeWidth={1.5} className={`text-[#8E7A6B] transition-transform ${open ? "rotate-180" : ""}`} />
          <div>
            <p className="text-xs font-medium text-[#5C4A3E]">MercadoPago</p>
            <p className="text-[10px] text-[#8E7A6B]">Pagos con tarjeta y transferencia vía MercadoPago</p>
          </div>
        </button>
        <Toggle enabled={enabled} onChange={handleToggle} isPending={isPending} />
      </div>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-[#EDE2D8] space-y-4">
          <div className="grid grid-cols-3 gap-4 items-center">
            <label className="text-xs text-[#8E7A6B]">Public Key</label>
            <div className="col-span-2">
              <input
                type="text"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="APP_USR-xxxxxxxx"
                autoComplete="off"
                className="w-full bg-[#EDE2D8] border border-[#D8BFAE] text-[#5C4A3E] text-xs px-3 py-2.5 outline-none focus:border-[#CDA78F] transition-colors"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 items-center">
            <label className="text-xs text-[#8E7A6B]">Access Token</label>
            <div className="col-span-2">
              <SecretInput value={token} onChange={setToken} placeholder="APP_USR-00000000-…" />
            </div>
          </div>
          <p className="text-[9px] text-[#8E7A6B]">
            Obtén tus credenciales en{" "}
            <a href="https://www.mercadopago.cl/developers/es/docs" target="_blank" rel="noopener noreferrer" className="text-[#CDA78F] underline">
              mercadopago.cl/developers
            </a>
          </p>
          {error && <p className="text-[10px] text-red-500">{error}</p>}
          <SaveRow onSave={handleSave} isPending={isPending} saved={saved} />
        </div>
      )}
    </div>
  );
}

// ── Flow Pay ──────────────────────────────────────────────────

function FlowPaySection({ initial }: { initial: Props }) {
  const [enabled, setEnabled] = useState(initial.flowPayEnabled);
  const [apiKey, setApiKey]   = useState(initial.flowPayApiKey ?? "");
  const [secret, setSecret]   = useState(initial.flowPaySecretKey ?? "");
  const [open, setOpen]       = useState(initial.flowPayEnabled);
  const [saved, setSaved]     = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleToggle(val: boolean) {
    setEnabled(val);
    startTransition(async () => { await togglePaymentMethod("flowPay", val); });
  }

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      await updateFlowPay({ apiKey, secretKey: secret });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <div className="border border-[#D8BFAE] bg-[#F7F4F1]">
      <div className="flex items-center gap-3 px-5 py-4">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 flex-1 text-left">
          <ChevronDown size={13} strokeWidth={1.5} className={`text-[#8E7A6B] transition-transform ${open ? "rotate-180" : ""}`} />
          <div>
            <p className="text-xs font-medium text-[#5C4A3E]">Flow Pay</p>
            <p className="text-[10px] text-[#8E7A6B]">Pagos con tarjeta y transferencia vía flow.cl</p>
          </div>
        </button>
        <Toggle enabled={enabled} onChange={handleToggle} isPending={isPending} />
      </div>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-[#EDE2D8] space-y-4">
          <div className="grid grid-cols-3 gap-4 items-center">
            <label className="text-xs text-[#8E7A6B]">API Key</label>
            <div className="col-span-2">
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="flow_key_xxxxxxxx"
                autoComplete="off"
                className="w-full bg-[#EDE2D8] border border-[#D8BFAE] text-[#5C4A3E] text-xs px-3 py-2.5 outline-none focus:border-[#CDA78F] transition-colors"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 items-center">
            <label className="text-xs text-[#8E7A6B]">Secret Key</label>
            <div className="col-span-2">
              <SecretInput value={secret} onChange={setSecret} placeholder="flow_secret_…" />
            </div>
          </div>
          <p className="text-[9px] text-[#8E7A6B]">
            Obtén tus credenciales en{" "}
            <a href="https://www.flow.cl/app/web/comercios.php" target="_blank" rel="noopener noreferrer" className="text-[#CDA78F] underline">
              flow.cl/app
            </a>
          </p>
          <SaveRow onSave={handleSave} isPending={isPending} saved={saved} />
        </div>
      )}
    </div>
  );
}

// ── Transferencia ─────────────────────────────────────────────

function TransferenciaSection({ initial }: { initial: Props }) {
  const [enabled, setEnabled]         = useState(initial.transferEnabled);
  const [bankName, setBankName]       = useState(initial.transferBankName ?? "");
  const [accountName, setAccountName] = useState(initial.transferAccountName ?? "");
  const [accountNumber, setAccountNumber] = useState(initial.transferAccountNumber ?? "");
  const [accountType, setAccountType] = useState(initial.transferAccountType ?? "corriente");
  const [rut, setRut]                 = useState(initial.transferRut ?? "");
  const [instructions, setInstructions] = useState(initial.transferInstructions ?? "");
  const [open, setOpen]               = useState(initial.transferEnabled);
  const [saved, setSaved]             = useState(false);
  const [isPending, startTransition]  = useTransition();

  function handleToggle(val: boolean) {
    setEnabled(val);
    startTransition(async () => { await togglePaymentMethod("transfer", val); });
  }

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      await updateTransfer({ bankName, accountName, accountNumber, accountType, rut, instructions });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    });
  }

  const cls = "w-full bg-[#EDE2D8] border border-[#D8BFAE] text-[#5C4A3E] text-xs px-3 py-2.5 outline-none focus:border-[#CDA78F] transition-colors";

  return (
    <div className="border border-[#D8BFAE] bg-[#F7F4F1]">
      <div className="flex items-center gap-3 px-5 py-4">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 flex-1 text-left">
          <ChevronDown size={13} strokeWidth={1.5} className={`text-[#8E7A6B] transition-transform ${open ? "rotate-180" : ""}`} />
          <div>
            <p className="text-xs font-medium text-[#5C4A3E]">Transferencia bancaria</p>
            <p className="text-[10px] text-[#8E7A6B]">El cliente recibe los datos bancarios al confirmar el pedido</p>
          </div>
        </button>
        <Toggle enabled={enabled} onChange={handleToggle} isPending={isPending} />
      </div>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-[#EDE2D8] space-y-4">
          <div className="grid grid-cols-3 gap-4 items-center">
            <label className="text-xs text-[#8E7A6B]">Banco</label>
            <div className="col-span-2">
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Ej. Banco Estado" className={cls} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 items-center">
            <label className="text-xs text-[#8E7A6B]">Nombre cuenta</label>
            <div className="col-span-2">
              <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Nombre del titular" className={cls} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 items-center">
            <label className="text-xs text-[#8E7A6B]">RUT</label>
            <div className="col-span-2">
              <input value={rut} onChange={(e) => setRut(e.target.value)} placeholder="12.345.678-9" className={cls} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 items-center">
            <label className="text-xs text-[#8E7A6B]">Tipo de cuenta</label>
            <div className="col-span-2">
              <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className={`${cls} cursor-pointer`}>
                <option value="corriente">Cuenta corriente</option>
                <option value="vista">Cuenta vista / RUT</option>
                <option value="ahorro">Cuenta de ahorro</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 items-center">
            <label className="text-xs text-[#8E7A6B]">Nº de cuenta</label>
            <div className="col-span-2">
              <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="000-000000-00" className={cls} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <label className="text-xs text-[#8E7A6B] pt-2">Instrucciones</label>
            <div className="col-span-2">
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Envía el comprobante a hola@liradeluna.cl"
                rows={2}
                className={`${cls} resize-none`}
              />
            </div>
          </div>
          <SaveRow onSave={handleSave} isPending={isPending} saved={saved} />
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

export default function PaymentsClient(props: Props) {
  return (
    <div className="p-6 space-y-3">
      <p className="text-[10px] text-[#8E7A6B] mb-4">
        Activa los métodos de pago que quieres ofrecer. Puedes usar uno o varios simultáneamente.
      </p>
      <MercadoPagoSection initial={props} />
      <FlowPaySection initial={props} />
      <TransferenciaSection initial={props} />
    </div>
  );
}
