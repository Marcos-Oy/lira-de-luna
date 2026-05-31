"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { StoreLocation } from "@/types/personalization";
import { requireActiveAdmin } from "@/lib/require-admin";

const requireAdmin = requireActiveAdmin;

// Magic-byte check: PNG, JPEG, WebP solamente (SVG excluido — puede contener XSS)
function detectLogoType(buf: Buffer): string | null {
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return ".png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return ".jpg";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf.toString("ascii", 8, 12) === "WEBP") return ".webp";
  return null;
}

export async function getStoreSettings() {
  await requireAdmin();
  return prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

export async function toggleWholesale(enabled: boolean) {
  await requireAdmin();
  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: { wholesaleEnabled: enabled },
    create: { id: "singleton", wholesaleEnabled: enabled },
  });
  revalidatePath("/", "layout");
  revalidatePath("/mayorista");
  revalidatePath("/admin/configuracion");
  return { success: true };
}

export async function toggleWhatsAppButton(enabled: boolean) {
  await requireAdmin();
  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: { whatsappButtonEnabled: enabled },
    create: { id: "singleton", whatsappButtonEnabled: enabled },
  });
  revalidatePath("/", "layout");
  revalidatePath("/admin/configuracion");
  return { success: true };
}

export async function updateWhatsAppContactNumber(number: string) {
  await requireAdmin();
  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: { whatsappContactNumber: number.trim() || null },
    create: { id: "singleton", whatsappContactNumber: number.trim() || null },
  });
  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateStoreLocations(locations: StoreLocation[]) {
  await requireAdmin();
  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: { locations: locations as unknown as import("@prisma/client").Prisma.JsonArray },
    create: { id: "singleton", locations: locations as unknown as import("@prisma/client").Prisma.JsonArray },
  });
  revalidatePath("/");
  return { success: true };
}

export async function toggleRetail(enabled: boolean) {
  await requireAdmin();
  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: { retailEnabled: enabled },
    create: { id: "singleton", retailEnabled: enabled },
  });
  revalidatePath("/", "layout");
  revalidatePath("/tienda");
  revalidatePath("/colecciones");
  revalidatePath("/admin/configuracion");
  return { success: true };
}

export async function uploadStoreLogo(formData: FormData) {
  await requireAdmin();

  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) return { error: "No se seleccionó ningún archivo" };
  if (file.size > 5 * 1024 * 1024) return { error: "El archivo no puede superar 5 MB" };

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = detectLogoType(buf);
  if (!ext) return { error: "Formato no válido. Usa PNG, JPG o WebP (no SVG por seguridad)" };

  const fileName = `logo-${Date.now()}${ext}`;
  const uploadDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, fileName), buf);

  const logoUrl = `/uploads/${fileName}`;
  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: { logoUrl },
    create: { id: "singleton", logoUrl },
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/configuracion");
  return { success: true, logoUrl };
}

export async function removeStoreLogo() {
  await requireAdmin();
  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: { logoUrl: null },
    create: { id: "singleton" },
  });
  revalidatePath("/", "layout");
  revalidatePath("/admin/configuracion");
  return { success: true };
}

export async function updateStoreName(storeName: string) {
  await requireAdmin();
  if (!storeName.trim()) return { error: "El nombre no puede estar vacío" };
  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: { storeName: storeName.trim() },
    create: { id: "singleton", storeName: storeName.trim() },
  });
  revalidatePath("/", "layout");
  revalidatePath("/admin/configuracion");
  return { success: true };
}

// ── Envíos ────────────────────────────────────────────────────

export async function updateShipping(data: {
  freeShippingFrom: number;
  standardShipping: number;
  processingDays: string;
}) {
  await requireAdmin();
  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
  revalidatePath("/admin/configuracion");
  return { success: true };
}

// ── Métodos de pago ───────────────────────────────────────────

export async function togglePaymentMethod(
  method: "mercadoPago" | "flowPay" | "transfer",
  enabled: boolean
) {
  await requireAdmin();
  const fieldMap = {
    mercadoPago: { mercadoPagoEnabled: enabled },
    flowPay:     { flowPayEnabled: enabled },
    transfer:    { transferEnabled: enabled },
  };
  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: fieldMap[method],
    create: { id: "singleton", ...fieldMap[method] },
  });
  revalidatePath("/admin/configuracion");
  return { success: true };
}

