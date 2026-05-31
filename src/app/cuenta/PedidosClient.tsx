"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Package, Truck, ChevronDown, X, Search, SlidersHorizontal, ArrowUpDown, FileText, Info } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente", PAID: "Pagado", PROCESSING: "Procesando",
  SHIPPED: "Enviado", DELIVERED: "Entregado", CANCELLED: "Cancelado", REFUNDED: "Reembolsado",
};
const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-[#EDE2D8] text-[#8E7A6B]",
  PAID: "bg-blue-50 text-blue-600",
  PROCESSING: "bg-[#EDE2D8] text-[#8E7A6B]",
  SHIPPED: "bg-[#CDA78F]/15 text-[#CDA78F]",
  DELIVERED: "bg-emerald-50 text-emerald-600",
  CANCELLED: "bg-red-50 text-red-400",
  REFUNDED: "bg-purple-50 text-purple-500",
};

const CARRIER_LABELS: Record<string, string> = {
  "mercado_libre": "Mercado Libre",
  "fedex": "FedEx",
  "chilexpress": "Chilexpress",
  "starken": "Starken",
  "blue_express": "Blue Express",
  "correos_chile": "Correos de Chile",
  "dhl": "DHL",
};

const SORT_OPTIONS = [
  { value: "date_desc",  label: "Más recientes" },
  { value: "date_asc",   label: "Más antiguos" },
  { value: "price_desc", label: "Mayor precio" },
  { value: "price_asc",  label: "Menor precio" },
];

function carrierLabel(carrier: string) {
  return CARRIER_LABELS[carrier.toLowerCase()] ?? carrier;
}

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  paymentMethod: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  shippedAt: string | null;
  items: { productName: string }[];
};

interface Props {
  orders: Order[];
  supportEmail?: string | null;
  supportPhone?: string | null;
}

function paymentBanner(method: string | null, supportEmail?: string | null, supportPhone?: string | null) {
  if (method === "mercadoPago" || method === "mercadopago")
    return { style: "info", text: "Tu boleta electrónica fue enviada automáticamente a tu correo por Mercado Pago." };
  if (method === "flowPay" || method === "flow")
    return { style: "info", text: "Tu boleta electrónica fue enviada automáticamente a tu correo por Flow." };
  if (method === "transfer") {
    const contact = [supportEmail, supportPhone].filter(Boolean).join("  ·  ");
    return {
      style: "support",
      text: "Para consultar o solicitar tu boleta, contacta a nuestro equipo de soporte.",
      contact,
    };
  }
  return null;
}

