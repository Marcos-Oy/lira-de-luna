import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";

export async function getTransporter() {
  const s = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });
  if (!s?.emailHost || !s.emailUser || !s.emailPassword) return null;

  return nodemailer.createTransport({
    host: s.emailHost,
    port: s.emailPort ?? 587,
    secure: s.emailSecure,
    auth: { user: s.emailUser, pass: s.emailPassword },
  });
}

export async function getFromAddress() {
  const s = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });
  const name = s?.emailFromName ?? s?.storeName ?? "Lira de Luna";
  const addr = s?.emailFromAddr ?? s?.emailUser ?? "";
  return `"${name}" <${addr}>`;
}

interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(opts: SendMailOptions): Promise<{ ok: boolean; error?: string }> {
  try {
    const transport = await getTransporter();
    if (!transport) return { ok: false, error: "Email no configurado. Configura el servidor SMTP en Ajustes." };

    const from = await getFromAddress();
    await transport.sendMail({ from, ...opts });
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return { ok: false, error: msg };
  }
}

export function passwordResetHtml(opts: { storeName: string; resetUrl: string; userName: string }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F4F1;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4F1;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #D8BFAE">
        <tr><td style="padding:32px 40px;border-bottom:1px solid #EDE2D8;text-align:center">
          <p style="margin:0;font-size:22px;letter-spacing:4px;color:#5C4A3E;font-style:italic">${opts.storeName}</p>
        </td></tr>
        <tr><td style="padding:40px">
          <p style="margin:0 0 12px;font-size:14px;color:#5C4A3E">Hola, ${opts.userName}</p>
          <p style="margin:0 0 24px;font-size:13px;color:#8E7A6B;line-height:1.6">
            Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente botón para continuar.
            Si no solicitaste esto, puedes ignorar este mensaje.
          </p>
          <div style="text-align:center;margin:32px 0">
            <a href="${opts.resetUrl}" style="display:inline-block;background:#CDA78F;color:#fff;text-decoration:none;font-size:11px;letter-spacing:3px;text-transform:uppercase;padding:14px 32px">
              Restablecer contraseña
            </a>
          </div>
          <p style="margin:0;font-size:11px;color:#8E7A6B;text-align:center">
            Este enlace expira en 1 hora. Si el botón no funciona, copia y pega:<br>
            <a href="${opts.resetUrl}" style="color:#CDA78F">${opts.resetUrl}</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#F7F4F1;text-align:center">
          <p style="margin:0;font-size:10px;color:#8E7A6B">${opts.storeName} · Este es un correo automático, no respondas a este mensaje.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function campaignHtml(opts: { storeName: string; content: string; imageUrl?: string | null; unsubscribeUrl: string }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F4F1;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4F1;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #D8BFAE">
        <tr><td style="padding:32px 40px;border-bottom:1px solid #EDE2D8;text-align:center">
          <p style="margin:0;font-size:22px;letter-spacing:4px;color:#5C4A3E;font-style:italic">${opts.storeName}</p>
        </td></tr>
        ${opts.imageUrl ? `<tr><td><img src="${opts.imageUrl}" alt="" style="width:100%;display:block;max-height:320px;object-fit:cover"></td></tr>` : ""}
        <tr><td style="padding:40px;font-size:14px;color:#5C4A3E;line-height:1.7">
          ${opts.content}
        </td></tr>
        <tr><td style="padding:24px 40px;background:#F7F4F1;text-align:center;border-top:1px solid #EDE2D8">
          <p style="margin:0 0 6px;font-size:11px;color:#8E7A6B">${opts.storeName}</p>
          <p style="margin:0;font-size:9px;color:#B0A096;line-height:1.6">
            Recibiste este correo porque te suscribiste a nuestras novedades.<br>
            Si ya no deseas recibirlos, puedes
            <a href="${opts.unsubscribeUrl}" style="color:#B0A096;text-decoration:underline;font-size:9px">darte de baja aquí</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
