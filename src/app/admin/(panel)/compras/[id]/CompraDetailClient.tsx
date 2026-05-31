"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Pencil, Trash2, Check, X, Plus, ChevronDown,
  Package, Building2, CalendarDays, CreditCard, Save,
} from "lucide-react";
import {
  updatePurchase, updatePurchaseStatus, updatePurchasePayment,
  deletePurchase, createSupplier,
} from "@/app/actions/admin/purchases";
import { UNITS, MATERIALS, ItemRowForm } from "../ComprasClient";

// ─── Constants ───────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  DRAFT:     { label: "Borrador",  color: "bg-[#EDE2D8] text-[#8E7A6B]",     dot: "bg-[#8E7A6B]"   },
  ORDERED:   { label: "Ordenada",  color: "bg-blue-50 text-blue-600",         dot: "bg-blue-400"    },
  RECEIVED:  { label: "Recibida",  color: "bg-emerald-50 text-emerald-600",   dot: "bg-emerald-500" },
  PARTIAL:   { label: "Parcial",   color: "bg-amber-50 text-amber-600",       dot: "bg-amber-400"   },
  CANCELLED: { label: "Cancelada", color: "bg-red-50 text-red-400",           dot: "bg-red-400"     },
};

const PAY_META: Record<string, { label: string; color: string }> = {
  UNPAID:  { label: "Sin pagar",    color: "bg-red-50 text-red-400"        },
  PARTIAL: { label: "Pago parcial", color: "bg-amber-50 text-amber-600"   },
  PAID:    { label: "Pagado",       color: "bg-emerald-50 text-emerald-600" },
};

const STATUS_FLOW: Record<string, string[]> = {
  DRAFT:     ["ORDERED", "CANCELLED"],
  ORDERED:   ["RECEIVED", "PARTIAL", "CANCELLED"],
  PARTIAL:   ["RECEIVED", "CANCELLED"],
  RECEIVED:  [],
  CANCELLED: ["DRAFT"],
};

const PAY_FLOW: Record<string, string[]> = {
  UNPAID:  ["PARTIAL", "PAID"],
  PARTIAL: ["PAID"],
  PAID:    [],
};

const PAYMENT_METHODS = [
  "Transferencia", "Efectivo", "Tarjeta de crédito", "Tarjeta de débito",
  "Cheque", "Crédito proveedor", "Otro",
];

// ─── Types ───────────────────────────────────────────────────

type PurchaseItem = {
  id: string; description: string; sku: string | null;
  material: string | null; purchaseMode: string; unit: string;
  quantity: number; unitCost: number; totalCost: number;
};

export type ItemRow = {
  id?: string; description: string; sku: string; material: string;
  purchaseMode: string; unit: string; quantity: string; unitCost: string;
};

type Supplier = { id: string; name: string; email: string | null; phone: string | null; rut: string | null };

type Purchase = {
  id: string; purchaseNumber: string;
  supplierId: string | null; supplierName: string | null;
  supplierEmail: string | null; supplierPhone: string | null; supplierRut: string | null;
  status: string; paymentStatus: string; paymentMethod: string | null;
  subtotal: number; taxAmount: number; total: number;
  notes: string | null;
  orderedAt: string; expectedAt: string | null; receivedAt: string | null;
  createdAt: string; updatedAt: string;
  items: PurchaseItem[];
};

interface Props { purchase: Purchase; suppliers: Supplier[] }

function rowFromItem(i: PurchaseItem): ItemRow {
  return {
    id: i.id, description: i.description, sku: i.sku ?? "",
    material: i.material ?? "", purchaseMode: i.purchaseMode,
    unit: i.unit, quantity: String(i.quantity), unitCost: String(i.unitCost),
  };
}

function emptyRow(): ItemRow {
  return { description: "", sku: "", material: "", purchaseMode: "RETAIL", unit: "pcs", quantity: "1", unitCost: "" };
}

function formatQty(qty: number, unit: string) {
  const u = UNITS.find((u) => u.value === unit);
  const formatted = u?.decimal
    ? qty.toLocaleString("es-CL", { maximumFractionDigits: 3 })
    : qty.toLocaleString("es-CL");
  return `${formatted} ${unit}`;
}

// ─── Component ───────────────────────────────────────────────