export default function PedidosClient({ orders, supportEmail, supportPhone }: Props) {
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [priceMin, setPriceMin]       = useState("");
  const [priceMax, setPriceMax]       = useState("");
  const [sort, setSort]               = useState("date_desc");
  const [openId, setOpenId]           = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasActiveFilters =
    search || statusFilter !== "ALL" || dateFrom || dateTo || priceMin || priceMax;

  function clearAll() {
    setSearch(""); setStatusFilter("ALL");
    setDateFrom(""); setDateTo("");
    setPriceMin(""); setPriceMax("");
  }

  const filtered = useMemo(() => {
    let list = [...orders];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.items.some((i) => i.productName.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== "ALL") {
      list = list.filter((o) => o.status === statusFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      list = list.filter((o) => new Date(o.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter((o) => new Date(o.createdAt) <= to);
    }
    if (priceMin) {
      list = list.filter((o) => o.total >= parseInt(priceMin));
    }
    if (priceMax) {
      list = list.filter((o) => o.total <= parseInt(priceMax));
    }

    list.sort((a, b) => {
      if (sort === "date_desc")  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === "date_asc")   return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === "price_desc") return b.total - a.total;
      if (sort === "price_asc")  return a.total - b.total;
      return 0;
    });

    return list;
  }, [orders, search, statusFilter, dateFrom, dateTo, priceMin, priceMax, sort]);

  // Active filter chips
  const chips: { label: string; clear: () => void }[] = [];
  if (statusFilter !== "ALL") chips.push({ label: STATUS_LABELS[statusFilter] ?? statusFilter, clear: () => setStatusFilter("ALL") });
  if (dateFrom)               chips.push({ label: `Desde ${new Date(dateFrom).toLocaleDateString("es-CL")}`, clear: () => setDateFrom("") });
  if (dateTo)                 chips.push({ label: `Hasta ${new Date(dateTo).toLocaleDateString("es-CL")}`, clear: () => setDateTo("") });
  if (priceMin)               chips.push({ label: `Mín $${parseInt(priceMin).toLocaleString("es-CL")}`, clear: () => setPriceMin("") });
  if (priceMax)               chips.push({ label: `Máx $${parseInt(priceMax).toLocaleString("es-CL")}`, clear: () => setPriceMax("") });

  return (
    <div className="space-y-5">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por producto o número de pedido…"
            className="w-full bg-[#F7F4F1] border border-[#D8BFAE] pl-8 pr-3 py-2 text-xs text-[#5C4A3E] placeholder:text-[#8E7A6B]/60 outline-none focus:border-[#CDA78F]"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] hover:text-[#5C4A3E]">
              <X size={12} strokeWidth={1.5} />
            </button>
          )}
        </div>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 text-[10px] tracking-[0.1em] uppercase border transition-colors ${
            showAdvanced
              ? "bg-[#CDA78F] border-[#CDA78F] text-white"
              : "bg-[#F7F4F1] border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] hover:text-[#5C4A3E]"
          }`}
        >
          <SlidersHorizontal size={12} strokeWidth={1.5} />
          Filtros
        </button>

        {/* Sort */}
        <div className="relative">
          <ArrowUpDown size={12} strokeWidth={1.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="appearance-none bg-[#F7F4F1] border border-[#D8BFAE] pl-7 pr-7 py-2 text-[10px] tracking-[0.08em] text-[#5C4A3E] outline-none focus:border-[#CDA78F] cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={11} strokeWidth={1.5} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
        </div>
      </div>

      {/* Advanced filters panel */}
      {showAdvanced && (
        <div className="bg-[#F7F4F1] border border-[#D8BFAE] px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Status */}
          <div className="space-y-1">
            <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Estado</label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none bg-white border border-[#D8BFAE] px-3 py-2 text-[11px] text-[#5C4A3E] outline-none focus:border-[#CDA78F] cursor-pointer"
              >
                <option value="ALL">Todos</option>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
            </div>
          </div>

          {/* Date from */}
          <div className="space-y-1">
            <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-[11px] text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
            />
          </div>

          {/* Date to */}
          <div className="space-y-1">
            <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-[11px] text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
            />
          </div>

          {/* Price range */}
          <div className="space-y-1">
            <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Rango de precio (CLP)</label>
            <div className="flex gap-1">
              <input
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="Mín"
                className="w-1/2 bg-white border border-[#D8BFAE] px-2 py-2 text-[11px] text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
              />
              <input
                type="number"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="Máx"
                className="w-1/2 bg-white border border-[#D8BFAE] px-2 py-2 text-[11px] text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active chips + count */}
      {(chips.length > 0 || true) && (
        <div className="flex items-center gap-2 flex-wrap">
          {chips.map((c) => (
            <span
              key={c.label}
              className="flex items-center gap-1 bg-[#EDE2D8] text-[#5C4A3E] text-[10px] tracking-[0.08em] px-2.5 py-1"
            >
              {c.label}
              <button onClick={c.clear} className="text-[#8E7A6B] hover:text-[#5C4A3E] ml-0.5">
                <X size={10} strokeWidth={2} />
              </button>
            </span>
          ))}
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="text-[10px] tracking-[0.08em] uppercase text-[#8E7A6B] hover:text-[#5C4A3E] underline underline-offset-2 transition-colors"
            >
              Limpiar todo
            </button>
          )}
          <span className="text-[10px] text-[#8E7A6B] ml-auto">
            {filtered.length} {filtered.length === 1 ? "pedido" : "pedidos"}
          </span>
        </div>
      )}

      {/* Orders */}
      {filtered.length === 0 ? (
        <div className="border-t border-[#D8BFAE] pt-8 text-center py-16">
          <Package size={32} strokeWidth={1} className="text-[#D8BFAE] mx-auto mb-3" />
          <p className="text-sm text-[#8E7A6B] font-light">
            {hasActiveFilters ? "Ningún pedido coincide con los filtros." : "Aún no tienes pedidos."}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={clearAll}
              className="inline-block mt-5 border border-[#D8BFAE] hover:border-[#CDA78F] text-[#8E7A6B] text-[10px] tracking-[0.25em] uppercase px-7 py-3 transition-colors"
            >
              Limpiar filtros
            </button>
          ) : (
            <Link
              href="/tienda"
              className="inline-block mt-5 bg-brand-sand hover:bg-brand-taupe text-white text-[10px] tracking-[0.25em] uppercase px-7 py-3 transition-colors"
            >
              Explorar tienda
            </Link>
          )}
        </div>
      ) : (
        <div className="divide-y divide-[#D8BFAE] border-t border-[#D8BFAE]">
          {filtered.map((o) => {
            const isOpen = openId === o.id;
            const hasTracking = o.trackingNumber || o.carrier;
            return (
              <div key={o.id}>
                {/* Row */}
                <button
                  onClick={() => setOpenId(isOpen ? null : o.id)}
                  className="w-full flex items-center justify-between py-4 gap-4 text-left group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-[#8E7A6B] mb-0.5 tracking-wide">
                      {new Date(o.createdAt).toLocaleDateString("es-CL")} · {o.orderNumber}
                    </p>
                    <p className="text-sm text-[#5C4A3E] truncate">
                      {o.items[0]?.productName ?? "Pedido"}
                      {o.items.length > 1 && (
                        <span className="text-[#8E7A6B]"> +{o.items.length - 1} más</span>
                      )}
                    </p>
                    {hasTracking && (
                      <p className="flex items-center gap-1 mt-1 text-[10px] text-[#CDA78F]">
                        <Truck size={11} strokeWidth={1.5} />
                        {o.carrier ? carrierLabel(o.carrier) : ""}
                        {o.carrier && o.trackingNumber ? " · " : ""}
                        {o.trackingNumber ? (
                          <span className="font-mono tracking-wide text-[#5C4A3E]">{o.trackingNumber}</span>
                        ) : null}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="font-heading text-base text-[#5C4A3E]">
                      ${o.total.toLocaleString("es-CL")} CLP
                    </p>
                    <span className={`text-[9px] tracking-[0.12em] uppercase px-2.5 py-1 ${STATUS_STYLES[o.status] ?? ""}`}>
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                    <ChevronDown
                      size={14}
                      strokeWidth={1.5}
                      className={`text-[#8E7A6B] transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="pb-5 pt-1 space-y-3">
                    {/* Products list */}
                    <div className="bg-[#F7F4F1] border border-[#D8BFAE] divide-y divide-[#D8BFAE]">
                      {o.items.map((item, idx) => (
                        <p key={idx} className="px-4 py-2.5 text-xs text-[#5C4A3E]">
                          {item.productName}
                        </p>
                      ))}
                    </div>

                    {/* Boleta / payment message */}
                    {(() => {
                      const banner = paymentBanner(o.paymentMethod, supportEmail, supportPhone);
                      if (!banner) return null;
                      const isInfo = banner.style === "info";
                      return (
                        <div className={`flex items-start gap-2.5 px-4 py-3 ${isInfo ? "bg-blue-50 border border-blue-100" : "bg-[#EDE2D8]/70 border border-[#D8BFAE]"}`}>
                          <Info size={13} strokeWidth={1.5} className={`mt-0.5 shrink-0 ${isInfo ? "text-blue-400" : "text-[#CDA78F]"}`} />
                          <div className="text-xs">
                            <p className={isInfo ? "text-blue-700" : "text-[#5C4A3E]"}>{banner.text}</p>
                            {"contact" in banner && banner.contact && (
                              <p className="text-[#8E7A6B] mt-1">{banner.contact}</p>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Tracking */}
                    <div className="flex items-start gap-2.5 bg-[#EDE2D8]/60 px-4 py-3">
                      <Truck size={14} strokeWidth={1.5} className="text-[#CDA78F] mt-0.5 shrink-0" />
                      {hasTracking ? (
                        <div className="space-y-1 text-xs">
                          {o.carrier && (
                            <p className="text-[#5C4A3E]">
                              <span className="text-[#8E7A6B]">Empresa de envío: </span>
                              <strong className="font-medium">{carrierLabel(o.carrier)}</strong>
                            </p>
                          )}
                          {o.trackingNumber && (
                            <p className="text-[#5C4A3E]">
                              <span className="text-[#8E7A6B]">Número de seguimiento: </span>
                              <span className="font-mono tracking-wide bg-white px-1.5 py-0.5 border border-[#D8BFAE] text-[11px]">{o.trackingNumber}</span>
                            </p>
                          )}
                          {o.shippedAt && (
                            <p className="text-[#8E7A6B] text-[11px]">
                              Despachado el {new Date(o.shippedAt).toLocaleDateString("es-CL")}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-[#8E7A6B]">
                          {["SHIPPED", "PROCESSING", "PAID"].includes(o.status)
                            ? "El número de seguimiento estará disponible cuando se despache tu pedido."
                            : "Sin información de envío disponible."}
                        </p>
                      )}
                    </div>
                    {/* Receipt link */}
                    <div className="flex justify-end pt-1">
                      <Link
                        href={`/cuenta/comprobante/${o.id}`}
                        target="_blank"
                        className="flex items-center gap-1.5 text-[10px] tracking-[0.12em] uppercase text-[#8E7A6B] hover:text-[#5C4A3E] border border-[#D8BFAE] hover:border-[#CDA78F] px-3 py-2 transition-colors"
                      >
                        <FileText size={11} strokeWidth={1.5} />
                        Ver comprobante PDF
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Link
        href="/tienda"
        className="inline-block mt-4 bg-brand-sand hover:bg-brand-taupe text-white text-[10px] tracking-[0.25em] uppercase px-7 py-3 transition-colors"
      >
        Seguir comprando
      </Link>
    </div>
  );
}
