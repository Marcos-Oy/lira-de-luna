"use server";

import { CartModel } from "@/models/cart.model";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

async function getCartIdentifiers() {
  const session = await auth();
  const cookieStore = await cookies();

  if (session?.user?.id) {
    return { userId: session.user.id, sessionId: undefined };
  }

  let sessionId = cookieStore.get("cart_session")?.value;
  if (!sessionId) {
    sessionId = randomUUID();
    cookieStore.set("cart_session", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  return { userId: undefined, sessionId };
}

export async function addToCartAction(productId: string, quantity: number, variantId?: string, weightGrams?: number) {
  const { userId, sessionId } = await getCartIdentifiers();

  const cart = userId
    ? (await CartModel.findByUserId(userId)) ?? (await CartModel.createForUser(userId))
    : (await CartModel.findBySessionId(sessionId!)) ?? (await CartModel.createForSession(sessionId!));

  await CartModel.addItem(cart.id, productId, quantity, variantId, weightGrams);
  revalidatePath("/carrito");
}

export async function updateCartItemAction(itemId: string, quantity: number) {
  await CartModel.updateItem(itemId, quantity);
  revalidatePath("/carrito");
}

export async function removeCartItemAction(itemId: string) {
  await CartModel.removeItem(itemId);
  revalidatePath("/carrito");
}
