"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { AdminJWTPayload } from "@/controllers/admin-auth.controller";
import type { MetalType } from "@prisma/client";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) throw new Error("No autorizado");
  try {
    return jwt.verify(token, process.env.ADMIN_JWT_SECRET!) as AdminJWTPayload;
  } catch {
    throw new Error("No autorizado");
  }
}

type Tier = { minQuantity: number; pricePerUnit: number };
type WeightConfig = { metalType: string; pricePerGram: number; minGrams: number; stock: number };
type VariantInput = { label: string; stock: number; type?: string };

export async function createProduct(data: {
  name: string;
  slug: string;
  description: string;
  price: number;
  stock?: number;
  collectionId: string;
  images: string[];
  materials: string[];
  isNew?: boolean;
  isBestseller?: boolean;
  saleType?: string;
  wholesaleTiers?: Tier[];
  weightConfig?: WeightConfig;
  variants?: VariantInput[];
  saleEnabled?: boolean;
  saleDiscountPct?: number;
  saleStartAt?: string;
  saleEndAt?: string;
}) {
  await requireAdmin();

  const existing = await prisma.product.findUnique({ where: { slug: data.slug } });
  if (existing) return { error: "Ya existe un producto con ese slug" };

  const product = await prisma.product.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      price: data.price,
      stock: data.stock ?? 0,
      collectionId: data.collectionId,
      images: data.images as unknown as import("@prisma/client").Prisma.InputJsonValue,
      materials: data.materials as unknown as import("@prisma/client").Prisma.InputJsonValue,
      isNew: data.isNew ?? false,
      isBestseller: data.isBestseller ?? false,
      saleType: (data.saleType ?? "UNIT") as import("@prisma/client").SaleType,
      saleEnabled:    data.saleEnabled    ?? false,
      saleDiscountPct: data.saleDiscountPct ?? null,
      saleStartAt:    data.saleStartAt ? new Date(data.saleStartAt) : null,
      saleEndAt:      data.saleEndAt   ? new Date(data.saleEndAt)   : null,
    },
  });

  if (data.saleType === "WHOLESALE" && data.wholesaleTiers?.length) {
    await prisma.wholesaleTier.createMany({
      data: data.wholesaleTiers.map((t, i) => ({
        productId: product.id,
        minQuantity: t.minQuantity,
        pricePerUnit: t.pricePerUnit,
        sortOrder: i,
      })),
    });
  }

  if (data.saleType === "WEIGHT" && data.weightConfig) {
    await prisma.weightProduct.create({
      data: {
        productId: product.id,
        metalType: data.weightConfig.metalType as MetalType,
        pricePerGram: data.weightConfig.pricePerGram,
        minGrams: data.weightConfig.minGrams,
        stock: data.weightConfig.stock,
      },
    });
  }

  if (data.variants?.length) {
    await prisma.productVariant.createMany({
      data: data.variants.map((v) => ({
        productId: product.id,
        label: v.label,
        type: v.type ?? "Talla",
        stock: v.stock,
      })),
    });
  }

  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
  revalidatePath("/mayorista");
  return { success: true };
}

