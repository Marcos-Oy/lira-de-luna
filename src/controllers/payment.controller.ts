import crypto from "crypto";
import { OrderModel }             from "@/models/order.model";
import { SettingsModel }          from "@/models/settings.model";
import { EventRegistrationModel } from "@/models/event-registration.model";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ── Helpers internos ─────────────────────────────────────────

async function callMercadoPagoApi(
  body:        object,
  accessToken: string,
): Promise<{ id: string; init_point: string }> {
  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[MP] preference error:", text);
    throw new Error("Error al conectar con MercadoPago. Verifica el Access Token.");
  }
  return res.json() as Promise<{ id: string; init_point: string }>;
}

async function callFlowApi(
  params:    Record<string, string>,
  secretKey: string,
): Promise<{ url: string; token: string }> {
  const isSandbox  = process.env.FLOW_SANDBOX === "true";
  const flowApiUrl = isSandbox
    ? "https://sandbox.flow.cl/app/web/pay.php"
    : "https://www.flow.cl/app/web/pay.php";

  // Firma HMAC-SHA256: claves ordenadas alfabéticamente, concatenadas como key+value
  const template = Object.keys(params).sort().map((k) => `${k}${params[k]}`).join("");
  params.sign    = crypto.createHmac("sha256", secretKey).update(template).digest("hex");

  const res = await fetch(flowApiUrl, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams(params).toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[Flow] payment error:", text);
    throw new Error("Error al conectar con Flow. Verifica la API Key.");
  }
  return res.json() as Promise<{ url: string; token: string }>;
}

// ── Ecommerce: MercadoPago ────────────────────────────────────

