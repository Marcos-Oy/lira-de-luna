import { prisma } from "@/lib/db";

export const OrderModel = {
  // ── Lecturas ────────────────────────────────────────────────

  findAll: (page = 1, limit = 20, filters?: { status?: string; userId?: string }) =>
    prisma.order.findMany({
      where: {
        ...(filters?.status && { status: filters.status as never }),
        ...(filters?.userId && { userId: filters.userId }),
      },
      include: {
        user:            { select: { name: true, email: true } },
        items:           { include: { product: { select: { name: true, images: true } } } },
        shippingAddress: true,
      },
      skip:    (page - 1) * limit,
      take:    limit,
      orderBy: { createdAt: "desc" },
    }),

  findById: (id: string) =>
    prisma.order.findUnique({
      where:   { id },
      include: {
        user:            { select: { name: true, email: true } },
        items:           { include: { product: true, variant: true } },
        shippingAddress: true,
        coupon:          true,
      },
    }),

  /** Incluye items + usuario — para emails y pasarelas de pago. */
  findByIdWithItems: (id: string) =>
    prisma.order.findUnique({
      where:   { id },
      include: { items: true, user: { select: { email: true, name: true } } },
    }),

  findByOrderNumber: (orderNumber: string) =>
    prisma.order.findUnique({ where: { orderNumber } }),

  /** Incluye items + usuario — necesario para calcular totales en la pasarela. */
  findByOrderNumberWithItems: (orderNumber: string) =>
    prisma.order.findUnique({
      where:   { orderNumber },
      include: { items: true, user: { select: { email: true } } },
    }),

  findByUserId: (userId: string) =>
    prisma.order.findMany({
      where:   { userId },
      include: { items: { include: { product: { select: { name: true, images: true } } } } },
      orderBy: { createdAt: "desc" },
    }),

  /** Devuelve solo los ítems de una orden (para descuento de stock y emails). */
  findItemsById: (orderId: string) =>
    prisma.orderItem.findMany({
      where:  { orderId },
      select: { productId: true, variantId: true, quantity: true, productName: true, variantLabel: true },
    }),

  // ── Escrituras ──────────────────────────────────────────────

  create: (data: Parameters<typeof prisma.order.create>[0]["data"]) =>
    prisma.order.create({ data }),

  update: (id: string, data: Parameters<typeof prisma.order.update>[0]["data"]) =>
    prisma.order.update({ where: { id }, data }),

  /** Marca una orden como pagada. Acepta campos opcionales de MercadoPago. */
  markPaid: (
    orderNumber: string,
    extra: { mpPaymentId?: string; mpMerchantOrderId?: string; mpStatus?: string } = {},
  ) =>
    prisma.order.update({
      where: { orderNumber },
      data: {
        paymentStatus: "PAID",
        status:        "PAID",
        paidAt:        new Date(),
        ...(extra.mpPaymentId       && { mpPaymentId:       extra.mpPaymentId }),
        ...(extra.mpMerchantOrderId && { mpMerchantOrderId: extra.mpMerchantOrderId }),
        ...(extra.mpStatus          && { mpStatus:          extra.mpStatus }),
      },
    }),

  saveMpPreferenceId: (orderNumber: string, preferenceId: string) =>
    prisma.order.update({
      where: { orderNumber },
      data:  { mpPreferenceId: preferenceId },
    }),

  // ── Stock ───────────────────────────────────────────────────

  decrementProductStock: (productId: string, qty: number) =>
    prisma.product.update({
      where:  { id: productId },
      data:   { stock: { decrement: qty } },
      select: { stock: true },
    }),

  decrementVariantStock: (variantId: string, qty: number) =>
    prisma.productVariant.update({
      where:  { id: variantId },
      data:   { stock: { decrement: qty } },
      select: { stock: true },
    }),

  // ── Auditoría ───────────────────────────────────────────────

  createEmailLog: (data: { id: string; to: string; subject: string; type: string; status: string }) =>
    prisma.emailLog.create({ data: { ...data, type: data.type as never } }),

  // ── Estadísticas ────────────────────────────────────────────

  count: () => prisma.order.count(),

  revenueStats: () =>
    prisma.order.aggregate({
      where: { paymentStatus: "PAID" },
      _sum:  { total: true },
      _count: { id: true },
    }),

  /** Genera un número de orden único basado en timestamp (evita race conditions). */
  generateOrderNumber: () => `LDL-${Date.now().toString(36).toUpperCase()}`,
};
