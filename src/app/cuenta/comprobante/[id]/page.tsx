import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Comprobante de compra — Lira de Luna" };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente", PAID: "Pagado", PROCESSING: "Procesando",
  SHIPPED: "Enviado", DELIVERED: "Entregado", CANCELLED: "Cancelado", REFUNDED: "Reembolsado",
};

const CARRIER_LABELS: Record<string, string> = {
  mercado_libre: "Mercado Libre", fedex: "FedEx", chilexpress: "Chilexpress",
  starken: "Starken", blue_express: "Blue Express", correos_chile: "Correos de Chile", dhl: "DHL",
};

function paymentMethodLabel(method: string | null) {
  if (!method) return "—";
  if (method === "mercadoPago" || method === "mercadopago") return "Mercado Pago";
  if (method === "flowPay"     || method === "flow")       return "Flow Pay";
  if (method === "transfer")                                return "Transferencia bancaria";
  if (method === "CASH")   return "Efectivo";
  if (method === "CARD")   return "Tarjeta";
  return method;
}

function paymentMessage(method: string | null) {
  if (method === "mercadoPago" || method === "mercadopago")
    return { type: "info" as const, text: "Tu boleta electrónica fue enviada automáticamente a tu correo registrado por Mercado Pago." };
  if (method === "flowPay" || method === "flow")
    return { type: "info" as const, text: "Tu boleta electrónica fue enviada automáticamente a tu correo registrado por Flow." };
  if (method === "transfer")
    return { type: "support" as const, text: "Para consultar o solicitar tu boleta, contacta a nuestro equipo de soporte." };
  return null;
}

