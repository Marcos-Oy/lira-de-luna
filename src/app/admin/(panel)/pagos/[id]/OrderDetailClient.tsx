"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Package, MapPin, User, CreditCard, Truck, Save, CheckCircle2, AlertCircle, Circle } from "lucide-react";
import { updateOrderStatus, updateOrderTracking } from "@/app/actions/admin/orders";

type OrderItem = {
  id: string; productName: string; variantLabel: string | null;
  quantity: number; unitPrice: number; totalPrice: number;
  product: { name: string; slug: string; images: unknown };
  variant: { type: string; label: string } | null;
};
type ShippingAddress = {
  name: string; phone: string | null; street: string;
  city: string; state: string; zip: string; country: string;
};
type Order = {
  id: string; orderNumber: string; status: string;
  subtotal: number; discountAmount: number; shippingAmount: number; total: number;
  paymentMethod: string | null; mpPaymentId: string | null;
  paidAt: Date | null; createdAt: Date; updatedAt: Date;
  guestEmail: string | null; guestName: string | null; guestPhone: string | null;
  guestStreet: string | null; guestCity: string | null; guestState: string | null; guestZip: string | null; guestCountry: string | null;
  trackingNumber: string | null; carrier: string | null; notes: string | null;
  shippedAt: Date | null; deliveredAt: Date | null;
  channel: string;
  presencialPayment: string | null;
  user: { name: string | null; email: string; phone: string | null } | null;
  shippingAddress: ShippingAddress | null;
  items: OrderItem[];
  coupon: { code: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente", PAID: "Pagado", PROCESSING: "Procesando",
  SHIPPED: "Enviado", DELIVERED: "Entregado", CANCELLED: "Cancelado", REFUNDED: "Reembolsado",
};
const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-[#EDE2D8] text-[#8E7A6B]", PAID: "bg-blue-50 text-blue-600",
  PROCESSING: "bg-[#EDE2D8] text-[#8E7A6B]", SHIPPED: "bg-[#CDA78F]/15 text-[#8E7A6B]",
  DELIVERED: "bg-emerald-50 text-emerald-600", CANCELLED: "bg-red-50 text-red-400",
  REFUNDED: "bg-purple-50 text-purple-500",
};

export default function OrderDetailClient({ order: initial }: { order: Order }) {
  const [order, setOrder]           = useState(initial);
  const [tracking, setTracking]     = useState(initial.trackingNumber ?? "");
  const [carrier, setCarrier]       = useState(initial.carrier ?? "");
  const [notes, setNotes]           = useState(initial.notes ?? "");
  const [shippedAt, setShippedAt]   = useState(
    initial.shippedAt ? new Date(initial.shippedAt).toISOString().slice(0, 10) : ""
  );
  const [saved, setSaved]           = useState(false);
  const [isPending, startTransition] = useTransition();

  const shipping = (() => {
    if (order.shippingAddress) {
      const a = order.shippingAddress;
      return {
        name:    a.name,
        phone:   a.phone ?? "—",
        address: `${a.street}, ${a.city}, ${a.state} ${a.zip}, ${a.country}`,
      };
    }
    if (order.guestStreet) {
      return {
        name:    order.guestName ?? order.guestEmail ?? "Invitado",
        phone:   order.guestPhone ?? "—",
        address: `${order.guestStreet}, ${order.guestCity ?? ""}, ${order.guestState ?? ""} ${order.guestZip ?? ""}, ${order.guestCountry ?? "CL"}`,
      };
    }
    return null;
  })();

  const customerName  = order.user?.name  ?? order.guestName  ?? "Invitado";
  const customerEmail = order.user?.email ?? order.guestEmail ?? "—";
  const customerPhone = order.user?.phone ?? order.guestPhone ?? "—";

  function handleStatusChange(newStatus: string) {
    startTransition(async () => {
      await updateOrderStatus(order.id, newStatus);
      setOrder((o) => ({ ...o, status: newStatus }));
    });
  }

  function handleSaveTracking() {
    startTransition(async () => {
      await updateOrderTracking(order.id, { trackingNumber: tracking, carrier, notes, shippedAt });
      setOrder((o) => ({
        ...o,
        trackingNumber: tracking || null,
        carrier:        carrier  || null,
        notes:          notes    || null,
        shippedAt:      shippedAt ? new Date(shippedAt) : null,
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  const trackingComplete = !!(order.carrier && order.trackingNumber && order.shippedAt);
  const trackingPartial  = !trackingComplete && !!(order.carrier || order.trackingNumber || order.shippedAt);

  return (
    <>
      {/* Print styles — only visible content during print */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3">
            <Link href="/admin/pagos"
              className="flex items-center gap-1.5 text-[10px] tracking-[0.12em] uppercase text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors">
              <ArrowLeft size={13} strokeWidth={1.5} /> Volver a pedidos
            </Link>
          </div>
          <button
            onClick={() => window.open(`/admin/pedidos/${order.id}`, "_blank")}
            className="flex items-center gap-2 bg-[#5C4A3E] hover:bg-[#3D2F26] text-white text-[10px] tracking-[0.15em] uppercase px-5 py-2.5 transition-colors"
          >
            <Printer size={13} strokeWidth={1.5} />
            Imprimir pedido
          </button>
        </div>

        {/* Print header (only shown when printing) */}
        <div className="print-only border-b pb-4 mb-4">
          <h1 className="text-2xl font-bold">Lira de Luna — Pedido #{order.orderNumber}</h1>
          <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>

        {/* Order number + status */}
        <div className="bg-[#F7F4F1] border border-[#D8BFAE] px-6 py-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Pedido</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="font-heading text-2xl text-[#5C4A3E]">#{order.orderNumber}</p>
              {order.channel === "PRESENCIAL" ? (
                <span className="text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 bg-amber-50 text-amber-600 font-medium self-center">
                  Venta presencial
                </span>
              ) : (
                <span className="text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 bg-blue-50 text-blue-600 font-medium self-center">
                  Tienda online
                </span>
              )}
            </div>
            <p className="text-xs text-[#8E7A6B] mt-1">
              {new Date(order.createdAt).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}
              {" "}·{" "}
              {new Date(order.createdAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div className="flex items-center gap-3 no-print">
            <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Estado:</label>
            <select
              value={order.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={isPending}
              className={`text-[10px] tracking-[0.08em] uppercase px-3 py-1.5 border-0 outline-none cursor-pointer font-medium ${STATUS_STYLES[order.status]}`}
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          {/* Print-only status */}
          <div className="print-only">
            <span className="text-sm font-medium">Estado: {STATUS_LABELS[order.status] ?? order.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Cliente */}
          <section className="bg-[#F7F4F1] border border-[#D8BFAE] p-5">
            <div className="flex items-center gap-2 mb-3">
              <User size={13} strokeWidth={1.5} className="text-[#CDA78F]" />
              <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Cliente</p>
            </div>
            <p className="text-sm text-[#5C4A3E] font-medium">{customerName}</p>
            <p className="text-xs text-[#8E7A6B] mt-0.5">{customerEmail}</p>
            {customerPhone !== "—" && <p className="text-xs text-[#8E7A6B]">{customerPhone}</p>}
            {order.user ? (
              <span className="inline-block mt-2 text-[9px] tracking-[0.1em] uppercase bg-[#EDE2D8] text-[#8E7A6B] px-2 py-0.5">
                Cliente registrado
              </span>
            ) : (
              <span className="inline-block mt-2 text-[9px] tracking-[0.1em] uppercase bg-blue-50 text-blue-600 px-2 py-0.5">
                Invitado
              </span>
            )}
          </section>

          {/* Dirección de envío */}
          <section className="bg-[#F7F4F1] border border-[#D8BFAE] p-5">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={13} strokeWidth={1.5} className="text-[#CDA78F]" />
              <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Dirección de envío</p>
            </div>
            {shipping ? (
              <>
                <p className="text-sm text-[#5C4A3E] font-medium">{shipping.name}</p>
                {shipping.phone !== "—" && <p className="text-xs text-[#8E7A6B] mt-0.5">{shipping.phone}</p>}
                <p className="text-xs text-[#8E7A6B] mt-1 leading-relaxed">{shipping.address}</p>
              </>
            ) : (
              <p className="text-xs text-[#8E7A6B] italic">Sin dirección registrada</p>
            )}
          </section>
        </div>

        {/* Productos — sección principal */}
        <section className="bg-[#F7F4F1] border border-[#D8BFAE]">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#D8BFAE]">
            <Package size={13} strokeWidth={1.5} className="text-[#CDA78F]" />
            <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">
              Productos — {order.items.length} {order.items.length === 1 ? "ítem" : "ítems"}
            </p>
          </div>
          <div className="divide-y divide-[#EDE2D8]">
            {order.items.map((item, i) => {
              const images = Array.isArray(item.product.images) ? item.product.images as string[] : [];
              const img = images[0];
              return (
                <div key={item.id} className="flex items-start gap-4 px-5 py-4">
                  {/* Index */}
                  <span className="text-[10px] text-[#CDA78F] font-mono w-5 shrink-0 mt-0.5">{i + 1}.</span>

                  {/* Image */}
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={item.productName}
                      className="w-14 h-14 object-cover shrink-0 bg-[#EDE2D8]" />
                  ) : (
                    <div className="w-14 h-14 bg-[#EDE2D8] shrink-0 flex items-center justify-center">
                      <Package size={18} strokeWidth={1} className="text-[#CDA78F]" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#5C4A3E] font-medium leading-tight">{item.productName}</p>
                    {item.variantLabel && (
                      <p className="text-[10px] text-[#CDA78F] mt-0.5">{item.variantLabel}</p>
                    )}
                    {item.variant && (
                      <p className="text-[10px] text-[#8E7A6B]">{item.variant.type}: {item.variant.label}</p>
                    )}
                    <p className="text-xs text-[#8E7A6B] mt-1">
                      Cantidad: <span className="font-medium text-[#5C4A3E]">{item.quantity}</span>
                      {" "}× ${item.unitPrice.toLocaleString("es-CL")} CLP
                    </p>
                  </div>

                  {/* Price */}
                  <div className="text-right shrink-0">
                    <p className="text-sm text-[#5C4A3E] font-medium">
                      ${item.totalPrice.toLocaleString("es-CL")}
                    </p>
                    <p className="text-[10px] text-[#8E7A6B]">CLP</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Resumen de pago */}
        <section className="bg-[#F7F4F1] border border-[#D8BFAE] p-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={13} strokeWidth={1.5} className="text-[#CDA78F]" />
            <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Resumen de pago</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-[#8E7A6B]">
                <span>Subtotal</span>
                <span>${order.subtotal.toLocaleString("es-CL")} CLP</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-xs text-emerald-600">
                  <span>Descuento{order.coupon ? ` (${order.coupon.code})` : ""}</span>
                  <span>−${order.discountAmount.toLocaleString("es-CL")} CLP</span>
                </div>
              )}
              {order.shippingAmount > 0 && (
                <div className="flex justify-between text-xs text-[#8E7A6B]">
                  <span>Envío</span>
                  <span>${order.shippingAmount.toLocaleString("es-CL")} CLP</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-[#5C4A3E] font-medium pt-2 border-t border-[#EDE2D8]">
                <span>Total</span>
                <span>${order.total.toLocaleString("es-CL")} CLP</span>
              </div>
            </div>
            <div className="text-xs text-[#8E7A6B] space-y-1 sm:pl-4 sm:border-l sm:border-[#EDE2D8]">
              {order.paymentMethod && <p>Método: <span className="text-[#5C4A3E]">{order.paymentMethod}</span></p>}
              {order.mpPaymentId  && <p>ID MP: <span className="font-mono">{order.mpPaymentId}</span></p>}
              {order.paidAt       && <p>Pagado: <span className="text-[#5C4A3E]">{new Date(order.paidAt).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}</span></p>}
            </div>
          </div>
        </section>

        {/* ── Seguimiento de envío ── */}
        <section className="bg-[#F7F4F1] border border-[#D8BFAE] no-print">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#D8BFAE]">
            <div className="flex items-center gap-2">
              <Truck size={13} strokeWidth={1.5} className="text-[#CDA78F]" />
              <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Seguimiento de envío</p>
            </div>
            {/* Completion badge */}
            {trackingComplete ? (
              <span className="flex items-center gap-1.5 text-[9px] tracking-[0.1em] uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1">
                <CheckCircle2 size={11} strokeWidth={1.5} />
                Seguimiento completo
              </span>
            ) : trackingPartial ? (
              <span className="flex items-center gap-1.5 text-[9px] tracking-[0.1em] uppercase text-amber-500 bg-amber-50 px-2.5 py-1">
                <AlertCircle size={11} strokeWidth={1.5} />
                Datos incompletos
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[9px] tracking-[0.1em] uppercase text-[#CDA78F] bg-[#EDE2D8] px-2.5 py-1">
                <Circle size={11} strokeWidth={1.5} />
                Sin datos de seguimiento
              </span>
            )}
          </div>

          <div className="p-5 space-y-5">
            {/* Three main fields in a row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">
                  Courier / Empresa
                </label>
                <input
                  type="text"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="Chilexpress, Starken, Correos…"
                  className="w-full bg-white border border-[#D8BFAE] text-xs text-[#5C4A3E] px-3 py-2.5 outline-none focus:border-[#CDA78F] transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">
                  Número de seguimiento
                </label>
                <input
                  type="text"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="ej. 1234567890"
                  className="w-full bg-white border border-[#D8BFAE] text-xs text-[#5C4A3E] px-3 py-2.5 outline-none focus:border-[#CDA78F] font-mono transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">
                  Fecha de despacho
                </label>
                <input
                  type="date"
                  value={shippedAt}
                  onChange={(e) => setShippedAt(e.target.value)}
                  className="w-full bg-white border border-[#D8BFAE] text-xs text-[#5C4A3E] px-3 py-2.5 outline-none focus:border-[#CDA78F] transition-colors"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="block text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">
                Notas internas
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Instrucciones de empaque, observaciones del envío, notas para el equipo…"
                className="w-full bg-white border border-[#D8BFAE] text-xs text-[#5C4A3E] px-3 py-2.5 outline-none focus:border-[#CDA78F] resize-none transition-colors"
              />
            </div>

            {/* Save row */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveTracking}
                disabled={isPending}
                className="flex items-center gap-2 bg-[#CDA78F] hover:bg-[#8E7A6B] disabled:opacity-50 text-white text-[10px] tracking-[0.15em] uppercase px-6 py-2.5 transition-colors"
              >
                <Save size={12} strokeWidth={1.5} />
                {isPending ? "Guardando…" : "Guardar datos de envío"}
              </button>
              {saved && (
                <span className="flex items-center gap-1.5 text-[10px] text-emerald-600">
                  <CheckCircle2 size={13} strokeWidth={1.5} />
                  Guardado correctamente
                </span>
              )}
            </div>

            {/* Read-only summary when data exists */}
            {trackingComplete && (
              <div className="bg-white border border-[#D8BFAE] px-4 py-3 flex flex-wrap gap-6 text-xs">
                <span className="text-[#8E7A6B]">
                  Empresa: <strong className="text-[#5C4A3E]">{order.carrier}</strong>
                </span>
                <span className="text-[#8E7A6B]">
                  N°: <strong className="text-[#5C4A3E] font-mono">{order.trackingNumber}</strong>
                </span>
                <span className="text-[#8E7A6B]">
                  Despachado: <strong className="text-[#5C4A3E]">
                    {new Date(order.shippedAt!).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}
                  </strong>
                </span>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
