import { prisma } from "@/lib/db";

export const CouponModel = {
  findByCode: (code: string) =>
    prisma.coupon.findUnique({ where: { code: code.toUpperCase() } }),

  findAll: () =>
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),

  create: (data: Parameters<typeof prisma.coupon.create>[0]["data"]) =>
    prisma.coupon.create({ data }),

  update: (id: string, data: Parameters<typeof prisma.coupon.update>[0]["data"]) =>
    prisma.coupon.update({ where: { id }, data }),

  incrementUsage: (id: string) =>
    prisma.coupon.update({ where: { id }, data: { usedCount: { increment: 1 } } }),

  delete: (id: string) => prisma.coupon.delete({ where: { id } }),

  validate: async (code: string, orderAmount: number) => {
    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

    if (!coupon || !coupon.isActive) return { valid: false, error: "Cupón no válido" };
    if (coupon.expiresAt && coupon.expiresAt < new Date()) return { valid: false, error: "Cupón expirado" };
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return { valid: false, error: "Cupón agotado" };
    if (coupon.minOrderAmount !== null && orderAmount < coupon.minOrderAmount)
      return { valid: false, error: `Pedido mínimo: $${coupon.minOrderAmount.toLocaleString("es-CL")} CLP` };

    return { valid: true, coupon };
  },
};
