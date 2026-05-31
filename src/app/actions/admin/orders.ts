"use server";

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { matchLeadToOrder } from "@/lib/crm-order-match";
import { requireActiveAdmin } from "@/lib/require-admin";

const requireAdmin = requireActiveAdmin;

export async function updateOrderStatus(orderId: string, status: string) {
  await requireAdmin();
  await prisma.order.update({
    where: { id: orderId },
    data: { status: status as import("@prisma/client").OrderStatus },
  });

  if (status === "PAID") {
    void matchLeadToOrder(orderId).catch(() => undefined);
  }

  revalidatePath("/admin/pagos");
  revalidatePath("/admin");
  return { success: true };
}

type BulkFilters = {
  q?: string; status?: string; method?: string;
  dateFrom?: string; dateTo?: string; tracking?: string;
};

export async function bulkUpdateOrderStatus(
  newStatus: string,
  selection: { ids: string[] } | { filters: BulkFilters; totalCount: number },
) {
  await requireAdmin();

  let where: Prisma.OrderWhereInput;

  if ("ids" in selection) {
    if (!selection.ids.length) return { success: true, updated: 0 };
    where = { id: { in: selection.ids } };
  } else {
    const f = selection.filters;
    where = {};
    if (f.q) {
      where.OR = [
        { orderNumber: { contains: f.q } },
        { user:        { name:  { contains: f.q } } },
        { user:        { email: { contains: f.q } } },
        { guestEmail:  { contains: f.q } },
        { guestName:   { contains: f.q } },
      ];
    }
    if (f.status) where.status = f.status as Prisma.EnumOrderStatusFilter;
    if (f.method) where.paymentMethod = { contains: f.method };
    if (f.dateFrom || f.dateTo) {
      const dtFilter: Prisma.DateTimeFilter = {};
      if (f.dateFrom) dtFilter.gte = new Date(f.dateFrom);
      if (f.dateTo) {
        const end = new Date(f.dateTo);
        end.setHours(23, 59, 59, 999);
        dtFilter.lte = end;
      }
      where.createdAt = dtFilter;
    }
    if (f.tracking === "with") {
      where.AND = [{ trackingNumber: { not: null } }, { carrier: { not: null } }];
    } else if (f.tracking === "without") {
      where.OR = [...(where.OR ?? []), { trackingNumber: null }, { carrier: null }];
    }
  }

  const result = await prisma.order.updateMany({
    where,
    data: { status: newStatus as import("@prisma/client").OrderStatus },
  });

  revalidatePath("/admin/pagos");
  revalidatePath("/admin");
  return { success: true, updated: result.count };
}

export async function updateOrderTracking(orderId: string, data: {
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
  shippedAt?: string;
}) {
  await requireAdmin();
  await prisma.order.update({
    where: { id: orderId },
    data: {
      trackingNumber: data.trackingNumber || null,
      carrier:        data.carrier        || null,
      notes:          data.notes          || null,
      shippedAt:      data.shippedAt ? new Date(data.shippedAt) : null,
    },
  });
  revalidatePath(`/admin/pagos/${orderId}`);
  revalidatePath("/admin/pagos");
  return { success: true };
}
