"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import type { AdminJWTPayload } from "@/controllers/admin-auth.controller"
import { matchLeadToOrder } from "@/lib/crm-order-match"

async function requireAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_token")?.value
  if (!token) throw new Error("No autorizado")
  try {
    return jwt.verify(token, process.env.ADMIN_JWT_SECRET!) as AdminJWTPayload
  } catch {
    throw new Error("No autorizado")
  }
}

export type PresencialCartItem = {
  productId: string
  productName: string
  variantId: string | null
  variantLabel: string | null
  quantity: number
  unitPrice: number   // CLP integer
}

export async function createPresencialOrder(data: {
  items: PresencialCartItem[]
  paymentMethod: "CASH" | "CARD" | "TRANSFER" | "PAYMENT_LINK"
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  discount?: number   // amount off total, default 0
  notes?: string
}) {
  await requireAdmin()
  if (!data.items.length) return { error: "El carrito está vacío" }

  const subtotal = data.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const discount = data.discount ?? 0
  const total    = Math.max(0, subtotal - discount)

  // Generate order number: P-YYYYMMDD-XXXX
  const now  = new Date()
  const date = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`
  const rand = Math.floor(1000 + Math.random() * 9000)
  const orderNumber = `P-${date}-${rand}`

  const order = await prisma.order.create({
    data: {
      orderNumber,
      channel: "PRESENCIAL",
      status: "PAID",
      paymentStatus: "PAID",
      paymentMethod: data.paymentMethod,
      presencialPayment: data.paymentMethod,
      paidAt: now,
      subtotal,
      discountAmount: discount,
      shippingAmount: 0,
      total,
      guestName:  data.customerName  || null,
      guestPhone: data.customerPhone || null,
      guestEmail: data.customerEmail || null,
      notes:      data.notes         || null,
      items: {
        create: data.items.map(i => ({
          productId:    i.productId,
          productName:  i.productName,
          variantId:    i.variantId   || undefined,
          variantLabel: i.variantLabel || null,
          quantity:     i.quantity,
          unitPrice:    i.unitPrice,
          totalPrice:   i.unitPrice * i.quantity,
          saleType:     "UNIT",
        })),
      },
    },
  })

  void matchLeadToOrder(order.id).catch(() => undefined)

  revalidatePath("/admin/pagos")
  revalidatePath("/admin")
  return { success: true, orderId: order.id, orderNumber: order.orderNumber }
}
