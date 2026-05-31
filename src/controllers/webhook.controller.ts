import crypto from "crypto";
import { OrderModel }             from "@/models/order.model";
import { SettingsModel }          from "@/models/settings.model";
import { EventRegistrationModel } from "@/models/event-registration.model";
import { decrementStockForOrder, sendOrderPaid } from "@/lib/order-emails";

// ── Verificación de firmas ────────────────────────────────────

/**
 * Verifica la firma HMAC-SHA256 de un webhook de Flow.
 * Construye la cadena firmada ordenando las claves alfabéticamente (excluyendo "sign")
 * y concatenando key+value. Usa comparación en tiempo constante para prevenir timing attacks.
 */
export function verifyFlowSignature(
  params:    Record<string, string>,
  secretKey: string,
): boolean {
  const sign = params.sign;
  if (!sign) return false;

  const template = Object.keys(params)
    .filter((k) => k !== "sign")
    .sort()
    .map((k)  => `${k}${params[k]}`)
    .join("");

  const digest = crypto.createHmac("sha256", secretKey).update(template).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(sign));
  } catch {
    return false; // buffers de distinto tamaño → firma inválida
  }
}

/**
 * Verifica la firma del webhook de MercadoPago.
 * Template: "id:{data.id};request-id:{x-request-id};ts:{ts};"
 */
export function verifyMercadoPagoSignature(
  xSignature: string,
  xRequestId: string,
  dataId:     string,
  secret:     string,
): boolean {
  const ts = xSignature.match(/ts=([^,]+)/)?.[1] ?? "";
  const v1 = xSignature.match(/v1=([^,]+)/)?.[1] ?? "";
  if (!ts || !v1) return false;

  const template = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const digest   = crypto.createHmac("sha256", secret).update(template).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(v1));
  } catch {
    return false;
  }
}

// ── Resultados tipados ────────────────────────────────────────

type WebhookResult =
  | { ok: true;  orderId?: string }
  | { ok: false; error: string; status: number };

// ── Procesamiento MercadoPago ─────────────────────────────────

/**
 * Consulta el estado del pago en la API de MP y, si está aprobado,
 * actualiza la orden o el registro de evento correspondiente.
 */
export async function processMercadoPagoPayment(paymentId: string): Promise<WebhookResult> {
  const settings    = await SettingsModel.findSingleton();
  const accessToken = settings?.mercadoPagoAccessToken;
  if (!accessToken) return { ok: false, error: "MP not configured", status: 500 };

  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!mpRes.ok) return { ok: false, error: "mp api error", status: 502 };

  const payment = await mpRes.json() as {
    status:             string;
    external_reference: string | null;
    id:                 number;
    merchant_order_id?: number;
  };

  if (payment.status !== "approved") return { ok: true }; // otros estados se ignoran

  const reference = payment.external_reference;
  if (!reference) return { ok: false, error: "no external_reference", status: 400 };

  // ① Buscar como orden de tienda
  const order = await OrderModel.findByOrderNumber(reference);
  if (order) {
    if (order.paymentStatus === "PAID") return { ok: true }; // idempotencia
    const updated = await OrderModel.markPaid(reference, {
      mpPaymentId:       String(payment.id),
      mpMerchantOrderId: payment.merchant_order_id ? String(payment.merchant_order_id) : undefined,
      mpStatus:          payment.status,
    });
    decrementStockForOrder(updated.id).catch(() => {});
    sendOrderPaid(updated.id).catch(() => {});
    return { ok: true, orderId: updated.id };
  }

  // ② Buscar como ticket de evento
  const reg = await EventRegistrationModel.findByTicketCode(reference);
  if (reg) {
    if (reg.paymentStatus === "PAID") return { ok: true }; // idempotencia
    await EventRegistrationModel.markPaid(reg.id);
    return { ok: true };
  }

  return { ok: false, error: "order not found", status: 404 };
}

// ── Procesamiento Flow ────────────────────────────────────────

/**
 * Recibe el commerceOrder de Flow (= orderNumber o ticketCode) y marca como pagado.
 */
export async function processFlowPayment(commerceOrder: string): Promise<WebhookResult> {
  // ① Buscar como orden de tienda
  const order = await OrderModel.findByOrderNumber(commerceOrder);
  if (order) {
    if (order.paymentStatus === "PAID") return { ok: true }; // idempotencia
    const updated = await OrderModel.markPaid(commerceOrder);
    decrementStockForOrder(updated.id).catch(() => {});
    sendOrderPaid(updated.id).catch(() => {});
    return { ok: true, orderId: updated.id };
  }

  // ② Buscar como ticket de evento
  const reg = await EventRegistrationModel.findByTicketCode(commerceOrder);
  if (reg) {
    if (reg.paymentStatus === "PAID") return { ok: true }; // idempotencia
    await EventRegistrationModel.markPaid(reg.id);
    return { ok: true };
  }

  return { ok: false, error: "order not found", status: 404 };
}
