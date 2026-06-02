import { sendMail }      from "./email";
import { escapeHtml }   from "./sanitize";
import { OrderModel }   from "@/models/order.model";
import { SettingsModel } from "@/models/settings.model";

const LOW_STOCK_THRESHOLD = 3;

const METHOD_LABELS: Record<string, string> = {
  transfer:    "Transferencia bancaria",
  mercadoPago: "MercadoPago",
  flowPay:     "Flow Pay",
};

function fmtCLP(n: number) {
  return `$${n.toLocaleString("es-CL")} CLP`;
}

function getRecipient(order: {
  guestEmail: string | null;
  guestName:  string | null;
  user?: { email: string; name: string | null } | null;
}): { email: string; name: string } {
  if (order.user?.email) return { email: order.user.email, name: escapeHtml(order.user.name ?? "Cliente") };
  return { email: order.guestEmail ?? "", name: escapeHtml(order.guestName ?? "Cliente") };
}

function baseTemplate(storeName: string, body: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F4F1;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4F1;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #D8BFAE">
        <tr><td style="padding:28px 40px;text-align:center;background:#5C4A3E">
          <p style="margin:0;font-size:20px;letter-spacing:5px;color:#F7F4F1;font-style:italic">${storeName}</p>
        </td></tr>
        ${body}
        <tr><td style="padding:20px 40px;background:#F7F4F1;text-align:center;border-top:1px solid #EDE2D8">
          <p style="margin:0;font-size:10px;color:#B0A096">${storeName} · Correo automático, no respondas a este mensaje.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function itemsTableHtml(items: { productName: string; variantLabel: string | null; quantity: number; totalPrice: number }[]) {
  const rows = items.map((i) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #EDE2D8;font-size:12px;color:#5C4A3E">
        ${escapeHtml(i.productName)}${i.variantLabel ? ` <span style="color:#8E7A6B">— ${escapeHtml(i.variantLabel)}</span>` : ""}
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #EDE2D8;text-align:center;font-size:12px;color:#8E7A6B">${i.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #EDE2D8;text-align:right;font-size:12px;color:#5C4A3E">${fmtCLP(i.totalPrice)}</td>
    </tr>`).join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">
    <tr>
      <th style="padding:6px 0 10px;text-align:left;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#8E7A6B;border-bottom:2px solid #D8BFAE">Producto</th>
      <th style="padding:6px 0 10px;text-align:center;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#8E7A6B;border-bottom:2px solid #D8BFAE">Cant.</th>
      <th style="padding:6px 0 10px;text-align:right;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#8E7A6B;border-bottom:2px solid #D8BFAE">Total</th>
    </tr>
    ${rows}
  </table>`;
}

function totalsHtml(subtotal: number, shippingAmount: number, total: number) {
  return `<table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:4px 0;font-size:12px;color:#8E7A6B">Subtotal</td>
      <td style="padding:4px 0;text-align:right;font-size:12px;color:#8E7A6B">${fmtCLP(subtotal)}</td>
    </tr>
    <tr>
      <td style="padding:4px 0;font-size:12px;color:#8E7A6B">Envío</td>
      <td style="padding:4px 0;text-align:right;font-size:12px;color:#8E7A6B">${shippingAmount === 0 ? "Gratis" : fmtCLP(shippingAmount)}</td>
    </tr>
    <tr>
      <td style="padding:10px 0 0;font-size:14px;font-weight:bold;color:#5C4A3E;border-top:1px solid #EDE2D8">Total</td>
      <td style="padding:10px 0 0;text-align:right;font-size:14px;font-weight:bold;color:#CDA78F;border-top:1px solid #EDE2D8">${fmtCLP(total)}</td>
    </tr>
  </table>`;
}

// ── Confirmación de pedido recibido (cliente) ─────────────────

export async function sendOrderConfirmation(orderId: string) {
  const [order, settings] = await Promise.all([
    OrderModel.findByIdWithItems(orderId),
    SettingsModel.findSingleton(),
  ]);
  if (!order) return;

  const storeName = settings?.storeName ?? "Lira de Luna";
  const { email, name } = getRecipient(order);
  if (!email) return;

  const methodLabel = METHOD_LABELS[order.paymentMethod ?? ""] ?? order.paymentMethod ?? "—";
  const isTransfer  = order.paymentMethod === "transfer";

  const transferBlock = isTransfer && settings?.transferEnabled ? `
    <tr><td style="padding:0 40px 24px">
      <div style="background:#FEF9F0;border:1px solid #F3D9A0;padding:16px">
        <p style="margin:0 0 8px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#B7860B;font-weight:bold">Instrucciones de pago</p>
        <p style="margin:0 0 10px;font-size:12px;color:#92650A">Realiza una transferencia por <strong>${fmtCLP(order.total)}</strong> a:</p>
        <table cellpadding="0" cellspacing="0" style="font-size:12px;color:#5C4A3E;line-height:1.8">
          ${settings.transferBankName      ? `<tr><td style="color:#8E7A6B;padding-right:8px">Banco</td><td>${settings.transferBankName}</td></tr>` : ""}
          ${settings.transferAccountName   ? `<tr><td style="color:#8E7A6B;padding-right:8px">Nombre</td><td>${settings.transferAccountName}</td></tr>` : ""}
          ${settings.transferRut           ? `<tr><td style="color:#8E7A6B;padding-right:8px">RUT</td><td>${settings.transferRut}</td></tr>` : ""}
          ${settings.transferAccountType   ? `<tr><td style="color:#8E7A6B;padding-right:8px">Tipo</td><td>${settings.transferAccountType}</td></tr>` : ""}
          ${settings.transferAccountNumber ? `<tr><td style="color:#8E7A6B;padding-right:8px">N° cuenta</td><td>${settings.transferAccountNumber}</td></tr>` : ""}
        </table>
        ${settings.transferInstructions ? `<p style="margin:10px 0 0;font-size:11px;color:#92650A;font-style:italic">${settings.transferInstructions}</p>` : ""}
        <p style="margin:10px 0 0;font-size:11px;color:#B7860B;font-weight:bold">Incluye el número de pedido <strong>${order.orderNumber}</strong> en la glosa.</p>
      </div>
    </td></tr>` : "";

  const html = baseTemplate(storeName, `
    <tr><td style="padding:32px 40px 24px">
      <p style="margin:0 0 6px;font-size:14px;color:#5C4A3E">Hola, ${name}</p>
      <p style="margin:0 0 20px;font-size:13px;color:#8E7A6B;line-height:1.6">
        Recibimos tu pedido <strong style="color:#CDA78F">#${order.orderNumber}</strong>.
        ${isTransfer
          ? "Cuando confirmemos tu transferencia, te avisaremos por correo."
          : "Te notificaremos cuando esté listo para despacho."}
      </p>
      ${itemsTableHtml(order.items)}
      ${totalsHtml(order.subtotal, order.shippingAmount, order.total)}
      <p style="margin:16px 0 0;font-size:12px;color:#8E7A6B">Método de pago: <strong>${methodLabel}</strong></p>
    </td></tr>
    ${transferBlock}
  `);

  const res = await sendMail({ to: email, subject: `Pedido recibido #${order.orderNumber} — ${storeName}`, html });
  OrderModel.createEmailLog({
    id:      `${orderId}-confirm-${Date.now()}`,
    to:      email,
    subject: `Pedido recibido #${order.orderNumber}`,
    type:    "ORDER_CONFIRMED",
    status:  res.ok ? "sent" : "failed",
  }).catch(() => {});
}

// ── Nuevo pedido (admin) ──────────────────────────────────────

export async function notifyAdminNewOrder(orderId: string) {
  const [order, settings] = await Promise.all([
    OrderModel.findByIdWithItems(orderId),
    SettingsModel.findSingleton(),
  ]);
  if (!order || !settings?.notifyNewOrder) return;

  const adminEmail = settings.supportEmail ?? settings.emailFromAddr ?? settings.emailUser;
  if (!adminEmail) return;

  const storeName = settings.storeName ?? "Lira de Luna";
  const { name, email: clientEmail } = getRecipient(order);

  const html = baseTemplate(storeName, `
    <tr><td style="padding:32px 40px 24px">
      <p style="margin:0 0 4px;font-size:16px;font-weight:bold;color:#5C4A3E">Nuevo pedido recibido</p>
      <p style="margin:0 0 20px;font-size:13px;color:#8E7A6B">
        <strong style="color:#CDA78F">#${order.orderNumber}</strong> · ${name} · ${clientEmail}
      </p>
      ${itemsTableHtml(order.items)}
      ${totalsHtml(order.subtotal, order.shippingAmount, order.total)}
      <p style="margin:16px 0 0;font-size:12px;color:#8E7A6B">Método: <strong>${METHOD_LABELS[order.paymentMethod ?? ""] ?? order.paymentMethod ?? "—"}</strong></p>
    </td></tr>
  `);

  await sendMail({ to: adminEmail, subject: `[${storeName}] Nuevo pedido #${order.orderNumber}`, html });
}

// ── Pago confirmado (cliente) ─────────────────────────────────

export async function sendOrderPaid(orderId: string) {
  const [order, settings] = await Promise.all([
    OrderModel.findByIdWithItems(orderId),
    SettingsModel.findSingleton(),
  ]);
  if (!order) return;

  const storeName = settings?.storeName ?? "Lira de Luna";
  const { email, name } = getRecipient(order);
  if (!email) return;

  const html = baseTemplate(storeName, `
    <tr><td style="padding:32px 40px 24px">
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;padding:16px;margin-bottom:24px">
        <p style="margin:0;font-size:13px;color:#166534;font-weight:bold">✓ Pago confirmado</p>
        <p style="margin:4px 0 0;font-size:12px;color:#166534">Tu pedido <strong>#${order.orderNumber}</strong> está siendo preparado.</p>
      </div>
      <p style="margin:0 0 16px;font-size:14px;color:#5C4A3E">Hola, ${name}</p>
      <p style="margin:0 0 20px;font-size:13px;color:#8E7A6B;line-height:1.6">
        Recibimos tu pago. Pronto recibirás otra notificación cuando tu pedido sea despachado.
      </p>
      ${itemsTableHtml(order.items)}
      ${totalsHtml(order.subtotal, order.shippingAmount, order.total)}
    </td></tr>
  `);

  const res = await sendMail({ to: email, subject: `Pago confirmado #${order.orderNumber} — ${storeName}`, html });
  OrderModel.createEmailLog({
    id:      `${orderId}-paid-${Date.now()}`,
    to:      email,
    subject: `Pago confirmado #${order.orderNumber}`,
    type:    "ORDER_PAID",
    status:  res.ok ? "sent" : "failed",
  }).catch(() => {});
}

// ── Stock bajo (admin) ────────────────────────────────────────

export async function notifyAdminLowStock(
  items: { productId: string; variantId: string | null; productName: string; variantLabel: string | null; newStock: number }[],
) {
  const settings = await SettingsModel.findSingleton();
  if (!settings?.notifyLowStock) return;

  const adminEmail = settings.supportEmail ?? settings.emailFromAddr ?? settings.emailUser;
  if (!adminEmail) return;

  const storeName = settings.storeName ?? "Lira de Luna";
  const rows = items.map((i) =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #EDE2D8;font-size:12px;color:#5C4A3E">${i.productName}${i.variantLabel ? ` — ${i.variantLabel}` : ""}</td>
      <td style="padding:8px 0;border-bottom:1px solid #EDE2D8;text-align:right;font-size:12px;font-weight:bold;color:${i.newStock === 0 ? "#DC2626" : "#D97706"}">${i.newStock === 0 ? "Agotado" : `${i.newStock} u.`}</td>
    </tr>`,
  ).join("");

  const html = baseTemplate(storeName, `
    <tr><td style="padding:32px 40px 24px">
      <p style="margin:0 0 4px;font-size:16px;font-weight:bold;color:#5C4A3E">Alerta de stock bajo</p>
      <p style="margin:0 0 20px;font-size:13px;color:#8E7A6B">Los siguientes productos tienen stock crítico:</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <th style="padding:6px 0 10px;text-align:left;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#8E7A6B;border-bottom:2px solid #D8BFAE">Producto</th>
          <th style="padding:6px 0 10px;text-align:right;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#8E7A6B;border-bottom:2px solid #D8BFAE">Stock</th>
        </tr>
        ${rows}
      </table>
    </td></tr>
  `);

  await sendMail({ to: adminEmail, subject: `[${storeName}] Alerta de stock bajo`, html });
}

// ── Decrementar stock + alerta ────────────────────────────────

export async function decrementStockForOrder(orderId: string) {
  const items = await OrderModel.findItemsById(orderId);

  const results = await Promise.all(
    items.map(async (item) => {
      if (item.variantId) {
        const updated = await OrderModel.decrementVariantStock(item.variantId, item.quantity).catch(() => null);
        return updated && updated.stock <= LOW_STOCK_THRESHOLD
          ? { productId: item.productId, variantId: item.variantId, productName: item.productName, variantLabel: item.variantLabel, newStock: Math.max(0, updated.stock) }
          : null;
      }
      const updated = await OrderModel.decrementProductStock(item.productId, item.quantity).catch(() => null);
      return updated && updated.stock <= LOW_STOCK_THRESHOLD
        ? { productId: item.productId, variantId: null, productName: item.productName, variantLabel: item.variantLabel, newStock: Math.max(0, updated.stock) }
        : null;
    }),
  );

  const lowStockAlerts = results.filter((r): r is NonNullable<typeof r> => r !== null);
  if (lowStockAlerts.length > 0) {
    notifyAdminLowStock(lowStockAlerts).catch(() => {});
  }
}
