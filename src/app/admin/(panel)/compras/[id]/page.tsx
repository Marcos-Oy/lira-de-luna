import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import CompraDetailClient from "./CompraDetailClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Detalle de compra — Admin" };

export default async function CompraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [purchase, suppliers] = await Promise.all([
    prisma.purchase.findUnique({
      where: { id },
      include: { supplier: true, items: true },
    }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!purchase) notFound();

  return (
    <CompraDetailClient
      purchase={{
        id:             purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        supplierId:     purchase.supplierId,
        supplierName:   purchase.supplier?.name ?? purchase.supplierName ?? null,
        supplierEmail:  purchase.supplier?.email ?? null,
        supplierPhone:  purchase.supplier?.phone ?? null,
        supplierRut:    purchase.supplier?.rut   ?? null,
        status:         purchase.status,
        paymentStatus:  purchase.paymentStatus,
        paymentMethod:  purchase.paymentMethod,
        subtotal:       purchase.subtotal,
        taxAmount:      purchase.taxAmount,
        total:          purchase.total,
        notes:          purchase.notes,
        orderedAt:      purchase.orderedAt.toISOString(),
        expectedAt:     purchase.expectedAt?.toISOString()  ?? null,
        receivedAt:     purchase.receivedAt?.toISOString()  ?? null,
        createdAt:      purchase.createdAt.toISOString(),
        updatedAt:      purchase.updatedAt.toISOString(),
        items: purchase.items.map((i) => ({
          id: i.id, description: i.description, sku: i.sku,
          material: i.material, purchaseMode: i.purchaseMode, unit: i.unit,
          quantity: i.quantity, unitCost: i.unitCost, totalCost: i.totalCost,
        })),
      }}
      suppliers={suppliers.map((s) => ({ id: s.id, name: s.name, email: s.email, phone: s.phone, rut: s.rut }))}
    />
  );
}
