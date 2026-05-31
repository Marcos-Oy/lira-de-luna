import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import type { AdminJWTPayload } from "@/controllers/admin-auth.controller";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Magic bytes para validar el contenido real del archivo
const MAGIC: Array<{ mime: string; ext: string; bytes: number[]; offset?: number }> = [
  { mime: "image/jpeg",  ext: ".jpg",  bytes: [0xFF, 0xD8, 0xFF] },
  { mime: "image/png",   ext: ".png",  bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: "image/gif",   ext: ".gif",  bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp",  ext: ".webp", bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF....WEBP
  { mime: "image/avif",  ext: ".avif", bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }, // ftyp box
];

function detectImage(buf: Buffer): { mime: string; ext: string } | null {
  for (const sig of MAGIC) {
    const off = sig.offset ?? 0;
    const match = sig.bytes.every((b, i) => buf[off + i] === b);
    if (!match) continue;
    if (sig.mime === "image/webp") {
      // WEBP: bytes 8-11 deben ser "WEBP"
      if (buf.toString("ascii", 8, 12) !== "WEBP") continue;
    }
    return { mime: sig.mime, ext: sig.ext };
  }
  return null;
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.ADMIN_JWT_SECRET!) as AdminJWTPayload;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Sin archivo" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "El archivo excede el límite de 10 MB" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const detected = detectImage(buffer);
  if (!detected) {
    return NextResponse.json(
      { error: "Tipo de archivo no permitido. Use JPG, PNG, WEBP, GIF o AVIF." },
      { status: 400 },
    );
  }

  const filename = `${randomUUID()}${detected.ext}`;
  const uploadDir = join(process.cwd(), "public", "uploads", "products");

  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, filename), buffer);

  return NextResponse.json({ url: `/uploads/products/${filename}` });
}