export default function CompraDetailClient({ purchase: initial, suppliers: initialSuppliers }: Props) {
  const router = useRouter();

  const [p, setP]                       = useState(initial);
  const [suppliers, setSuppliers]       = useState(initialSuppliers);
  const [editing, setEditing]           = useState(false);
  const [isPending, start]              = useTransition();
  const [statusPending, startStatus]    = useTransition();
  const [payPending, startPay]          = useTransition();
  const [delPending, startDel]          = useTransition();
  const [supPending, startSup]          = useTransition();
  const [saved, setSaved]               = useState(false);
  const [editError, setEditError]       = useState("");

  // Edit form state
  const [supplierId, setSupplierId]     = useState(p.supplierId ?? "");
  const [supplierName, setSupplierName] = useState(p.supplierName ?? "");
  const [orderedAt, setOrderedAt]       = useState(p.orderedAt.slice(0, 10));
  const [expectedAt, setExpectedAt]     = useState(p.expectedAt?.slice(0, 10) ?? "");
  const [receivedAt, setReceivedAt]     = useState(p.receivedAt?.slice(0, 10) ?? "");
  const [payMethod, setPayMethod]       = useState(p.paymentMethod ?? "");
  const [notes, setNotes]               = useState(p.notes ?? "");
  const [includeTax, setIncludeTax]     = useState(p.taxAmount > 0);
  const [items, setItems]               = useState<ItemRow[]>(p.items.map(rowFromItem));

  // New supplier inline
  const [showNewSup, setShowNewSup]         = useState(false);
  const [newSupName, setNewSupName]         = useState("");
  const [newSupContact, setNewSupContact]   = useState("");
  const [newSupEmail, setNewSupEmail]       = useState("");
  const [newSupPhone, setNewSupPhone]       = useState("");
  const [newSupRut, setNewSupRut]           = useState("");
  const [newSupAddress, setNewSupAddress]   = useState("");

  // Payment modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payStatusSel, setPayStatusSel] = useState("");
  const [payMethodSel, setPayMethodSel] = useState(p.paymentMethod ?? "");

  // ── Computed ──────────────────────────────────────────────
  const subtotalCalc = items.reduce((s, i) => s + (parseFloat(i.unitCost) || 0) * (parseFloat(i.quantity) || 0), 0);
  const taxCalc      = includeTax ? Math.round(subtotalCalc * 0.19) : 0;
  const totalCalc    = subtotalCalc + taxCalc;

  function updateItem(idx: number, field: keyof ItemRow, val: string) {
    setItems((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  }

  // ── Status change ─────────────────────────────────────────
  function handleStatusChange(newStatus: string) {
    startStatus(async () => {
      const res = await updatePurchaseStatus(p.id, newStatus);
      if ("error" in res) return;
      setP((prev) => ({
        ...prev,
        status: newStatus,
        receivedAt: newStatus === "RECEIVED" ? new Date().toISOString() : prev.receivedAt,
      }));
    });
  }

  // ── Payment change ────────────────────────────────────────
  function handlePayChange() {
    if (!payStatusSel) return;
    startPay(async () => {
      await updatePurchasePayment(p.id, payStatusSel, payMethodSel || undefined);
      setP((prev) => ({ ...prev, paymentStatus: payStatusSel, paymentMethod: payMethodSel || prev.paymentMethod }));
      setShowPayModal(false);
    });
  }

  // ── Save edit ─────────────────────────────────────────────
  function handleSave() {
    const validItems = items.filter((i) => i.description.trim() && parseFloat(i.unitCost) > 0 && parseFloat(i.quantity) > 0);
    if (!validItems.length) { setEditError("Agrega al menos un producto válido"); return; }
    setEditError("");
    start(async () => {
      const res = await updatePurchase(p.id, {
        supplierId:    supplierId || null,
        supplierName:  supplierId ? undefined : supplierName,
        paymentMethod: payMethod || undefined,
        notes:         notes || undefined,
        orderedAt, expectedAt: expectedAt || undefined, receivedAt: receivedAt || undefined,
        includeTax,
        items: validItems.map((i) => ({
          id: i.id, description: i.description, sku: i.sku || undefined,
          material:     i.material     || undefined,
          purchaseMode: i.purchaseMode,
          unit:         i.unit,
          quantity: parseFloat(i.quantity), unitCost: parseFloat(i.unitCost),
        })),
      });
      if ("error" in res) { setEditError(res.error ?? "Error"); return; }
      const updated = res.purchase!;
      const sup     = suppliers.find((s) => s.id === updated.supplierId);
      setP((prev) => ({
        ...prev,
        supplierId:    updated.supplierId,
        supplierName:  sup?.name ?? updated.supplierName ?? prev.supplierName,
        paymentMethod: updated.paymentMethod,
        subtotal:      updated.subtotal,
        taxAmount:     updated.taxAmount,
        total:         updated.total,
        notes:         updated.notes,
        orderedAt:     updated.orderedAt.toISOString(),
        expectedAt:    updated.expectedAt?.toISOString() ?? null,
        receivedAt:    updated.receivedAt?.toISOString() ?? null,
        items:         updated.items,
        updatedAt:     updated.updatedAt.toISOString(),
      }));
      setItems(updated.items.map(rowFromItem));
      setSaved(true);
      setTimeout(() => { setSaved(false); setEditing(false); }, 1200);
    });
  }

  function cancelEdit() {
    setSupplierId(p.supplierId ?? ""); setSupplierName(p.supplierName ?? "");
    setOrderedAt(p.orderedAt.slice(0, 10)); setExpectedAt(p.expectedAt?.slice(0, 10) ?? "");
    setReceivedAt(p.receivedAt?.slice(0, 10) ?? ""); setPayMethod(p.paymentMethod ?? "");
    setNotes(p.notes ?? ""); setIncludeTax(p.taxAmount > 0);
    setItems(p.items.map(rowFromItem));
    setEditError(""); setEditing(false);
  }

  // ── Delete ────────────────────────────────────────────────
  function handleDelete() {
    if (!confirm(`¿Eliminar la orden ${p.purchaseNumber}? Esta acción no se puede deshacer.`)) return;
    startDel(async () => {
      await deletePurchase(p.id);
      router.push("/admin/compras");
    });
  }

  // ── New supplier inline ───────────────────────────────────
  function handleCreateSupplier() {
    if (!newSupName.trim()) return;
    startSup(async () => {
      const res = await createSupplier({
        name: newSupName, contactName: newSupContact,
        email: newSupEmail, phone: newSupPhone,
        rut: newSupRut, address: newSupAddress,
      });
      if ("error" in res) return;
      const s = res.supplier!;
      setSuppliers((prev) => [...prev, { id: s.id, name: s.name, email: s.email, phone: s.phone, rut: s.rut }].sort((a, b) => a.name.localeCompare(b.name)));
      setSupplierId(s.id);
      setShowNewSup(false);
      setNewSupName(""); setNewSupContact(""); setNewSupEmail(""); setNewSupPhone(""); setNewSupRut(""); setNewSupAddress("");
    });
  }

  const sm             = STATUS_META[p.status] ?? STATUS_META.DRAFT;
  const pm             = PAY_META[p.paymentStatus] ?? PAY_META.UNPAID;
  const nextStatuses   = STATUS_FLOW[p.status] ?? [];
  const nextPayStatuses = PAY_FLOW[p.paymentStatus] ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* datalist for material autocomplete */}
      <datalist id="materials-list">
        {MATERIALS.map((m) => <option key={m} value={m} />)}
      </datalist>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/compras" className="flex items-center gap-1.5 text-[10px] tracking-[0.12em] uppercase text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors">
            <ArrowLeft size={13} strokeWidth={1.5} />
            Compras
          </Link>
          <div>
            <h1 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">{p.purchaseNumber}</h1>
            <p className="text-xs text-[#8E7A6B] mt-0.5">
              Creada el {new Date(p.createdAt).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editing ? (
            <>
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-2 text-[10px] tracking-[0.12em] uppercase border border-[#D8BFAE] hover:border-[#CDA78F] text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors">
                <Pencil size={11} strokeWidth={1.5} /> Editar
              </button>
              <button onClick={handleDelete} disabled={delPending} className="flex items-center gap-1.5 px-3 py-2 text-[10px] tracking-[0.12em] uppercase border border-transparent text-[#D8BFAE] hover:text-red-400 hover:border-red-200 transition-colors disabled:opacity-50">
                <Trash2 size={11} strokeWidth={1.5} /> Eliminar
              </button>
            </>
          ) : (
            <>
              <button onClick={cancelEdit} className="flex items-center gap-1.5 px-3 py-2 text-[10px] tracking-[0.12em] uppercase border border-[#D8BFAE] hover:border-[#CDA78F] text-[#8E7A6B] transition-colors">
                <X size={11} strokeWidth={1.5} /> Cancelar
              </button>
              <button onClick={handleSave} disabled={isPending} className="flex items-center gap-1.5 px-3 py-2 text-[10px] tracking-[0.12em] uppercase bg-[#CDA78F] hover:bg-[#8E7A6B] text-white transition-colors disabled:opacity-50">
                {saved ? <><Check size={11} /> Guardado</> : isPending ? "Guardando…" : <><Save size={11} strokeWidth={1.5} /> Guardar</>}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* ── Left: main info ────────────────────────────────── */}
        <div className="col-span-2 space-y-4">

          {editError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2">{editError}</p>}

          {/* Supplier card */}
          <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 size={13} strokeWidth={1.5} className="text-[#8E7A6B]" />
              <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Proveedor</p>
            </div>
            {!editing ? (
              <div>
                <p className="text-sm text-[#5C4A3E] font-medium">{p.supplierName ?? "—"}</p>
                {p.supplierEmail && <p className="text-xs text-[#8E7A6B]">{p.supplierEmail}</p>}
                {p.supplierPhone && <p className="text-xs text-[#8E7A6B]">{p.supplierPhone}</p>}
                {p.supplierRut   && <p className="text-xs text-[#8E7A6B]">RUT: {p.supplierRut}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                {!showNewSup ? (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full appearance-none bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] cursor-pointer">
                        <option value="">Sin proveedor registrado</option>
                        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
                    </div>
                    <button onClick={() => setShowNewSup(true)} className="px-2.5 py-2 text-[9px] tracking-[0.1em] uppercase bg-[#EDE2D8] hover:bg-[#D8BFAE] text-[#5C4A3E] whitespace-nowrap transition-colors">
                      + Nuevo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 bg-white border border-[#D8BFAE] p-3">
                    <input value={newSupName} onChange={(e) => setNewSupName(e.target.value)} placeholder="Nombre / Empresa *" className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-2 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                    <div className="grid grid-cols-2 gap-1.5">
                      <input value={newSupContact} onChange={(e) => setNewSupContact(e.target.value)} placeholder="Contacto" className="bg-[#F7F4F1] border border-[#D8BFAE] px-2 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                      <input value={newSupRut} onChange={(e) => setNewSupRut(e.target.value)} placeholder="RUT" className="bg-[#F7F4F1] border border-[#D8BFAE] px-2 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                      <input value={newSupEmail} onChange={(e) => setNewSupEmail(e.target.value)} placeholder="Correo" className="bg-[#F7F4F1] border border-[#D8BFAE] px-2 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                      <input value={newSupPhone} onChange={(e) => setNewSupPhone(e.target.value)} placeholder="Teléfono" className="bg-[#F7F4F1] border border-[#D8BFAE] px-2 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                    </div>
                    <input value={newSupAddress} onChange={(e) => setNewSupAddress(e.target.value)} placeholder="Dirección" className="w-full bg-[#F7F4F1] border border-[#D8BFAE] px-2 py-1.5 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setShowNewSup(false)} className="text-[10px] uppercase text-[#8E7A6B] hover:text-[#5C4A3E]">Cancelar</button>
                      <button onClick={handleCreateSupplier} disabled={!newSupName.trim() || supPending} className="px-3 py-1.5 text-[10px] uppercase bg-[#CDA78F] hover:bg-[#8E7A6B] text-white disabled:opacity-50">
                        {supPending ? "…" : "Guardar"}
                      </button>
                    </div>
                  </div>
                )}
                {!supplierId && !showNewSup && (
                  <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="O escribe el nombre…" className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                )}
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays size={13} strokeWidth={1.5} className="text-[#8E7A6B]" />
              <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Fechas</p>
            </div>
            {!editing ? (
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div><p className="text-[#8E7A6B] mb-0.5">Ordenada</p><p className="text-[#5C4A3E]">{new Date(p.orderedAt).toLocaleDateString("es-CL")}</p></div>
                <div><p className="text-[#8E7A6B] mb-0.5">Entrega esperada</p><p className="text-[#5C4A3E]">{p.expectedAt ? new Date(p.expectedAt).toLocaleDateString("es-CL") : "—"}</p></div>
                <div><p className="text-[#8E7A6B] mb-0.5">Fecha de recepción</p><p className="text-[#5C4A3E]">{p.receivedAt ? new Date(p.receivedAt).toLocaleDateString("es-CL") : "—"}</p></div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Ordenada *", value: orderedAt, set: setOrderedAt },
                  { label: "Entrega esperada", value: expectedAt, set: setExpectedAt },
                  { label: "Fecha de recepción", value: receivedAt, set: setReceivedAt },
                ].map((f) => (
                  <div key={f.label} className="space-y-1">
                    <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">{f.label}</label>
                    <input type="date" value={f.value} onChange={(e) => f.set(e.target.value)} className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={13} strokeWidth={1.5} className="text-[#8E7A6B]" />
                <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Productos / Materiales</p>
              </div>
              {editing && (
                <button onClick={() => setItems((prev) => [...prev, emptyRow()])} className="flex items-center gap-1 text-[10px] uppercase text-[#CDA78F] hover:text-[#8E7A6B]">
                  <Plus size={11} /> Agregar línea
                </button>
              )}
            </div>

            {!editing ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#D8BFAE]">
                      {["Descripción", "Material", "Modo", "Cantidad", "Costo unit.", "Total"].map((h) => (
                        <th key={h} className="pb-2 text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B] font-normal text-left pr-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8BFAE]/50">
                    {p.items.map((i) => (
                      <tr key={i.id}>
                        <td className="py-2.5 text-xs text-[#5C4A3E] pr-3">{i.description}</td>
                        <td className="py-2.5 text-[11px] text-[#8E7A6B] pr-3">{i.material || "—"}</td>
                        <td className="py-2.5 pr-3">
                          <span className={`text-[9px] tracking-[0.08em] uppercase px-1.5 py-0.5 ${i.purchaseMode === "WHOLESALE" ? "bg-blue-50 text-blue-600" : "bg-[#EDE2D8] text-[#8E7A6B]"}`}>
                            {i.purchaseMode === "WHOLESALE" ? "Mayorista" : "Minorista"}
                          </span>
                        </td>
                        <td className="py-2.5 text-xs text-[#8E7A6B] pr-3">{formatQty(i.quantity, i.unit)}</td>
                        <td className="py-2.5 text-xs text-[#8E7A6B] pr-3">${i.unitCost.toLocaleString("es-CL")}</td>
                        <td className="py-2.5 text-xs text-[#5C4A3E] font-medium">${i.totalCost.toLocaleString("es-CL")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#D8BFAE]">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="bg-[#EDE2D8]/40 border-b border-[#D8BFAE]">
                      {["Modalidad", "Descripción", "Material", "Unidad", "Cantidad", "Costo/u (CLP)", "Total", ""].map((h) => (
                        <th key={h} className="px-2 py-2 text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B] text-left font-normal whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row, idx) => (
                      <ItemRowForm
                        key={idx}
                        row={row}
                        idx={idx}
                        onChange={updateItem}
                        onRemove={(i) => setItems((prev) => prev.filter((_, j) => j !== i))}
                        canRemove={items.length > 1}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals */}
            <div className="flex justify-end pt-2 border-t border-[#D8BFAE]">
              <div className="w-52 space-y-1 text-xs">
                <div className="flex justify-between text-[#8E7A6B]">
                  <span>Subtotal</span>
                  <span>${(editing ? subtotalCalc : p.subtotal).toLocaleString("es-CL")}</span>
                </div>
                <div className="flex items-center justify-between text-[#8E7A6B]">
                  {editing ? (
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={includeTax} onChange={(e) => setIncludeTax(e.target.checked)} className="accent-[#CDA78F]" />
                      IVA 19%
                    </label>
                  ) : <span>IVA 19%</span>}
                  <span>${(editing ? taxCalc : p.taxAmount).toLocaleString("es-CL")}</span>
                </div>
                <div className="flex justify-between font-medium border-t border-[#D8BFAE] pt-1 text-[#5C4A3E]">
                  <span>Total</span>
                  <span className="font-heading text-sm">${(editing ? totalCalc : p.total).toLocaleString("es-CL")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {(p.notes || editing) && (
            <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-4">
              <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] mb-2">Notas internas</p>
              {!editing ? (
                <p className="text-xs text-[#5C4A3E]">{p.notes}</p>
              ) : (
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Referencias, condiciones, etc." className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] resize-none" />
              )}
            </div>
          )}
        </div>

        {/* ── Right: status & payment ────────────────────────── */}
        <div className="space-y-4">

          {/* Status card */}
          <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-4 space-y-3">
            <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Estado de la orden</p>
            <span className={`flex items-center gap-1.5 text-[9px] tracking-[0.1em] uppercase px-2.5 py-1.5 w-fit ${sm.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
              {sm.label}
            </span>
            {nextStatuses.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Cambiar a</p>
                {nextStatuses.map((ns) => {
                  const m = STATUS_META[ns];
                  return (
                    <button
                      key={ns}
                      onClick={() => handleStatusChange(ns)}
                      disabled={statusPending}
                      className={`w-full flex items-center gap-1.5 text-[9px] tracking-[0.1em] uppercase px-2.5 py-1.5 border transition-colors disabled:opacity-50 ${m.color} border-current/20 hover:opacity-80`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment card */}
          <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard size={13} strokeWidth={1.5} className="text-[#8E7A6B]" />
              <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Pago</p>
            </div>
            <span className={`text-[9px] tracking-[0.1em] uppercase px-2.5 py-1.5 w-fit ${pm.color}`}>{pm.label}</span>
            {p.paymentMethod && <p className="text-xs text-[#8E7A6B]">{p.paymentMethod}</p>}
            {editing && (
              <div className="space-y-1.5">
                <label className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B]">Método de pago</label>
                <div className="relative">
                  <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full appearance-none bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] cursor-pointer">
                    <option value="">Sin especificar</option>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
                </div>
              </div>
            )}
            {nextPayStatuses.length > 0 && !editing && (
              <button
                onClick={() => { setPayStatusSel(""); setPayMethodSel(p.paymentMethod ?? ""); setShowPayModal(true); }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] tracking-[0.12em] uppercase border border-[#D8BFAE] hover:border-[#CDA78F] text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors"
              >
                Registrar pago
              </button>
            )}
          </div>

          {/* Summary totals */}
          <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-4 space-y-2 text-xs">
            <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Resumen</p>
            <div className="flex justify-between text-[#8E7A6B]">
              <span>Subtotal</span><span>${p.subtotal.toLocaleString("es-CL")}</span>
            </div>
            {p.taxAmount > 0 && (
              <div className="flex justify-between text-[#8E7A6B]">
                <span>IVA (19%)</span><span>${p.taxAmount.toLocaleString("es-CL")}</span>
              </div>
            )}
            <div className="flex justify-between font-medium text-[#5C4A3E] border-t border-[#D8BFAE] pt-2">
              <span>Total</span>
              <span className="font-heading text-sm">${p.total.toLocaleString("es-CL")}</span>
            </div>
            <p className="text-[10px] text-[#8E7A6B] pt-1">
              Actualizada: {new Date(p.updatedAt).toLocaleDateString("es-CL")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Payment modal ───────────────────────────────────── */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8BFAE]">
              <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E]">Registrar pago</h2>
              <button onClick={() => setShowPayModal(false)} className="text-[#8E7A6B] hover:text-[#5C4A3E]"><X size={16} strokeWidth={1.5} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Estado de pago</label>
                <div className="flex flex-col gap-2">
                  {nextPayStatuses.map((ps) => {
                    const m = PAY_META[ps];
                    return (
                      <label key={ps} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="payStatus" value={ps} checked={payStatusSel === ps} onChange={() => setPayStatusSel(ps)} className="accent-[#CDA78F]" />
                        <span className={`text-[9px] tracking-[0.1em] uppercase px-2 py-1 ${m.color}`}>{m.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Método de pago</label>
                <div className="relative">
                  <select value={payMethodSel} onChange={(e) => setPayMethodSel(e.target.value)} className="w-full appearance-none bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] cursor-pointer">
                    <option value="">Sin especificar</option>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E7A6B] pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#D8BFAE] flex justify-end gap-3">
              <button onClick={() => setShowPayModal(false)} className="px-5 py-2 text-[10px] tracking-[0.12em] uppercase text-[#8E7A6B] border border-[#D8BFAE] hover:border-[#CDA78F] transition-colors">
                Cancelar
              </button>
              <button onClick={handlePayChange} disabled={!payStatusSel || payPending} className="flex items-center gap-1.5 px-5 py-2 text-[10px] tracking-[0.12em] uppercase bg-[#CDA78F] hover:bg-[#8E7A6B] text-white transition-colors disabled:opacity-50">
                {payPending ? "Guardando…" : <><Check size={11} /> Confirmar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
