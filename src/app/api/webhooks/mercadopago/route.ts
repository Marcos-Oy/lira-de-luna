import { NextRequest, NextResponse } from "next/server";
import {
  verifyMercadoPagoSignature,
  processMercadoPagoPayment,
} from "@/controllers/webhook.controller";

// MP envía: POST /api/webhooks/mercadopago
// Body: { action: "payment.updated"|"payment.created", data: { id: "PAYMENT_ID" } }
// Headers: x-signature: "ts=...,v1=...", x-request-id: "..."

export async function POST(req: NextRequest) {
  let rawBody = "";
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // Verificación de firma (omitida en dev si no hay secreto configurado)
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (secret) {
    const xSignature = req.headers.get("x-signature") ?? "";
    const xRequestId = req.headers.get("x-request-id") ?? "";
    const dataId     = new URL(req.url).searchParams.get("data.id") ?? "";

    if (!verifyMercadoPagoSignature(xSignature, xRequestId, dataId, secret)) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  }

  let payload: { action?: string; data?: { id?: string } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (payload.action !== "payment.updated" && payload.action !== "payment.created") {
    return NextResponse.json({ ok: true });
  }

  const paymentId = payload.data?.id;
  if (!paymentId) return NextResponse.json({ ok: true });

  const result = await processMercadoPagoPayment(paymentId);

  return result.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: result.error }, { status: result.status });
}
