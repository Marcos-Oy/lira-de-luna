"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  ShoppingBag, Plus, X, ChevronDown, Search, SlidersHorizontal,
  ArrowUpDown, Check, Trash2, ExternalLink,
} from "lucide-react";
import { createPurchase, createSupplier } from "@/app/actions/admin/purchases";

// ─── Shared constants ────────────────────────────────────────

export const UNITS: { value: string; label: string; decimal: boolean }[] = [
  { value: "pcs",   label: "Piezas",       decimal: false },
  { value: "g",     label: "Gramos (g)",   decimal: true  },
  { value: "kg",    label: "Kilogramos",   decimal: true  },
  { value: "oz",    label: "Onzas troy",   decimal: true  },
  { value: "ct",    label: "Quilates",     decimal: true  },
  { value: "lote",  label: "Lote",         decimal: false },
  { value: "m",     label: "Metros (m)",   decimal: true  },
  { value: "cm",    label: "Centímetros",  decimal: true  },
];

export const MATERIALS = [
  "Plata 925", "Plata fina", "Plata 950",
  "Oro 18k", "Oro 14k", "Oro 9k", "Oro rosa 18k", "Oro blanco 18k",
  "Acero inoxidable 316L", "Acero quirúrgico",
  "Latón", "Cobre", "Bronce",
  "Circones", "Piedras naturales", "Cristal Swarovski",
  "Perlas", "Perlas cultivadas", "Nácar",
  "Cuero", "Cordón", "Hilo de seda",
];

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  DRAFT:     { label: "Borrador",   color: "bg-[#EDE2D8] text-[#8E7A6B]",     dot: "bg-[#8E7A6B]"   },
  ORDERED:   { label: "Ordenada",   color: "bg-blue-50 text-blue-600",         dot: "bg-blue-400"    },
  RECEIVED:  { label: "Recibida",   color: "bg-emerald-50 text-emerald-600",   dot: "bg-emerald-500" },
  PARTIAL:   { label: "Parcial",    color: "bg-amber-50 text-amber-600",       dot: "bg-amber-400"   },
  CANCELLED: { label: "Cancelada",  color: "bg-red-50 text-red-400",           dot: "bg-red-400"     },
};

const PAY_META: Record<string, { label: string; color: string }> = {
  UNPAID:  { label: "Sin pagar",    color: "bg-red-50 text-red-400"        },
  PARTIAL: { label: "Pago parcial", color: "bg-amber-50 text-amber-600"    },
  PAID:    { label: "Pagado",       color: "bg-emerald-50 text-emerald-600" },
};

const SORT_OPTIONS = [
  { value: "date_desc",   label: "Más recientes"  },
  { value: "date_asc",    label: "Más antiguas"   },
  { value: "amount_desc", label: "Mayor monto"    },
  { value: "amount_asc",  label: "Menor monto"    },
];

const PAYMENT_METHODS = [
  "Transferencia", "Efectivo", "Tarjeta de crédito", "Tarjeta de débito",
  "Cheque", "Crédito proveedor", "Otro",
];

// ─── Types ───────────────────────────────────────────────────

type Purchase = {
  id: string; purchaseNumber: string;
  supplierId: string | null; supplierName: string;
  status: string; paymentStatus: string; paymentMethod: string | null;
  subtotal: number; taxAmount: number; total: number;
  notes: string | null;
  orderedAt: string; expectedAt: string | null; receivedAt: string | null;
  itemCount: number; createdAt: string;
};

type Supplier = { id: string; name: string; email: string | null; phone: string | null; rut: string | null };

type ItemRow = {
  description: string; sku: string; material: string;
  purchaseMode: string; unit: string;
  quantity: string; unitCost: string;
};

interface Props {
  purchases: Purchase[];
  suppliers: Supplier[];
  kpis: { totalOrders: number; totalAmount: number; thisMonthAmount: number; pendingPayment: number };
}

function emptyItem(): ItemRow {
  return { description: "", sku: "", material: "", purchaseMode: "RETAIL", unit: "pcs", quantity: "1", unitCost: "" };
}

function formatQty(qty: number, unit: string) {
  const u = UNITS.find((u) => u.value === unit);
  const formatted = u?.decimal ? qty.toLocaleString("es-CL", { maximumFractionDigits: 3 }) : qty.toLocaleString("es-CL");
  return `${formatted} ${unit}`;
}

// ─── Item row component ───────────────────────────────────────

