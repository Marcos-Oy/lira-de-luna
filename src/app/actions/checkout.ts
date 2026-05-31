"use server";

import bcrypt from "bcryptjs";
import { auth }      from "@/auth";
import { UserModel } from "@/models/user.model";
import {
  createOrderForUser,
  createOrderForGuest,
  createAccountWithOrder,
  type CheckoutInput,
} from "@/controllers/checkout.controller";
import { sendOrderConfirmation, notifyAdminNewOrder } from "@/lib/order-emails";

export type { CheckoutInput };

function fireEmails(orderId: string) {
  sendOrderConfirmation(orderId).catch(() => {});
  notifyAdminNewOrder(orderId).catch(() => {});
}

// ── Orden para usuario autenticado o invitado ─────────────────

export async function createOrder(input: CheckoutInput) {
  if (!input.cartItems.length) return { error: "El carrito está vacío" };
  if (!input.email)            return { error: "El correo es obligatorio" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return { error: "El correo no es válido" };
  if (input.email.length > 320)           return { error: "El correo es demasiado largo" };
  if (input.shipping.name.length > 150)   return { error: "El nombre es demasiado largo" };
  if (input.shipping.street.length > 250) return { error: "La dirección es demasiado larga" };
  if (input.cartItems.length > 100)       return { error: "El carrito contiene demasiados ítems" };

  const session = await auth();
  const userId  = session?.user?.id ?? null;

  const result = userId
    ? await createOrderForUser(input, userId)
    : await createOrderForGuest(input);

  if ("error" in result) return result;

  fireEmails(result.orderId);
  return { success: true, orderNumber: result.orderNumber, paymentMethod: result.paymentMethod };
}

// ── Crear cuenta + orden (modal de registro en checkout) ──────

export async function createAccountAndOrder(
  input: CheckoutInput & { password: string },
) {
  if (!input.cartItems.length) return { error: "El carrito está vacío" };
  if (!input.email)            return { error: "El correo es obligatorio" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return { error: "El correo no es válido" };
  if (input.email.length > 320) return { error: "El correo es demasiado largo" };
  if (!input.password || input.password.length < 8)
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  if (input.password.length > 128) return { error: "La contraseña es demasiado larga" };

  const emailNorm = input.email.toLowerCase().trim();

  const existing = await UserModel.findByEmail(emailNorm);
  if (existing)
    return { error: "Este correo ya tiene una cuenta. Inicia sesión para continuar." };

  const passwordHash = await bcrypt.hash(input.password, 12);

  const result = await createAccountWithOrder({ ...input, email: emailNorm, passwordHash });
  if ("error" in result) return result;

  fireEmails(result.orderId);
  return { success: true, orderNumber: result.orderNumber, paymentMethod: result.paymentMethod };
}
