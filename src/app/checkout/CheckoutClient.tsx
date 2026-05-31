"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import {
  Check, ChevronRight, CreditCard, Eye, EyeOff,
  Landmark, Lock, ShoppingBag, Smartphone, Star, X,
} from "lucide-react";
import { signIn } from "next-auth/react";
import { createOrder, createAccountAndOrder } from "@/app/actions/checkout";
import { createMercadoPagoCheckout, createFlowCheckout } from "@/app/actions/payment";
import { COUNTRIES } from "@/lib/countries";

interface Address {
  name: string; phone: string | null; street: string; city: string; state: string; zip: string;
}

interface TransferInfo {
  bankName: string; accountName: string; accountNumber: string;
  accountType: string; rut: string; instructions: string;
}

interface Props {
  user: { id: string; name: string; email: string } | null;
  savedAddress: Address | null;
  paymentMethods: {
    mercadoPago: boolean;
    flowPay: boolean;
    transfer: boolean;
    transferInfo: TransferInfo | null;
  };
  shipping: {
    freeShippingFrom: number;
    standardShipping: number;
    processingDays: string;
  };
}

export default function CheckoutClient({ user, savedAddress, paymentMethods, shipping }: Props) {
  const { items, subtotal, clearCart } = useCart();
  const router = useRouter();

  const envio = subtotal >= shipping.freeShippingFrom ? 0 : shipping.standardShipping;
  const total = subtotal + envio;

  // Form state
  const [email,     setEmail]     = useState(user?.email ?? "");
  const [name,      setName]      = useState(savedAddress?.name ?? user?.name ?? "");
  const [phone,     setPhone]     = useState(savedAddress?.phone ?? "");
  const [street,    setStreet]    = useState(savedAddress?.street ?? "");
  const [city,      setCity]      = useState(savedAddress?.city ?? "");
  const [state,     setState]     = useState(savedAddress?.state ?? "");
  const [zip,       setZip]       = useState(savedAddress?.zip ?? "");
  const [country,   setCountry]   = useState((savedAddress as { country?: string } | null)?.country ?? "CL");
  const [payMethod, setPayMethod] = useState("");
  const [subscribe, setSubscribe] = useState(true);
  const [done,      setDone]      = useState<{ orderNumber: string; paymentMethod: string } | null>(null);
  const [error,     setError]     = useState("");
  const [isPending, startTransition] = useTransition();

  // Modal state
  const [showModal,    setShowModal]    = useState(false);
  const [regPassword,  setRegPassword]  = useState("");
  const [regSubscribe, setRegSubscribe] = useState(true);
  const [regError,     setRegError]     = useState("");
  const [regLoading,   setRegLoading]   = useState(false);
  const [showPw,       setShowPw]       = useState(false);

  const availableMethods = [
    paymentMethods.mercadoPago && { id: "mercadoPago", label: "MercadoPago",           sub: "Tarjeta, débito o transferencia",  icon: CreditCard },
    paymentMethods.flowPay     && { id: "flowPay",     label: "Flow Pay",              sub: "Tarjeta, débito o WebPay",         icon: Smartphone },
    paymentMethods.transfer    && { id: "transfer",    label: "Transferencia bancaria", sub: "Recibirás los datos al confirmar", icon: Landmark },
  ].filter(Boolean) as { id: string; label: string; sub: string; icon: React.ElementType }[];

  const cls = "w-full bg-white border border-brand-beige text-brand-dark text-xs px-3 py-3 outline-none focus:border-brand-sand transition-colors placeholder:text-brand-beige";

  function validate() {
    if (!email)     return "El correo es obligatorio";
    if (!name)      return "El nombre es obligatorio";
    if (!street)    return "La dirección es obligatoria";
    if (!city)      return "La ciudad es obligatoria";
    if (!state)     return "La región es obligatoria";
    if (!payMethod) return "Selecciona un método de pago";
    return null;
  }

  function getPayload() {
    return {
      email,
      shipping: { name, phone, street, city, state, zip, country },
      paymentMethod: payMethod,
      cartItems: items.map((i) => ({
        productId:    i.product.id,
        variantId:    undefined,
        quantity:     i.quantity,
        productName:  i.product.name,
        variantLabel: i.size,
        unitPrice:    i.product.price,
        totalPrice:   i.product.price * i.quantity,
      })),
    };
  }

  async function postOrder(
    res: { success?: boolean; orderNumber?: string; paymentMethod?: string },
    setErr: (e: string) => void,
  ) {
    clearCart();
    const method = res.paymentMethod!;
    const num    = res.orderNumber!;
    if (method === "mercadoPago") {
      const pay = await createMercadoPagoCheckout(num);
      if ("error" in pay) { setErr(pay.error!); return; }
      window.location.href = pay.checkoutUrl!;
      return;
    }
    if (method === "flowPay") {
      const pay = await createFlowCheckout(num);
      if ("error" in pay) { setErr(pay.error!); return; }
      window.location.href = pay.checkoutUrl!;
      return;
    }
    setDone({ orderNumber: num, paymentMethod: method });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError("");

    if (!user) {
      // Show registration offer for guests
      setRegPassword("");
      setRegError("");
      setShowModal(true);
      return;
    }

    startTransition(async () => {
      const res = await createOrder(getPayload());
      if ("error" in res && res.error) { setError(res.error); return; }
      if ("success" in res && res.success) await postOrder(res, setError);
    });
  }

  async function handleGuestOrder() {
    setRegError("");
    setRegLoading(true);
    try {
      const res = await createOrder({ ...getPayload(), subscribeNewsletter: subscribe });
      if ("error" in res && res.error) { setRegError(res.error); return; }
      if ("success" in res && res.success) {
        setShowModal(false);
        await postOrder(res, setRegError);
      }
    } finally {
      setRegLoading(false);
    }
  }

  async function handleRegisterAndOrder() {
    if (!regPassword || regPassword.length < 8) {
      setRegError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setRegError("");
    setRegLoading(true);
    try {
      const res = await createAccountAndOrder({
        ...getPayload(),
        password:            regPassword,
        subscribeNewsletter: regSubscribe,
      });
      if ("error" in res && res.error) { setRegError(res.error); return; }
      if ("success" in res && res.success) {
        setShowModal(false);
        try {
          await signIn("credentials", { email, password: regPassword, redirect: false });
          router.refresh();
        } catch {}
        await postOrder(res, setRegError);
      }
    } finally {
      setRegLoading(false);
    }
  }

  // ── Empty cart ──────────────────────────────────────────────────
  if (items.length === 0 && !done) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <p className="font-heading text-3xl text-brand-dark mb-4">Tu carrito está vacío</p>
        <Link href="/tienda" className="inline-block bg-brand-sand hover:bg-brand-taupe text-white text-[11px] tracking-[0.25em] uppercase px-8 py-3.5 transition-colors">
          Ir a la tienda
        </Link>
      </div>
    );
  }

  // ── Confirmation ────────────────────────────────────────────────
  if (done) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check size={24} strokeWidth={1.5} className="text-emerald-500" />
        </div>
        <h1 className="font-heading text-4xl text-brand-dark mb-2">¡Pedido confirmado!</h1>
        <p className="text-sm text-brand-taupe font-light mb-2">
          Orden <strong className="text-brand-dark">{done.orderNumber}</strong>
        </p>

        {done.paymentMethod === "transfer" && paymentMethods.transferInfo && (
          <div className="mt-8 text-left bg-white border border-brand-beige p-6 space-y-3">
            <p className="text-[10px] tracking-[0.2em] uppercase text-brand-taupe font-medium mb-4">Datos para la transferencia</p>
            {[
              ["Banco",   paymentMethods.transferInfo.bankName],
              ["Nombre",  paymentMethods.transferInfo.accountName],
              ["RUT",     paymentMethods.transferInfo.rut],
              ["Tipo",    paymentMethods.transferInfo.accountType === "corriente" ? "Cuenta corriente" : paymentMethods.transferInfo.accountType === "vista" ? "Cuenta vista / RUT" : "Cuenta de ahorro"],
              ["Número",  paymentMethods.transferInfo.accountNumber],
              ["Monto",   `$${total.toLocaleString("es-CL")} CLP`],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-brand-taupe">{label}</span>
                <span className="text-brand-dark font-medium">{val}</span>
              </div>
            ))}
            {paymentMethods.transferInfo.instructions && (
              <p className="text-[11px] text-brand-taupe border-t border-brand-beige pt-3 leading-relaxed">
                {paymentMethods.transferInfo.instructions}
              </p>
            )}
          </div>
        )}

        <Link href="/tienda" className="inline-block mt-8 border border-brand-beige text-[10px] tracking-[0.2em] uppercase text-brand-taupe hover:border-brand-sand px-8 py-3 transition-colors">
          Seguir comprando
        </Link>
      </div>
    );
  }

  // ── Checkout form ───────────────────────────────────────────────
  return (
    <>
      <div className="max-w-6xl mx-auto px-6 py-12">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[10px] text-brand-taupe tracking-wide mb-10">
          <Link href="/carrito" className="hover:text-brand-dark transition-colors">Carrito</Link>
          <ChevronRight size={12} strokeWidth={1.5} />
          <span className="text-brand-dark">Finalizar compra</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">

            {/* Left: form */}
            <div className="lg:col-span-3 space-y-10">

              {/* Contact */}
              <div>
                <h2 className="font-heading text-2xl text-brand-dark mb-6">Contacto</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] uppercase text-brand-taupe mb-1.5">Correo electrónico</label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      required
                      disabled={!!user}
                      placeholder="tu@correo.com"
                      className={`${cls} ${user ? "opacity-60 cursor-not-allowed" : ""}`}
                    />
                  </div>
                  {!user && (
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={subscribe}
                        onChange={(e) => setSubscribe(e.target.checked)}
                        className="w-3.5 h-3.5 accent-brand-sand"
                      />
                      <span className="text-xs text-brand-taupe">Suscribirme a novedades y ofertas</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Shipping */}
              <div>
                <h2 className="font-heading text-2xl text-brand-dark mb-6">Datos de envío</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[10px] tracking-[0.15em] uppercase text-brand-taupe mb-1.5">Nombre completo</label>
                      <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Tu nombre" className={cls} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] tracking-[0.15em] uppercase text-brand-taupe mb-1.5">Teléfono</label>
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+56 9 1234 5678" className={cls} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] tracking-[0.15em] uppercase text-brand-taupe mb-1.5">Dirección</label>
                      <input value={street} onChange={(e) => setStreet(e.target.value)} required placeholder="Calle, número, depto." className={cls} />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.15em] uppercase text-brand-taupe mb-1.5">Ciudad</label>
                      <input value={city} onChange={(e) => setCity(e.target.value)} required placeholder="Santiago" className={cls} />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.15em] uppercase text-brand-taupe mb-1.5">Región</label>
                      <input value={state} onChange={(e) => setState(e.target.value)} required placeholder="Metropolitana" className={cls} />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.15em] uppercase text-brand-taupe mb-1.5">Código postal</label>
                      <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="1234567" className={cls} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] tracking-[0.15em] uppercase text-brand-taupe mb-1.5">País *</label>
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        required
                        className={cls}
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div>
                <h2 className="font-heading text-2xl text-brand-dark mb-6">Método de pago</h2>
                {availableMethods.length === 0 ? (
                  <p className="text-xs text-brand-taupe bg-[#EDE2D8] px-4 py-3">
                    No hay métodos de pago disponibles. Contacta a la tienda.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {availableMethods.map(({ id, label, sub, icon: Icon }) => (
                      <label
                        key={id}
                        className={`flex items-center gap-4 p-4 border cursor-pointer transition-colors ${payMethod === id ? "border-brand-sand bg-white" : "border-brand-beige bg-white hover:border-brand-sand/50"}`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          value={id}
                          checked={payMethod === id}
                          onChange={() => setPayMethod(id)}
                          className="accent-brand-sand"
                        />
                        <Icon size={18} strokeWidth={1.5} className="text-brand-taupe shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-brand-dark">{label}</p>
                          <p className="text-[11px] text-brand-taupe">{sub}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-4 py-3">{error}</p>
              )}

              <button
                type="submit"
                disabled={isPending || availableMethods.length === 0}
                className="w-full bg-brand-sand hover:bg-brand-taupe text-white text-[11px] tracking-[0.25em] uppercase py-4 transition-colors disabled:opacity-50"
              >
                {isPending ? "Procesando…" : "Confirmar pedido"}
              </button>
            </div>

            {/* Right: order summary */}
            <div className="lg:col-span-2">
              <div className="sticky top-24 bg-white border border-brand-beige p-6">
                <h2 className="font-heading text-xl text-brand-dark mb-5">Tu pedido</h2>

                <div className="space-y-4 mb-6">
                  {items.map((item) => (
                    <div key={`${item.product.id}-${item.size ?? ""}`} className="flex items-center gap-3">
                      <div className="relative w-14 h-14 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={(item.product.images as string[])[0] ?? ""}
                          alt={item.product.name}
                          className="w-full h-full object-cover border border-brand-beige"
                        />
                        <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-brand-taupe text-white text-[10px] flex items-center justify-center font-medium">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-brand-dark font-medium truncate">{item.product.name}</p>
                        {item.size && <p className="text-[10px] text-brand-taupe">{item.size}</p>}
                      </div>
                      <p className="text-xs text-brand-dark font-medium shrink-0">
                        ${(item.product.price * item.quantity).toLocaleString("es-CL")}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-brand-beige pt-4 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-brand-taupe">Subtotal</span>
                    <span className="text-brand-dark">${subtotal.toLocaleString("es-CL")} CLP</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-brand-taupe">Envío</span>
                    <span className="text-brand-dark">
                      {envio === 0 ? <span className="text-brand-sand">Gratis</span> : `$${envio.toLocaleString("es-CL")} CLP`}
                    </span>
                  </div>
                  {envio > 0 && (
                    <p className="text-[10px] text-brand-taupe">
                      Agrega ${(shipping.freeShippingFrom - subtotal).toLocaleString("es-CL")} CLP más para envío gratis
                    </p>
                  )}
                </div>

                <div className="border-t border-brand-beige mt-4 pt-4">
                  <div className="flex justify-between">
                    <span className="text-[11px] tracking-[0.15em] uppercase text-brand-dark font-medium">Total</span>
                    <span className="font-heading text-xl text-brand-dark">${total.toLocaleString("es-CL")} CLP</span>
                  </div>
                  <p className="text-[10px] text-brand-taupe mt-1">Procesamiento en {shipping.processingDays} días hábiles</p>
                </div>
              </div>
            </div>

          </div>
        </form>
      </div>

      {/* Registration modal — shown to guests before confirming */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white border border-brand-beige w-full max-w-md p-8 relative">

            {/* Close — just dismisses modal, order not placed */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-brand-taupe hover:text-brand-dark transition-colors"
            >
              <X size={16} strokeWidth={1.5} />
            </button>

            <p className="font-heading text-3xl text-brand-dark mb-1" style={{ fontStyle: "italic" }}>
              Antes de confirmar…
            </p>
            <p className="text-xs text-brand-taupe mb-6 leading-relaxed">
              Crea una cuenta gratis y disfruta de estas ventajas:
            </p>

            {/* Benefits */}
            <div className="space-y-2.5 mb-6 bg-[#F7F4F1] px-4 py-4">
              {[
                { icon: ShoppingBag, text: "Revisa el estado de tus pedidos cuando quieras" },
                { icon: Star,        text: "No vuelvas a llenar tus datos al comprar" },
                { icon: Lock,        text: "Acceso a tu historial completo de compras" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5">
                  <Icon size={13} strokeWidth={1.5} className="text-brand-sand shrink-0" />
                  <span className="text-xs text-brand-taupe">{text}</span>
                </div>
              ))}
            </div>

            {/* Locked: email + name pre-filled from form */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-brand-taupe mb-1">Correo</label>
                <input
                  value={email}
                  disabled
                  className="w-full bg-[#F7F4F1] border border-brand-beige text-brand-taupe text-xs px-3 py-2.5 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-brand-taupe mb-1">Nombre</label>
                <input
                  value={name}
                  disabled
                  className="w-full bg-[#F7F4F1] border border-brand-beige text-brand-taupe text-xs px-3 py-2.5 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-brand-taupe mb-1">Elige una contraseña</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoFocus
                    className="w-full bg-white border border-brand-beige text-brand-dark text-xs px-3 pr-9 py-2.5 outline-none focus:border-brand-sand transition-colors placeholder:text-brand-beige"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-taupe hover:text-brand-dark"
                  >
                    {showPw ? <EyeOff size={13} strokeWidth={1.5} /> : <Eye size={13} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Newsletter */}
            <label className="flex items-center gap-2.5 cursor-pointer mb-5">
              <input
                type="checkbox"
                checked={regSubscribe}
                onChange={(e) => setRegSubscribe(e.target.checked)}
                className="w-3.5 h-3.5 accent-brand-sand"
              />
              <span className="text-xs text-brand-taupe">Suscribirme a novedades y ofertas</span>
            </label>

            {regError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2 mb-4">{regError}</p>
            )}

            <button
              onClick={handleRegisterAndOrder}
              disabled={regLoading}
              className="w-full bg-brand-sand hover:bg-brand-taupe text-white text-[10px] tracking-[0.25em] uppercase py-3.5 transition-colors disabled:opacity-50 mb-3"
            >
              {regLoading ? "Procesando…" : "Crear cuenta y confirmar pedido"}
            </button>

            <button
              onClick={handleGuestOrder}
              disabled={regLoading}
              className="w-full text-[10px] tracking-[0.15em] uppercase text-brand-taupe hover:text-brand-dark transition-colors py-2 disabled:opacity-50"
            >
              Continuar como invitado →
            </button>

          </div>
        </div>
      )}
    </>
  );
}