export function ItemRowForm({ row, idx, onChange, onRemove, canRemove }: {
  row: ItemRow; idx: number;
  onChange: (idx: number, field: keyof ItemRow, val: string) => void;
  onRemove: (idx: number) => void;
  canRemove: boolean;
}) {
  const isWholesale = row.purchaseMode === "WHOLESALE";
  const unitMeta    = UNITS.find((u) => u.value === row.unit);
  const isDecimal   = unitMeta?.decimal ?? false;
  const lineTotal   = Math.round((parseFloat(row.unitCost) || 0) * (parseFloat(row.quantity) || 0));

  return (
    <tr className="border-b border-[#D8BFAE] last:border-0">
      {/* Modalidad */}
      <td className="px-2 py-2 w-28">
        <div className="relative">
          <select
            value={row.purchaseMode}
            onChange={(e) => {
              onChange(idx, "purchaseMode", e.target.value);
              if (e.target.value === "RETAIL") onChange(idx, "unit", "pcs");
            }}
            className="w-full appearance-none bg-transparent text-[10px] text-[#5C4A3E] outline-none border-b border-transparent focus:border-[#CDA78F] py-0.5 pr-4 cursor-pointer"
          >
            <option value="RETAIL">Minorista</option>
            <option value="WHOLESALE">Mayorista</option>
          </select>
          <ChevronDown size={9} className="absolute right-0 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
        </div>
      </td>
      {/* Descripción */}
      <td className="px-2 py-2">
        <input
          value={row.description}
          onChange={(e) => onChange(idx, "description", e.target.value)}
          placeholder={isWholesale ? "Plata 925 hilo 0.8mm…" : "Argolla Pandora ref. 123…"}
          className="w-full bg-transparent text-xs text-[#5C4A3E] outline-none border-b border-transparent focus:border-[#CDA78F] py-0.5"
        />
      </td>
      {/* Material */}
      <td className="px-2 py-2 w-32">
        <input
          value={row.material}
          onChange={(e) => onChange(idx, "material", e.target.value)}
          list="materials-list"
          placeholder="Plata 925…"
          className="w-full bg-transparent text-xs text-[#8E7A6B] outline-none border-b border-transparent focus:border-[#CDA78F] py-0.5"
        />
      </td>
      {/* Unidad */}
      <td className="px-2 py-2 w-24">
        <div className="relative">
          <select
            value={row.unit}
            onChange={(e) => onChange(idx, "unit", e.target.value)}
            className={`w-full appearance-none bg-transparent text-xs outline-none border-b border-transparent focus:border-[#CDA78F] py-0.5 pr-4 cursor-pointer ${isWholesale ? "text-[#5C4A3E]" : "text-[#8E7A6B]"}`}
          >
            {UNITS.map((u) => (
              <option key={u.value} value={u.value} disabled={row.purchaseMode === "RETAIL" && u.value !== "pcs" && u.value !== "lote"}>
                {u.label}
              </option>
            ))}
          </select>
          <ChevronDown size={9} className="absolute right-0 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
        </div>
      </td>
      {/* Cantidad */}
      <td className="px-2 py-2 w-20">
        <input
          type="number"
          min="0"
          step={isDecimal ? "0.001" : "1"}
          value={row.quantity}
          onChange={(e) => onChange(idx, "quantity", e.target.value)}
          className="w-full bg-transparent text-xs text-[#5C4A3E] outline-none border-b border-transparent focus:border-[#CDA78F] py-0.5 text-center"
        />
      </td>
      {/* Costo/u */}
      <td className="px-2 py-2 w-28">
        <input
          type="number"
          min="0"
          value={row.unitCost}
          onChange={(e) => onChange(idx, "unitCost", e.target.value)}
          placeholder="0"
          className="w-full bg-transparent text-xs text-[#5C4A3E] outline-none border-b border-transparent focus:border-[#CDA78F] py-0.5"
        />
        {row.unit !== "pcs" && row.unit !== "lote" && (
          <p className="text-[9px] text-[#8E7A6B]">por {row.unit}</p>
        )}
      </td>
      {/* Total */}
      <td className="px-2 py-2 w-24 text-xs text-[#5C4A3E] font-medium whitespace-nowrap">
        ${lineTotal.toLocaleString("es-CL")}
      </td>
      {/* Delete */}
      <td className="px-1 py-2 w-6">
        {canRemove && (
          <button onClick={() => onRemove(idx)} className="text-[#D8BFAE] hover:text-red-400 transition-colors">
            <Trash2 size={12} strokeWidth={1.5} />
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Supplier quick-create ────────────────────────────────────

function SupplierQuickCreate({ onSave, onCancel }: { onSave: (s: Supplier) => void; onCancel: () => void }) {
  const [name, setName]         = useState("");
  const [contact, setContact]   = useState("");
  const [email, setEmail]       = useState("");
  const [phone, setPhone]       = useState("");
  const [rut, setRut]           = useState("");
  const [address, setAddress]   = useState("");
  const [isPending, start]      = useTransition();

  function handleSave() {
    if (!name.trim()) return;
    start(async () => {
      const res = await createSupplier({ name, contactName: contact, email, phone, rut, address });
      if ("error" in res) return;
      onSave({ id: res.supplier!.id, name: res.supplier!.name, email: res.supplier!.email, phone: res.supplier!.phone, rut: res.supplier!.rut });
    });
  }

  return (
    <div className="space-y-3 bg-[#F7F4F1] border border-[#D8BFAE] p-4">
      <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">Crear nuevo proveedor</p>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 space-y-1">
          <label className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Nombre / Empresa *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pandora Chile, Proveedor plata…" className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Contacto</label>
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Nombre del representante" className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">RUT</label>
          <input value={rut} onChange={(e) => setRut(e.target.value)} placeholder="76.123.456-7" className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Correo</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ventas@proveedor.cl" className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Teléfono</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+56 9 1234 5678" className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Dirección</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Av. Libertador 1234, Santiago" className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="text-[10px] tracking-[0.1em] uppercase text-[#8E7A6B] hover:text-[#5C4A3E] px-3 py-1.5">Cancelar</button>
        <button onClick={handleSave} disabled={!name.trim() || isPending} className="px-4 py-1.5 text-[10px] tracking-[0.1em] uppercase bg-[#CDA78F] hover:bg-[#8E7A6B] text-white transition-colors disabled:opacity-50">
          {isPending ? "Guardando…" : "Guardar proveedor"}
        </button>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────

export default function ComprasClient({ purchases: initial, suppliers: initialSuppliers, kpis }: Props) {
  const [purchases, setPurchases]   = useState(initial);
  const [suppliers, setSuppliers]   = useState(initialSuppliers);

  // Filters
  const [search, setSearch]         = useState("");
  const [statusF, setStatusF]       = useState("ALL");
  const [payF, setPayF]             = useState("ALL");
  const [supplierF, setSupplierF]   = useState("ALL");
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo, setDateTo]         = useState("");
  const [sort, setSort]             = useState("date_desc");
  const [showFilters, setShowFilters] = useState(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]             = useState({
    supplierId: "", supplierName: "",
    orderedAt: new Date().toISOString().slice(0, 10),
    expectedAt: "", paymentMethod: "", notes: "", includeTax: false,
  });
  const [items, setItems]           = useState<ItemRow[]>([emptyItem()]);
  const [formError, setFormError]   = useState("");
  const [isPending, start]          = useTransition();
  const [showNewSupplier, setShowNewSupplier] = useState(false);

  // ── Computed ──────────────────────────────────────────────
  const hasFilters = search || statusF !== "ALL" || payF !== "ALL" || supplierF !== "ALL" || dateFrom || dateTo;

  const filtered = useMemo(() => {
    let list = [...purchases];
    if (search) { const q = search.toLowerCase(); list = list.filter((p) => p.purchaseNumber.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q)); }
    if (statusF   !== "ALL") list = list.filter((p) => p.status === statusF);
    if (payF      !== "ALL") list = list.filter((p) => p.paymentStatus === payF);
    if (supplierF !== "ALL") list = list.filter((p) => p.supplierId === supplierF);
    if (dateFrom) list = list.filter((p) => new Date(p.orderedAt) >= new Date(dateFrom));
    if (dateTo)   { const t = new Date(dateTo); t.setHours(23,59,59,999); list = list.filter((p) => new Date(p.orderedAt) <= t); }
    list.sort((a, b) => {
      if (sort === "date_desc")   return new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime();
      if (sort === "date_asc")    return new Date(a.orderedAt).getTime() - new Date(b.orderedAt).getTime();
      if (sort === "amount_desc") return b.total - a.total;
      if (sort === "amount_asc")  return a.total - b.total;
      return 0;
    });
    return list;
  }, [purchases, search, statusF, payF, supplierF, dateFrom, dateTo, sort]);

  const subtotalCalc = items.reduce((s, i) => s + Math.round((parseFloat(i.unitCost) || 0) * (parseFloat(i.quantity) || 0)), 0);
  const taxCalc      = form.includeTax ? Math.round(subtotalCalc * 0.19) : 0;
  const totalCalc    = subtotalCalc + taxCalc;

  function updateItem(idx: number, field: keyof ItemRow, val: string) {
    setItems((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  }

  function handleCreate() {
    const valid = items.filter((i) => i.description.trim() && parseFloat(i.unitCost) > 0 && parseFloat(i.quantity) > 0);
    if (!valid.length) { setFormError("Agrega al menos un producto con descripción, cantidad y costo válidos"); return; }
    setFormError("");
    start(async () => {
      const res = await createPurchase({
        supplierId:    form.supplierId   || undefined,
        supplierName:  form.supplierId   ? undefined : form.supplierName,
        paymentMethod: form.paymentMethod || undefined,
        notes:         form.notes || undefined,
        orderedAt:     form.orderedAt,
        expectedAt:    form.expectedAt || undefined,
        includeTax:    form.includeTax,
        items: valid.map((i) => ({
          description:  i.description,
          sku:          i.sku       || undefined,
          material:     i.material  || undefined,
          purchaseMode: i.purchaseMode,
          unit:         i.unit,
          quantity:     parseFloat(i.quantity),
          unitCost:     parseFloat(i.unitCost),
        })),
      });
      if ("error" in res) { setFormError(res.error ?? "Error"); return; }
      const p = res.purchase!;
      const sup = suppliers.find((s) => s.id === p.supplierId);
      setPurchases((prev) => [{
        id: p.id, purchaseNumber: p.purchaseNumber,
        supplierId: p.supplierId, supplierName: sup?.name ?? p.supplierName ?? "—",
        status: p.status, paymentStatus: p.paymentStatus, paymentMethod: p.paymentMethod,
        subtotal: p.subtotal, taxAmount: p.taxAmount, total: p.total,
        notes: p.notes, orderedAt: p.orderedAt.toISOString(),
        expectedAt: p.expectedAt?.toISOString() ?? null, receivedAt: null,
        itemCount: p.items.length, createdAt: p.createdAt.toISOString(),
      }, ...prev]);
      setShowCreate(false);
      resetForm();
    });
  }

  function resetForm() {
    setForm({ supplierId: "", supplierName: "", orderedAt: new Date().toISOString().slice(0, 10), expectedAt: "", paymentMethod: "", notes: "", includeTax: false });
    setItems([emptyItem()]);
    setFormError("");
    setShowNewSupplier(false);
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-6xl">
      {/* datalist for materials */}
      <datalist id="materials-list">
        {MATERIALS.map((m) => <option key={m} value={m} />)}
      </datalist>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">Compras a proveedores</h1>
          <p className="text-xs text-[#8E7A6B] mt-0.5">Registra órdenes de compra minoristas y mayoristas</p>
        </div>
        <button onClick={() => { setShowCreate(true); resetForm(); }} className="flex items-center gap-2 px-4 py-2 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[9px] tracking-[0.15em] uppercase transition-colors">
          <Plus size={12} strokeWidth={1.75} /> Nueva compra
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Órdenes totales",   value: kpis.totalOrders },
          { label: "Invertido total",   value: `$${kpis.totalAmount.toLocaleString("es-CL")}` },
          { label: "Este mes",          value: `$${kpis.thisMonthAmount.toLocaleString("es-CL")}` },
          { label: "Pendiente de pago", value: `$${kpis.pendingPayment.toLocaleString("es-CL")}` },
        ].map((k) => (
          <div key={k.label} className="bg-[#F7F4F1] border border-[#D8BFAE] px-4 py-3">
            <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">{k.label}</p>
            <p className="font-heading text-xl text-[#5C4A3E] mt-0.5">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por # OC o proveedor…" className="w-full bg-[#F7F4F1] border border-[#D8BFAE] pl-8 pr-3 py-2 text-xs text-[#5C4A3E] placeholder:text-[#8E7A6B]/60 outline-none focus:border-[#CDA78F]" />
          {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B]"><X size={12} /></button>}
        </div>
        <button onClick={() => setShowFilters((v) => !v)} className={`flex items-center gap-1.5 px-3 py-2 text-[10px] tracking-[0.1em] uppercase border transition-colors ${showFilters ? "bg-[#CDA78F] border-[#CDA78F] text-white" : "bg-[#F7F4F1] border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F]"}`}>
          <SlidersHorizontal size={12} strokeWidth={1.5} /> Filtros
        </button>
        <div className="relative">
          <ArrowUpDown size={12} strokeWidth={1.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="appearance-none bg-[#F7F4F1] border border-[#D8BFAE] pl-7 pr-7 py-2 text-[10px] text-[#5C4A3E] outline-none focus:border-[#CDA78F] cursor-pointer">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
        </div>
      </div>

      {showFilters && (
        <div className="bg-[#F7F4F1] border border-[#D8BFAE] px-4 py-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Estado", value: statusF, set: setStatusF, options: [["ALL", "Todos"], ...Object.entries(STATUS_META).map(([k,v]) => [k, v.label])] },
            { label: "Pago",   value: payF,    set: setPayF,    options: [["ALL", "Todos"], ...Object.entries(PAY_META).map(([k,v]) => [k, v.label])] },
          ].map((f) => (
            <div key={f.label} className="space-y-1">
              <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">{f.label}</label>
              <div className="relative">
                <select value={f.value} onChange={(e) => f.set(e.target.value)} className="w-full appearance-none bg-white border border-[#D8BFAE] px-3 py-2 text-[11px] text-[#5C4A3E] outline-none focus:border-[#CDA78F] cursor-pointer">
                  {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
              </div>
            </div>
          ))}
          <div className="space-y-1">
            <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Proveedor</label>
            <div className="relative">
              <select value={supplierF} onChange={(e) => setSupplierF(e.target.value)} className="w-full appearance-none bg-white border border-[#D8BFAE] px-3 py-2 text-[11px] text-[#5C4A3E] outline-none focus:border-[#CDA78F] cursor-pointer">
                <option value="ALL">Todos</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Desde</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-[11px] text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Hasta</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-[11px] text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
          </div>
        </div>
      )}

      <div className="flex items-center">
        {hasFilters && <button onClick={() => { setSearch(""); setStatusF("ALL"); setPayF("ALL"); setSupplierF("ALL"); setDateFrom(""); setDateTo(""); }} className="text-[10px] uppercase text-[#8E7A6B] hover:text-[#5C4A3E] underline underline-offset-2">Limpiar filtros</button>}
        <span className="text-[10px] text-[#8E7A6B] ml-auto">{filtered.length} {filtered.length === 1 ? "orden" : "órdenes"}</span>
      </div>

      {/* Table */}
      <div className="border border-[#D8BFAE] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-14 text-center">
            <ShoppingBag size={28} strokeWidth={1} className="mx-auto text-[#D8BFAE] mb-3" />
            <p className="text-xs text-[#8E7A6B]">{hasFilters ? "Ninguna compra coincide." : "Sin órdenes de compra registradas."}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[#F7F4F1] border-b border-[#D8BFAE]">
                {["# OC", "Fecha", "Proveedor", "Ítems", "Total", "Estado", "Pago", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] text-left font-normal whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8BFAE]">
              {filtered.map((p) => {
                const sm = STATUS_META[p.status] ?? STATUS_META.DRAFT;
                const pm = PAY_META[p.paymentStatus] ?? PAY_META.UNPAID;
                return (
                  <tr key={p.id} className="hover:bg-[#F7F4F1]/50 transition-colors">
                    <td className="px-4 py-3 text-[11px] font-mono text-[#5C4A3E]">{p.purchaseNumber}</td>
                    <td className="px-4 py-3 text-[11px] text-[#8E7A6B] whitespace-nowrap">{new Date(p.orderedAt).toLocaleDateString("es-CL")}</td>
                    <td className="px-4 py-3 text-xs text-[#5C4A3E] max-w-[140px] truncate">{p.supplierName}</td>
                    <td className="px-4 py-3 text-[11px] text-[#8E7A6B] text-center">{p.itemCount}</td>
                    <td className="px-4 py-3 font-heading text-sm text-[#5C4A3E] whitespace-nowrap">${p.total.toLocaleString("es-CL")}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 w-fit ${sm.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sm.dot}`} />{sm.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 ${pm.color}`}>{pm.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/compras/${p.id}`} className="flex items-center gap-1 text-[10px] text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors">
                        <ExternalLink size={11} strokeWidth={1.5} /> Ver
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Create Modal ───────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl shadow-xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8BFAE]">
              <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E]">Nueva orden de compra</h2>
              <button onClick={() => setShowCreate(false)} className="text-[#8E7A6B] hover:text-[#5C4A3E]"><X size={16} strokeWidth={1.5} /></button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {formError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2">{formError}</p>}

              {/* Supplier + dates row */}
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Proveedor</label>
                  {!showNewSupplier ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <select value={form.supplierId} onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value, supplierName: "" }))} className="w-full appearance-none bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] cursor-pointer">
                            <option value="">Seleccionar…</option>
                            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
                        </div>
                        <button onClick={() => setShowNewSupplier(true)} className="px-3 py-2 text-[9px] tracking-[0.1em] uppercase bg-[#EDE2D8] hover:bg-[#D8BFAE] text-[#5C4A3E] whitespace-nowrap transition-colors">
                          + Nuevo
                        </button>
                      </div>
                      {!form.supplierId && (
                        <input value={form.supplierName} onChange={(e) => setForm((f) => ({ ...f, supplierName: e.target.value }))} placeholder="O escribe el nombre libremente…" className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                      )}
                    </div>
                  ) : (
                    <SupplierQuickCreate
                      onSave={(s) => { setSuppliers((p) => [...p, s].sort((a, b) => a.name.localeCompare(b.name))); setForm((f) => ({ ...f, supplierId: s.id })); setShowNewSupplier(false); }}
                      onCancel={() => setShowNewSupplier(false)}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Fecha de orden *</label>
                    <input type="date" value={form.orderedAt} onChange={(e) => setForm((f) => ({ ...f, orderedAt: e.target.value }))} className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Entrega esperada</label>
                    <input type="date" value={form.expectedAt} onChange={(e) => setForm((f) => ({ ...f, expectedAt: e.target.value }))} className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Método de pago</label>
                    <div className="relative">
                      <select value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))} className="w-full appearance-none bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] cursor-pointer">
                        <option value="">Sin especificar</option>
                        {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Notas</label>
                    <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Referencia, condiciones…" className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                  </div>
                </div>
              </div>

              {/* Items table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Productos / Materiales *</label>
                  <button onClick={() => setItems((p) => [...p, emptyItem()])} className="flex items-center gap-1 text-[10px] uppercase text-[#CDA78F] hover:text-[#8E7A6B]">
                    <Plus size={11} /> Agregar línea
                  </button>
                </div>
                <div className="border border-[#D8BFAE] overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="bg-[#F7F4F1] border-b border-[#D8BFAE]">
                        {["Modalidad", "Descripción", "Material", "Unidad", "Cantidad", "Costo/u (CLP)", "Total", ""].map((h) => (
                          <th key={h} className="px-2 py-2 text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B] text-left font-normal whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((row, idx) => (
                        <ItemRowForm key={idx} row={row} idx={idx} onChange={updateItem} onRemove={(i) => setItems((p) => p.filter((_, j) => j !== i))} canRemove={items.length > 1} />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-56 space-y-1 text-xs pt-1">
                    <div className="flex justify-between text-[#8E7A6B]"><span>Subtotal</span><span>${subtotalCalc.toLocaleString("es-CL")}</span></div>
                    <div className="flex items-center justify-between text-[#8E7A6B]">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={form.includeTax} onChange={(e) => setForm((f) => ({ ...f, includeTax: e.target.checked }))} className="accent-[#CDA78F]" />
                        IVA 19%
                      </label>
                      <span>${taxCalc.toLocaleString("es-CL")}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t border-[#D8BFAE] pt-1 text-[#5C4A3E]">
                      <span>Total</span>
                      <span className="font-heading text-sm">${totalCalc.toLocaleString("es-CL")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#D8BFAE] flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-5 py-2 text-[10px] tracking-[0.12em] uppercase text-[#8E7A6B] border border-[#D8BFAE] hover:border-[#CDA78F] transition-colors">Cancelar</button>
              <button onClick={handleCreate} disabled={isPending} className="flex items-center gap-1.5 px-5 py-2 text-[10px] tracking-[0.12em] uppercase bg-[#CDA78F] hover:bg-[#8E7A6B] text-white transition-colors disabled:opacity-50">
                {isPending ? "Guardando…" : <><Check size={11} /> Crear orden</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
