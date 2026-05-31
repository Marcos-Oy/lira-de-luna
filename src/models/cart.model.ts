import { prisma } from "@/lib/db";

const cartInclude = {
  items: {
    include: {
      product: { select: { id: true, name: true, images: true, price: true, saleType: true } },
      variant: true,
    },
  },
};

async function upsertCartItem(
  cartId: string,
  productId: string,
  quantity: number,
  variantId?: string,
  weightGrams?: number
) {
  const existing = await prisma.cartItem.findFirst({
    where: { cartId, productId, variantId: variantId ?? null },
  });

  if (existing) {
    return prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity, ...(weightGrams !== undefined && { weightGrams }) },
    });
  }

  return prisma.cartItem.create({
    data: { cartId, productId, quantity, variantId: variantId ?? null, weightGrams: weightGrams ?? null },
  });
}

export const CartModel = {
  findByUserId: (userId: string) =>
    prisma.cart.findUnique({ where: { userId }, include: cartInclude }),

  findBySessionId: (sessionId: string) =>
    prisma.cart.findUnique({ where: { sessionId }, include: cartInclude }),

  createForUser: (userId: string) =>
    prisma.cart.create({ data: { userId }, include: cartInclude }),

  createForSession: (sessionId: string) =>
    prisma.cart.create({ data: { sessionId }, include: cartInclude }),

  addItem: (cartId: string, productId: string, quantity: number, variantId?: string, weightGrams?: number) =>
    upsertCartItem(cartId, productId, quantity, variantId, weightGrams),

  updateItem: (id: string, quantity: number) =>
    prisma.cartItem.update({ where: { id }, data: { quantity } }),

  removeItem: (id: string) => prisma.cartItem.delete({ where: { id } }),

  clearCart: (cartId: string) =>
    prisma.cartItem.deleteMany({ where: { cartId } }),

  mergeGuestCart: async (sessionId: string, userId: string) => {
    const guestCart = await prisma.cart.findUnique({
      where: { sessionId },
      include: { items: true },
    });
    if (!guestCart || guestCart.items.length === 0) return;

    const userCart = await prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    for (const item of guestCart.items) {
      await upsertCartItem(
        userCart.id,
        item.productId,
        item.quantity,
        item.variantId ?? undefined,
        item.weightGrams ?? undefined
      );
    }

    await prisma.cart.delete({ where: { id: guestCart.id } });
  },
};
