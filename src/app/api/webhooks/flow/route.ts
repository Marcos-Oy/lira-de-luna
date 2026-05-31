import { NextRequest, NextResponse } from "next/server";
import { SettingsModel }                        from "@/models/settings.model";
import { verifyFlowSignature, processFlowPayment } from "@/controllers/webhook.controller";

// Flow envía: POST /api/webhooks/flow (application/x-www-form-urlencoded)
// Campos: flowOrder, commerceOrder, status, subject, amount, payer, sign, etc.
// status: 1=pendiente, 2=pagado, 3=rechazado, 4=anulado

export async function POST(req: NextRequest) {
  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(body).entries()) {
    params[k] = v;
  }

  // Verificación de firma con la secret key almacenada en StoreSettings
  const settings  = await SettingsModel.findSingleton();
  const secretKey = settings?.flowPaySecretKey;

  if (secretKey && !verifyFlowSignature(params, secretKey)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const status       = Number(params.status);
  const commerceOrder = params.commerceOrder;

  if (!commerceOrder) return NextResponse.json({ error: "no commerceOrder" }, { status: 400 });
  if (status !== 2)   return NextResponse.json({ ok: true }); // solo procesar pagos aprobados

  const result = await processFlowPayment(commerceOrder);

  return result.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: result.error }, { status: result.status });
}
