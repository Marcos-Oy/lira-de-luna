"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { AdminJWTPayload } from "@/controllers/admin-auth.controller";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) throw new Error("No autorizado");
  try {
    return jwt.verify(token, process.env.ADMIN_JWT_SECRET!) as AdminJWTPayload;
  } catch {
    throw new Error("No autorizado");
  }
}

export async function createReturn(data: {
  orderId:     string;
  type:        "PRODUCT_RETURN" | "MONEY_REFUND" | "DEFECTIVE" | "EXCHANGE";
  amount?:     number;
  description: string;
  notes?:      string;
}) {
  const admin = await requireAdmin();

  if (!data.orderId || !data.description.trim()) {
    return { error: "Datos incompletos" };
  }

  const order = await prisma.order.findUnique({ where: { id: data.orderId } });
  if (!order) return { error: "Pedido no encontrado" };

  const ret = await prisma.return.create({
    data: {
      orderId:     data.orderId,
      type:        data.type,
      amount:      data.amount ?? null,
      description: data.description.trim(),
      notes:       data.notes?.trim() || null,
      adminId:     admin.adminId,
    },
  });

  revalidatePath("/admin/devoluciones");
  return { success: true, id: ret.id };
}

export async function updateReturnStatus(
  id: string,
  status: "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED",
  applyRefundToOrder: boolean,
) {
  await requireAdmin();

  const ret = await prisma.return.findUnique({ where: { id }, include: { order: true } });
  if (!ret) return { error: "Devolución no encontrada" };

  await prisma.return.update({
    where: { id },
    data: { status },
  });

  // When a money refund is completed, update order + paymentStatus
  if (status === "COMPLETED" && ret.type === "MONEY_REFUND" && applyRefundToOrder) {
    await prisma.order.update({
      where: { id: ret.orderId },
      data: { status: "REFUNDED", paymentStatus: "REFUNDED" },
    });
    revalidatePath("/admin/pagos");
    revalidatePath("/admin");
  }

  revalidatePath("/admin/devoluciones");
  return { success: true };
}

export async function deleteReturn(id: string) {
  await requireAdmin();
  await prisma.return.delete({ where: { id } });
  revalidatePath("/admin/devoluciones");
  return { success: true };
}

export async function getReturns(filters?: {
  type?:   string;
  status?: string;
  q?:      string;
}) {
  await requireAdmin();

  return prisma.return.findMany({
    where: {
      ...(filters?.type   ? { type:   filters.type   as "PRODUCT_RETURN" | "MONEY_REFUND" | "DEFECTIVE" | "EXCHANGE" } : {}),
      ...(filters?.status ? { status: filters.status as "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED" } : {}),
      ...(filters?.q ? {
        OR: [
          { description: { contains: filters.q } },
          { order: { orderNumber: { contains: filters.q } } },
        ],
      } : {}),
    },
    include: {
      order: {
        select: {
          orderNumber: true,
          total: true,
          guestName: true,
          guestEmail: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