export async function updateMercadoPago(data: { publicKey: string; accessToken: string }) {
  await requireAdmin();
  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: {
      mercadoPagoPublicKey: data.publicKey.trim() || null,
      mercadoPagoAccessToken: data.accessToken.trim() || null,
    },
    create: { id: "singleton" },
  });
  revalidatePath("/admin/configuracion");
  return { success: true };
}

export async function updateFlowPay(data: { apiKey: string; secretKey: string }) {
  await requireAdmin();
  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: {
      flowPayApiKey: data.apiKey.trim() || null,
      flowPaySecretKey: data.secretKey.trim() || null,
    },
    create: { id: "singleton" },
  });
  revalidatePath("/admin/configuracion");
  return { success: true };
}

export async function updateTransfer(data: {
  bankName: string;
  accountName: string;
  accountNumber: string;
  accountType: string;
  rut: string;
  instructions: string;
}) {
  await requireAdmin();
  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: {
      transferBankName:       data.bankName.trim() || null,
      transferAccountName:    data.accountName.trim() || null,
      transferAccountNumber:  data.accountNumber.trim() || null,
      transferAccountType:    data.accountType || null,
      transferRut:            data.rut.trim() || null,
      transferInstructions:   data.instructions.trim() || null,
    },
    create: { id: "singleton" },
  });
  revalidatePath("/admin/configuracion");
  return { success: true };
}

// ── Notificaciones ────────────────────────────────────────────

export async function updateNotifications(data: {
  notifyNewOrder: boolean;
  notifyPaymentFail: boolean;
  notifyLowStock: boolean;
  notifyWeeklySummary: boolean;
  notifyBrowserEnabled: boolean;
}) {
  await requireAdmin();
  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
  revalidatePath("/admin/configuracion");
  return { success: true };
}

// ── SEO ───────────────────────────────────────────────────────

export async function updateSeo(data: { seoTitle: string; seoDescription: string }) {
  await requireAdmin();
  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: {
      seoTitle: data.seoTitle.trim() || null,
      seoDescription: data.seoDescription.trim() || null,
    },
    create: { id: "singleton" },
  });
  revalidatePath("/admin/configuracion");
  return { success: true };
}

// ── Email / WhatsApp config ────────────────────────────────────

export async function updateEmailConfig(data: {
  emailHost: string;
  emailPort: number;
  emailSecure: boolean;
  emailUser: string;
  emailPassword: string;
  emailFromName: string;
  emailFromAddr: string;
}) {
  await requireAdmin();
  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: {
      emailHost:     data.emailHost.trim() || null,
      emailPort:     data.emailPort || null,
      emailSecure:   data.emailSecure,
      emailUser:     data.emailUser.trim() || null,
      emailPassword: data.emailPassword.trim() || null,
      emailFromName: data.emailFromName.trim() || null,
      emailFromAddr: data.emailFromAddr.trim() || null,
    },
    create: { id: "singleton" },
  });
  revalidatePath("/admin/configuracion");
  return { success: true };
}

export async function testEmailConfig(toEmail: string) {
  await requireAdmin();
  const { sendMail } = await import("@/lib/email");
  const res = await sendMail({
    to: toEmail,
    subject: "Prueba de correo — Lira de Luna",
    html: "<p>Si recibes este mensaje, la configuración de correo está funcionando correctamente.</p>",
  });
  return res;
}

export async function uploadOgImage(formData: FormData) {
  await requireAdmin();
  const file = formData.get("ogImage") as File | null;
  if (!file || file.size === 0) return { error: "No se seleccionó ningún archivo" };

  const allowed = ["image/png", "image/jpeg", "image/webp"];
  if (!allowed.includes(file.type)) return { error: "Usa PNG, JPG o WebP (1200×630 px recomendado)" };
  if (file.size > 5 * 1024 * 1024) return { error: "El archivo no puede superar 5 MB" };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const fileName = `og-${Date.now()}.${ext}`;
  const uploadDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, fileName), Buffer.from(await file.arrayBuffer()));

  const seoOgImage = `/uploads/${fileName}`;
  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: { seoOgImage },
    create: { id: "singleton", seoOgImage },
  });
  revalidatePath("/admin/configuracion");
  return { success: true, seoOgImage };
}

export async function updateContactInfo(data: { supportEmail: string; supportPhone: string }) {
  await requireAdmin();
  await prisma.storeSettings.upsert({
    where:  { id: "singleton" },
    update: { supportEmail: data.supportEmail || null, supportPhone: data.supportPhone || null },
    create: { id: "singleton", supportEmail: data.supportEmail || null, supportPhone: data.supportPhone || null },
  });
  revalidatePath("/admin/personalizacion");
}
