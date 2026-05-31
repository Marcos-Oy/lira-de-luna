import { CartModel } from "@/models/cart.model";
import { NextResponse } from "next/server";
import { z } from "zod";

const addItemSchema = z.object({
  productId: z.string().cuid(),
  variantId: z.string().cuid().optional(),
  quantity: z.number().int().min(1).default(1),
  weightGrams: z.number().positive().optional(),
});

export const CartController = {
  getCart: async (userId?: string, sessionId?: string) => {
    const cart = userId
      ? await CartModel.findByUserId(userId)
      : sessionId
        ? await CartModel.findBySessionId(sessionId)
        : null;

    return NextResponse.json(cart ?? { items: [] });
  },

  addItem: async (body: unknown, userId?: string, sessionId?: string) => {
    const parsed = addItemSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    let cart = userId
      ? (await CartModel.findByUserId(userId)) ?? (await CartModel.createForUser(userId))
      : sessionId
        ? (await CartModel.findBySessionId(sessionId)) ?? (await CartModel.createForSession(sessionId))
        : null;

    if (!cart) return NextResponse.json({ error: "Sin carrito" }, { status: 400 });

    await CartModel.addItem(
      cart.id,
      parsed.data.productId,
      parsed.data.quantity,
      parsed.data.variantId,
      parsed.data.weightGrams
    );

    // Recargar con items actualizados
    cart = userId
      ? await CartModel.findByUserId(userId)
      : await CartModel.findBySessionId(sessionId!);

    return NextResponse.json(cart);
  },

  updateItem: async (itemId: string, body: unknown) => {
    const parsed = z.object({ quantity: z.number().int().min(1) }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    await CartModel.updateItem(itemId, parsed.data.quantity);
    return NextResponse.json({ success: true });
  },

  removeItem: async (itemId: string) => {
    await CartModel.removeItem(itemId);
    return NextResponse.json({ success: true });
  },
};