export default async function ComprobantePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/cuenta/login");

  const [order, settings] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        items: { select: { productName: true, quantity: true, unitPrice: true } },
        shippingAddress: true,
      },
    }),
    prisma.storeSettings.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } }),
  ]);

  if (!order || order.userId !== session.user.id) notFound();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });

  const payMsg  = paymentMessage(order.paymentMethod);
  const carrier = order.carrier ? (CARRIER_LABELS[order.carrier.toLowerCase()] ?? order.carrier) : null;

  return (
    <>
      {/* Print-only global style to remove headers/footers */}
      <style>{`
        @media print {
          @page { margin: 16mm 14mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="min-h-screen bg-[#F7F4F1] print:bg-white">
        {/* Action bar — hidden on print */}
        <div className="print:hidden bg-white border-b border-[#D8BFAE] px-6 py-3 flex items-center justify-between">
          <a href="/cuenta" className="text-[10px] tracking-[0.15em] uppercase text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors">
            ← Volver a mis pedidos
          </a>
          <PrintButton />
        </div>

        {/* Receipt */}
        <div className="max-w-2xl mx-auto px-6 py-10 print:py-0 print:px-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b border-[#D8BFAE]">
            <div>
              {settings.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.logoUrl} alt={settings.storeName} className="h-10 object-contain mb-2" />
              ) : (
                <p className="font-heading text-2xl text-[#5C4A3E]">{settings.storeName}</p>
              )}
              <p className="text-[10px] tracking-[0.15em] uppercase text-[#8E7A6B]">Comprobante de compra</p>
            </div>
            <div className="text-right">
              <p className="font-heading text-lg text-[#5C4A3E]">{order.orderNumber}</p>
              <p className="text-[11px] text-[#8E7A6B]">
                {new Date(order.createdAt).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
              <span className="inline-block mt-1 text-[9px] tracking-[0.12em] uppercase bg-[#EDE2D8] text-[#8E7A6B] px-2 py-0.5">
                {STATUS_LABELS[order.status] ?? order.status}
              </span>
            </div>
          </div>

          {/* Customer + Address */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] mb-2">Cliente</p>
              {user?.name && <p className="text-sm text-[#5C4A3E]">{user.name}</p>}
              <p className="text-xs text-[#8E7A6B]">{user?.email ?? order.guestEmail}</p>
            </div>
            {order.shippingAddress ? (
              <div>
                <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] mb-2">Dirección de envío</p>
                <p className="text-xs text-[#5C4A3E] leading-relaxed">
                  {order.shippingAddress.street}<br />
                  {order.shippingAddress.city}{order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ""}
                  {order.shippingAddress.zip ? ` ${order.shippingAddress.zip}` : ""}<br />
                  {order.shippingAddress.country}
                </p>
              </div>
            ) : order.guestStreet ? (
              <div>
                <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] mb-2">Dirección de envío</p>
                <p className="text-xs text-[#5C4A3E] leading-relaxed">
                  {order.guestStreet}<br />
                  {order.guestCity}{order.guestState ? `, ${order.guestState}` : ""}
                  {order.guestZip ? ` ${order.guestZip}` : ""}<br />
                  {(order as { guestCountry?: string | null }).guestCountry ?? "CL"}
                </p>
              </div>
            ) : null}
          </div>

          {/* Items table */}
          <table className="w-full mb-6">
            <thead>
              <tr className="border-b border-[#D8BFAE]">
                {["Producto", "Cant.", "Precio unit.", "Total"].map((h) => (
                  <th key={h} className="pb-2 text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] font-normal text-left last:text-right">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i} className="border-b border-[#D8BFAE]/50">
                  <td className="py-3 text-xs text-[#5C4A3E] pr-4">{item.productName}</td>
                  <td className="py-3 text-xs text-[#8E7A6B] text-center">{item.quantity}</td>
                  <td className="py-3 text-xs text-[#8E7A6B]">${item.unitPrice.toLocaleString("es-CL")}</td>
                  <td className="py-3 text-xs text-[#5C4A3E] text-right">${(item.unitPrice * item.quantity).toLocaleString("es-CL")}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-56 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[#8E7A6B]">Subtotal</span>
                <span className="text-[#5C4A3E]">${order.subtotal.toLocaleString("es-CL")}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-[#8E7A6B]">Descuento</span>
                  <span className="text-emerald-600">-${order.discountAmount.toLocaleString("es-CL")}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-[#8E7A6B]">Envío</span>
                <span className="text-[#5C4A3E]">
                  {order.shippingAmount === 0 ? "Gratis" : `$${order.shippingAmount.toLocaleString("es-CL")}`}
                </span>
              </div>
              <div className="flex justify-between text-sm font-medium border-t border-[#D8BFAE] pt-2 mt-2">
                <span className="text-[#5C4A3E]">Total</span>
                <span className="font-heading text-base text-[#5C4A3E]">${order.total.toLocaleString("es-CL")} CLP</span>
              </div>
            </div>
          </div>

          {/* Payment + Shipping info */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-[#F7F4F1] print:bg-[#F7F4F1] border border-[#D8BFAE] px-4 py-3">
              <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] mb-1.5">Método de pago</p>
              <p className="text-xs text-[#5C4A3E]">{paymentMethodLabel(order.paymentMethod)}</p>
              {order.paidAt && (
                <p className="text-[10px] text-[#8E7A6B] mt-0.5">
                  Pagado el {new Date(order.paidAt).toLocaleDateString("es-CL")}
                </p>
              )}
            </div>
            {(carrier || order.trackingNumber) && (
              <div className="bg-[#F7F4F1] print:bg-[#F7F4F1] border border-[#D8BFAE] px-4 py-3">
                <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] mb-1.5">Envío</p>
                {carrier && <p className="text-xs text-[#5C4A3E]">{carrier}</p>}
                {order.trackingNumber && (
                  <p className="text-[10px] text-[#8E7A6B] font-mono mt-0.5">{order.trackingNumber}</p>
                )}
              </div>
            )}
          </div>

          {/* Boleta / soporte message */}
          {payMsg && (
            <div className={`mb-8 px-4 py-3 border text-xs ${
              payMsg.type === "info"
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-[#EDE2D8] border-[#D8BFAE] text-[#5C4A3E]"
            }`}>
              <p>{payMsg.text}</p>
              {payMsg.type === "support" && (settings.supportEmail || settings.supportPhone) && (
                <p className="mt-1.5 text-[#8E7A6B]">
                  {settings.supportEmail && <span>✉ {settings.supportEmail}  </span>}
                  {settings.supportPhone && <span>📞 {settings.supportPhone}</span>}
                </p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-[#D8BFAE] pt-6 text-center">
            <p className="font-heading text-base text-[#5C4A3E] mb-1">{settings.storeName}</p>
            <p className="text-[11px] text-[#8E7A6B]">Gracias por tu compra</p>
            {(settings.supportEmail || settings.supportPhone) && (
              <p className="text-[10px] text-[#8E7A6B] mt-2">
                {settings.supportEmail && <span className="mr-3">{settings.supportEmail}</span>}
                {settings.supportPhone && <span>{settings.supportPhone}</span>}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