export async function createMercadoPagoCheckout(orderNumber: string) {
  const [order, settings] = await Promise.all([
    OrderModel.findByOrderNumberWithItems(orderNumber),
    SettingsModel.findSingleton(),
  ]);

  if (!order)                            return { error: "Orden no encontrada" };
  if (!settings?.mercadoPagoAccessToken) return { error: "MercadoPago no está configurado. Agrega el Access Token en Admin → Configuración → Pagos." };

  const clientEmail = order.guestEmail ?? order.user?.email ?? "";
  const storeName   = settings.storeName ?? "Lira de Luna";

  // Los ítems + envío deben sumar exactamente order.total
  const lineItems = [
    ...order.items.map((item) => ({
      id:          item.productId,
      title:       item.productName + (item.variantLabel ? ` — ${item.variantLabel}` : ""),
      quantity:    item.quantity,
      unit_price:  item.unitPrice,
      currency_id: "CLP",
    })),
    ...(order.shippingAmount > 0
      ? [{ id: "envio", title: "Envío", quantity: 1, unit_price: order.shippingAmount, currency_id: "CLP" }]
      : []),
  ];

  try {
    const data = await callMercadoPagoApi(
      {
        items:              lineItems,
        payer:              { email: clientEmail },
        external_reference: orderNumber,
        notification_url:   `${BASE_URL}/api/webhooks/mercadopago`,
        back_urls: {
          success: `${BASE_URL}/cuenta/comprobante/${orderNumber}?payment=success`,
          failure: `${BASE_URL}/cuenta/comprobante/${orderNumber}?payment=failure`,
          pending: `${BASE_URL}/cuenta/comprobante/${orderNumber}?payment=pending`,
        },
        auto_return:          "approved",
        statement_descriptor: storeName.slice(0, 22),
      },
      settings.mercadoPagoAccessToken,
    );

    await OrderModel.saveMpPreferenceId(orderNumber, data.id);
    return { checkoutUrl: data.init_point };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ── Ecommerce: Flow Pay ───────────────────────────────────────

export async function createFlowCheckout(orderNumber: string) {
  const [order, settings] = await Promise.all([
    OrderModel.findByOrderNumberWithItems(orderNumber),
    SettingsModel.findSingleton(),
  ]);

  if (!order)                                                 return { error: "Orden no encontrada" };
  if (!settings?.flowPayApiKey || !settings.flowPaySecretKey) return { error: "Flow Pay no está configurado. Agrega la API Key y Secret Key en Admin → Configuración → Pagos." };

  const clientEmail = order.guestEmail ?? order.user?.email ?? "";

  // Flow no soporta line-items; se describen los productos en el subject
  const itemSummary = order.items
    .slice(0, 3)
    .map((i) => i.productName + (i.variantLabel ? ` (${i.variantLabel})` : ""))
    .join(", ")
    + (order.items.length > 3 ? ` y ${order.items.length - 3} más` : "");

  try {
    const data = await callFlowApi(
      {
        apiKey:          settings.flowPayApiKey,
        commerceOrder:   orderNumber,
        subject:         `Pedido ${orderNumber}: ${itemSummary}`.slice(0, 255),
        currency:        "CLP",
        amount:          String(order.total),
        email:           clientEmail,
        paymentMethod:   "9",
        urlConfirmation: `${BASE_URL}/api/webhooks/flow`,
        urlReturn:       `${BASE_URL}/cuenta/comprobante/${orderNumber}`,
      },
      settings.flowPaySecretKey,
    );
    return { checkoutUrl: `${data.url}?token=${data.token}` };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ── Eventos: MercadoPago / Flow ───────────────────────────────

export async function createEventCheckout(
  ticketCode: string,
  method:     "mercadoPago" | "flowPay",
) {
  const [reg, settings] = await Promise.all([
    EventRegistrationModel.findByTicketCode(ticketCode),
    SettingsModel.findSingleton(),
  ]);

  if (!reg) return { error: "Registro de evento no encontrado" };

  const { lpTitle: title, lpSlug: slug, amount } = reg;

  if (method === "mercadoPago") {
    if (!settings?.mercadoPagoAccessToken)
      return { error: "MercadoPago no está configurado. Agrega el Access Token en Admin → Configuración → Pagos." };

    try {
      const data = await callMercadoPagoApi(
        {
          items: [{
            id:          ticketCode,
            title:       `Entrada: ${title}`.slice(0, 256),
            quantity:    1,
            unit_price:  amount,
            currency_id: "CLP",
          }],
          payer:              { email: reg.email },
          external_reference: ticketCode,
          notification_url:   `${BASE_URL}/api/webhooks/mercadopago`,
          back_urls: {
            success: `${BASE_URL}/lp/${slug}/ticket/${ticketCode}?payment=success`,
            failure: `${BASE_URL}/lp/${slug}/ticket/${ticketCode}?payment=failure`,
            pending: `${BASE_URL}/lp/${slug}/ticket/${ticketCode}?payment=pending`,
          },
          auto_return:          "approved",
          statement_descriptor: title.slice(0, 22),
        },
        settings.mercadoPagoAccessToken,
      );
      return { checkoutUrl: data.init_point };
    } catch (err) {
      return { error: (err as Error).message };
    }
  }

  // Flow Pay
  if (!settings?.flowPayApiKey || !settings.flowPaySecretKey)
    return { error: "Flow Pay no está configurado. Agrega la API Key y Secret Key en Admin → Configuración → Pagos." };

  try {
    const data = await callFlowApi(
      {
        apiKey:          settings.flowPayApiKey,
        commerceOrder:   ticketCode,
        subject:         `Entrada: ${title}`.slice(0, 255),
        currency:        "CLP",
        amount:          String(amount),
        email:           reg.email,
        paymentMethod:   "9",
        urlConfirmation: `${BASE_URL}/api/webhooks/flow`,
        urlReturn:       `${BASE_URL}/lp/${slug}/ticket/${ticketCode}`,
      },
      settings.flowPaySecretKey,
    );
    return { checkoutUrl: `${data.url}?token=${data.token}` };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
