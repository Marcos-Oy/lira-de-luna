import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Image from "next/image";
import AutoPrint from "./AutoPrint";
import PrintActions from "./PrintActions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente", PAID: "Pagado", PROCESSING: "Procesando",
  SHIPPED: "Enviado", DELIVERED: "Entregado", CANCELLED: "Cancelado", REFUNDED: "Reembolsado",
};

function fmt(n: number) {
  return `$${n.toLocaleString("es-CL")} CLP`;
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("es-CL", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default async function PrintOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [order, settings] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        user:            { select: { name: true, email: true, phone: true } },
        shippingAddress: true,
        items: {
          include: {
            product: { select: { name: true, slug: true } },
            variant: { select: { type: true, label: true } },
          },
          orderBy: { id: "asc" },
        },
        coupon: { select: { code: true } },
      },
    }),
    prisma.storeSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  if (!order) notFound();

  const storeName = settings?.storeName ?? "Lira de Luna";
  const logoUrl   = settings?.logoUrl   ?? null;

  const customer = order.user ?? {
    name:  order.guestName,
    email: order.guestEmail,
    phone: order.guestPhone,
  };

  const address = order.shippingAddress ?? (order.guestStreet ? {
    name:    order.guestName  ?? "",
    phone:   order.guestPhone ?? null,
    street:  order.guestStreet,
    city:    order.guestCity   ?? "",
    state:   order.guestState  ?? "",
    zip:     order.guestZip    ?? "",
    country: "Chile",
  } : null);

  const paymentLabel =
    order.paymentMethod === "mercadopago" ? "Mercado Pago" :
    order.paymentMethod === "transfer"    ? "Transferencia bancaria" :
    order.paymentMethod ?? "—";

  return (
    <>
      <AutoPrint />

      {/* Print + page CSS */}
      <style>{`
        @page { size: A4 portrait; margin: 18mm 22mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
        body { background: #f7f4f1; }
        .doc { background: white; }
      `}</style>

      {/* Screen-only action bar */}
      <PrintActions orderNumber={order.orderNumber} />

      {/* Document */}
      <div className="doc min-h-screen max-w-[794px] mx-auto p-10 space-y-7 text-[#3a3028]">

        {/* ── Header: logo + title ── */}
        <div className="flex items-start justify-between pb-6 border-b-2 border-[#CDA78F]">
          <div>
            {logoUrl ? (
              <div className="relative h-14 w-40">
                <Image src={logoUrl} alt={storeName} fill className="object-contain object-left" />
              </div>
            ) : (
              <p
                className="text-[38px] leading-none tracking-wide text-[#5C4A3E]"
                style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontWeight: 400 }}
              >
                {storeName}
              </p>
            )}
          </div>
          <div className="text-right space-y-1">
            <p className="text-[9px] tracking-[0.25em] uppercase text-[#CDA78F] font-medium">
              Comprobante de pedido
            </p>
            <p
              className="text-3xl text-[#5C4A3E]"
              style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontWeight: 500 }}
            >
              #{order.orderNumber}
            </p>
            <p className="text-xs text-[#8E7A6B]">{fmtDate(order.createdAt)}</p>
          </div>
        </div>

        {/* ── Status strip ── */}
        <div className="flex flex-wrap gap-6 text-sm">
          <span>
            <span className="text-[#8E7A6B] text-xs">Estado:</span>{" "}
            <strong>{STATUS_LABELS[order.status] ?? order.status}</strong>
          </span>
          <span>
            <span className="text-[#8E7A6B] text-xs">Pago:</span>{" "}
            <strong>{paymentLabel}</strong>
          </span>
          {order.paidAt && (
            <span>
              <span className="text-[#8E7A6B] text-xs">Pagado el:</span>{" "}
              <strong>{fmtDate(order.paidAt)}</strong>
            </span>
          )}
          {order.coupon && (
            <span>
              <span className="text-[#8E7A6B] text-xs">Cupón:</span>{" "}
              <strong>{order.coupon.code}</strong>
            </span>
          )}
        </div>

        {/* ── Customer + Address ── */}
        <div className="grid grid-cols-2 gap-10">
          <div>
            <p className="text-[9px] tracking-[0.2em] uppercase text-[#CDA78F] font-medium mb-2">
              Datos del cliente
            </p>
            <div className="space-y-0.5 text-sm">
              {customer?.name  && <p className="font-semibold">{customer.name}</p>}
              {customer?.email && <p className="text-[#8E7A6B]">{customer.email}</p>}
              {customer?.phone && <p className="text-[#8E7A6B]">{customer.phone}</p>}
            </div>
          </div>

          {address && (
            <div>
              <p className="text-[9px] tracking-[0.2em] uppercase text-[#CDA78F] font-medium mb-2">
                Dirección de envío
              </p>
              <div className="space-y-0.5 text-sm">
                <p className="font-semibold">{address.name}</p>
                <p className="text-[#8E7A6B]">{address.street}</p>
                <p className="text-[#8E7A6B]">
                  {address.city}{address.state ? `, ${address.state}` : ""}{address.zip ? ` · ${address.zip}` : ""}
                </p>
                <p className="text-[#8E7A6B]">{address.country}</p>
                {address.phone && <p className="text-[#8E7A6B]">{address.phone}</p>}
              </div>
            </div>
          )}
        </div>

        {/* ── Products table ── */}
        <div>
          <p className="text-[9px] tracking-[0.2em] uppercase text-[#CDA78F] font-medium mb-3">
            Productos
          </p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-y border-[#D8BFAE] bg-[#FAF8F6]">
                <th className="py-2.5 pl-3 text-left text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium w-[50%]">
                  Producto
                </th>
                <th className="py-2.5 text-center text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">
                  Cant.
                </th>
                <th className="py-2.5 text-right text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">
                  Precio unit.
                </th>
                <th className="py-2.5 pr-3 text-right text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr
                  key={item.id}
                  className={`border-b border-[#EDE2D8] ${i % 2 === 1 ? "bg-[#FDFCFB]" : ""}`}
                >
                  <td className="py-3 pl-3 pr-4">
                    <p className="font-medium">{item.productName}</p>
                    {item.variantLabel && (
                      <p className="text-xs text-[#8E7A6B] mt-0.5">{item.variantLabel}</p>
                    )}
                    {item.variant && (
                      <p className="text-xs text-[#8E7A6B] mt-0.5">
                        {item.variant.type}: {item.variant.label}
                      </p>
                    )}
                  </td>
                  <td className="py-3 text-center">{item.quantity}</td>
                  <td className="py-3 text-right text-[#8E7A6B]">{fmt(item.unitPrice)}</td>
                  <td className="py-3 pr-3 text-right font-medium">{fmt(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Totals ── */}
        <div className="flex justify-end">
          <div className="min-w-[240px] space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#8E7A6B]">Subtotal</span>
              <span>{fmt(order.subtotal)}</span>
            </div>
            {order.shippingAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-[#8E7A6B]">Envío</span>
                <span>{fmt(order.shippingAmount)}</span>
              </div>
            )}
            {order.shippingAmount === 0 && (
              <div className="flex justify-between">
                <span className="text-[#8E7A6B]">Envío</span>
                <span className="text-emerald-600">Gratis</span>
              </div>
            )}
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>
                  Descuento{order.coupon ? ` (${order.coupon.code})` : ""}
                </span>
                <span>−{fmt(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base border-t-2 border-[#CDA78F] pt-3 mt-1">
              <span
                style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontWeight: 500 }}
                className="text-lg"
              >
                Total
              </span>
              <span className="text-[#5C4A3E]">{fmt(order.total)}</span>
            </div>
          </div>
        </div>

        {/* ── Tracking / Notes ── */}
        {(order.trackingNumber || order.carrier || order.notes) && (
          <div className="border border-[#D8BFAE] bg-[#FAF8F6] p-4 space-y-1.5 text-sm">
            {(order.trackingNumber || order.carrier) && (
              <p>
                <span className="text-[#8E7A6B] text-xs tracking-[0.1em] uppercase">
                  Seguimiento:
                </span>{" "}
                <strong>{order.trackingNumber ?? "—"}</strong>
                {order.carrier && <span className="text-[#8E7A6B]"> · {order.carrier}</span>}
              </p>
            )}
            {order.shippedAt && (
              <p>
                <span className="text-[#8E7A6B] text-xs tracking-[0.1em] uppercase">
                  Fecha de despacho:
                </span>{" "}
                <strong>{fmtDate(order.shippedAt)}</strong>
              </p>
            )}
            {order.notes && (
              <p>
                <span className="text-[#8E7A6B] text-xs tracking-[0.1em] uppercase">
                  Notas:
                </span>{" "}
                {order.notes}
              </p>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="border-t-2 border-[#CDA78F] pt-5 text-center space-y-1">
          <p
            className="text-2xl text-[#5C4A3E]"
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontWeight: 400 }}
          >
            {storeName}
          </p>
          <p className="text-xs text-[#8E7A6B] tracking-wide">
            Gracias por tu compra · Este documento es tu comprobante de pedido
          </p>
          <p className="text-[10px] text-[#CDA78F] tracking-widest uppercase mt-1">
            ✦ ✦ ✦
          </p>
        </div>
      </div>
    </>
  );
}