export async function updateProduct(
  id: string,
  data: {
    name: string;
    description: string;
    price: number;
    stock?: number;
    collectionId: string;
    images: string[];
    materials: string[];
    isNew?: boolean;
    isBestseller?: boolean;
    isActive?: boolean;
    saleType?: string;
    wholesaleTiers?: Tier[];
    weightConfig?: WeightConfig;
    variants?: VariantInput[];
    saleEnabled?: boolean;
    saleDiscountPct?: number;
    saleStartAt?: string;
    saleEndAt?: string;
  }
) {
  await requireAdmin();

  await prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      price: data.price,
      stock: data.stock ?? 0,
      collectionId: data.collectionId,
      images: data.images as unknown as import("@prisma/client").Prisma.InputJsonValue,
      materials: data.materials as unknown as import("@prisma/client").Prisma.InputJsonValue,
      isNew: data.isNew ?? false,
      isBestseller: data.isBestseller ?? false,
      isActive: data.isActive ?? true,
      saleType: (data.saleType ?? "UNIT") as import("@prisma/client").SaleType,
      saleEnabled:    data.saleEnabled    ?? false,
      saleDiscountPct: data.saleDiscountPct ?? null,
      saleStartAt:    data.saleStartAt ? new Date(data.saleStartAt) : null,
      saleEndAt:      data.saleEndAt   ? new Date(data.saleEndAt)   : null,
    },
  });

  // Wholesale tiers: replace
  await prisma.wholesaleTier.deleteMany({ where: { productId: id } });
  if (data.saleType === "WHOLESALE" && data.wholesaleTiers?.length) {
    await prisma.wholesaleTier.createMany({
      data: data.wholesaleTiers.map((t, i) => ({
        productId: id,
        minQuantity: t.minQuantity,
        pricePerUnit: t.pricePerUnit,
        sortOrder: i,
      })),
    });
  }

  // Variants: replace
  await prisma.productVariant.deleteMany({ where: { productId: id } });
  if (data.variants?.length) {
    await prisma.productVariant.createMany({
      data: data.variants.map((v) => ({
        productId: id,
        label: v.label,
        type: v.type ?? "Talla",
        stock: v.stock,
      })),
    });
  }

  // Weight config: upsert or delete
  if (data.saleType === "WEIGHT" && data.weightConfig) {
    await prisma.weightProduct.upsert({
      where: { productId: id },
      update: {
        metalType: data.weightConfig.metalType as MetalType,
        pricePerGram: data.weightConfig.pricePerGram,
        minGrams: data.weightConfig.minGrams,
        stock: data.weightConfig.stock,
      },
      create: {
        productId: id,
        metalType: data.weightConfig.metalType as MetalType,
        pricePerGram: data.weightConfig.pricePerGram,
        minGrams: data.weightConfig.minGrams,
        stock: data.weightConfig.stock,
      },
    });
  } else if (data.saleType !== "WEIGHT") {
    await prisma.weightProduct.deleteMany({ where: { productId: id } });
  }

  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
  revalidatePath("/mayorista");
  return { success: true };
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  await prisma.product.delete({ where: { id } });
  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
  revalidatePath("/mayorista");
  return { success: true };
}

export async function toggleProductActive(id: string, isActive: boolean) {
  await requireAdmin();
  await prisma.product.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/productos");
  return { success: true };
}

export async function bulkToggleProductActive(ids: string[], isActive: boolean) {
  await requireAdmin();
  if (!ids.length) return { success: true, updated: 0 };
  const result = await prisma.product.updateMany({
    where: { id: { in: ids } },
    data: { isActive },
  });
  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
  return { success: true, updated: result.count };
}

export async function bulkDeleteProducts(ids: string[]) {
  await requireAdmin();
  if (!ids.length) return { success: true, deleted: 0 };
  const result = await prisma.product.deleteMany({
    where: { id: { in: ids } },
  });
  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
  return { success: true, deleted: result.count };
}

export async function bulkSetSale(
  ids: string[],
  data: { saleDiscountPct: number; saleStartAt?: string; saleEndAt?: string },
) {
  await requireAdmin();
  if (!ids.length) return { success: true, updated: 0 };
  const result = await prisma.product.updateMany({
    where: { id: { in: ids } },
    data: {
      saleEnabled:    true,
      saleDiscountPct: data.saleDiscountPct,
      saleStartAt:    data.saleStartAt ? new Date(data.saleStartAt) : null,
      saleEndAt:      data.saleEndAt   ? new Date(data.saleEndAt)   : null,
    },
  });
  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
  return { success: true, updated: result.count };
}

export async function bulkRemoveSale(ids: string[]) {
  await requireAdmin();
  if (!ids.length) return { success: true, updated: 0 };
  const result = await prisma.product.updateMany({
    where: { id: { in: ids } },
    data: { saleEnabled: false, saleDiscountPct: null, saleStartAt: null, saleEndAt: null },
  });
  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
  return { success: true, updated: result.count };
}
