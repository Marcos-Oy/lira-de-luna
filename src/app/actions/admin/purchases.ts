"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireActiveAdmin } from "@/lib/require-admin";

const requireAdmin = requireActiveAdmin;

async function generatePurchaseNumber() {
  const count = await prisma.purchase.count();
  return `OC-${String(count + 1).padStart(4, "0")}`;
}

// ─── Suppliers ────────────────────────────────────────────────

export async function getSuppliers() {
  return prisma.supplier.findMany({ orderBy: { name: "asc" } });
}

export async function createSupplier(data: {
  name: string; contactName?: string; email?: string;
  phone?: string; rut?: string; address?: string; notes?: string;
}) {
  await requireAdmin();
  if (!data.name.trim()) return { error: "El nombre es obligatorio" };
  const supplier = await prisma.supplier.create({ data });
  revalidatePath("/admin/compras");
  return { supplier };
}

export async function updateSupplier(id: string, data: {
  name?: string; contactName?: string; email?: string;
  phone?: string; rut?: string; address?: string; notes?: string;
}) {
  await requireAdmin();
  const supplier = await prisma.supplier.update({ where: { id }, data });
  revalidatePath("/admin/compras");
  return { supplier };
}

export async function deleteSupplier(id: string) {
  await requireAdmin();
  const count = await prisma.purchase.count({ where: { supplierId: id } });
  if (count > 0) return { error: "El proveedor tiene compras asociadas y no puede eliminarse" };
  await prisma.supplier.delete({ where: { id } });
  revalidatePath("/admin/compras");
  return { success: true };
}

// ─── Purchases ────────────────────────────────────────────────

export type PurchaseItemInput = {
  description:  string;
  sku?:         string;
  material?:    string;
  purchaseMode: string;   // RETAIL | WHOLESALE
  unit:         string;   // pcs | g | kg | oz | ct | lote | m
  quantity:     number;
  unitCost:     number;
};

function buildItemCreate(i: PurchaseItemInput) {
  return {
    description:  i.description,
    sku:          i.sku      || null,
    material:     i.material || null,
    purchaseMode: i.purchaseMode,
    unit:         i.unit,
    quantity:     i.quantity,
    unitCost:     i.unitCost,
    totalCost:    Math.round(i.unitCost * i.quantity),
  };
}

export async function createPurchase(data: {
  supplierId?: string; supplierName?: string;
  paymentMethod?: string; notes?: string;
  orderedAt: string; expectedAt?: string;
  includeTax: boolean;
  items: PurchaseItemInput[];
}) {
  await requireAdmin();
  if (!data.items.length) return { error: "Agrega al menos un producto" };

  const purchaseNumber = await generatePurchaseNumber();
  const subtotal  = data.items.reduce((s, i) => s + Math.round(i.unitCost * i.quantity), 0);
  const taxAmount = data.includeTax ? Math.round(subtotal * 0.19) : 0;
  const total     = subtotal + taxAmount;

  const purchase = await prisma.purchase.create({
    data: {
      purchaseNumber,
      supplierId:    data.supplierId   || null,
      supplierName:  data.supplierName || null,
      status:        "DRAFT",
      paymentStatus: "UNPAID",
      paymentMethod: data.paymentMethod || null,
      subtotal, taxAmount, total,
      notes:      data.notes || null,
      orderedAt:  new Date(data.orderedAt),
      expectedAt: data.expectedAt ? new Date(data.expectedAt) : null,
      items: { create: data.items.map(buildItemCreate) },
    },
    include: { items: true, supplier: true },
  });

  revalidatePath("/admin/compras");
  return { purchase };
}

export async function updatePurchase(id: string, data: {
  supplierId?: string | null; supplierName?: string;
  paymentMethod?: string; notes?: string;
  orderedAt: string; expectedAt?: string; receivedAt?: string;
  includeTax: boolean;
  items: (PurchaseItemInput & { id?: string })[];
}) {
  await requireAdmin();
  if (!data.items.length) return { error: "Agrega al menos un producto" };

  const subtotal  = data.items.reduce((s, i) => s + Math.round(i.unitCost * i.quantity), 0);
  const taxAmount = data.includeTax ? Math.round(subtotal * 0.19) : 0;
  const total     = subtotal + taxAmount;

  await prisma.purchaseItem.deleteMany({ where: { purchaseId: id } });

  const purchase = await prisma.purchase.update({
    where: { id },
    data: {
      supplierId:    data.supplierId ?? null,
      supplierName:  data.supplierName || null,
      paymentMethod: data.paymentMethod || null,
      notes:         data.notes || null,
      orderedAt:     new Date(data.orderedAt),
      expectedAt:    data.expectedAt ? new Date(data.expectedAt) : null,
      receivedAt:    data.receivedAt ? new Date(data.receivedAt) : null,
      subtotal, taxAmount, total,
      items: { create: data.items.map(buildItemCreate) },
    },
    include: { items: true, supplier: true },
  });

  revalidatePath("/admin/compras");
  revalidatePath(`/admin/compras/${id}`);
  return { purchase };
}

export async function updatePurchaseStatus(id: string, status: string) {
  await requireAdmin();
  const data: Record<string, unknown> = { status };
  if (status === "RECEIVED") data.receivedAt = new Date();
  const purchase = await prisma.purchase.update({ where: { id }, data });
  revalidatePath("/admin/compras");
  revalidatePath(`/admin/compras/${id}`);
  return { purchase };
}

export async function updatePurchasePayment(id: string, paymentStatus: string, paymentMethod?: string) {
  await requireAdmin();
  const purchase = await prisma.purchase.update({
    where: { id },
    data: {
      paymentStatus: paymentStatus as "UNPAID" | "PARTIAL" | "PAID",
      ...(paymentMethod ? { paymentMethod } : {}),
    },
  });
  revalidatePath("/admin/compras");
  revalidatePath(`/admin/compras/${id}`);
  return { purchase };
}

export async function deletePurchase(id: string) {
  await requireAdmin();
  await prisma.purchase.delete({ where: { id } });
  revalidatePath("/admin/compras");
  return { success: true };
}
