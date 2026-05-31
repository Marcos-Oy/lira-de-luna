import { z } from "zod";

export const productSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price: z.number().int().positive(),
  compareAtPrice: z.number().int().positive().optional(),
  images: z.array(z.string().url()).min(1),
  materials: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  isNew: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  saleType: z.enum(["UNIT", "WHOLESALE", "WEIGHT"]).default("UNIT"),
  collectionId: z.string().cuid(),
});

export const productVariantSchema = z.object({
  label: z.string().min(1),
  type: z.enum(["size", "material"]),
  price: z.number().int().positive().optional(),
  stock: z.number().int().min(0).default(0),
  sku: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const wholesaleTierSchema = z.object({
  minQuantity: z.number().int().min(1),
  pricePerUnit: z.number().int().positive(),
  sortOrder: z.number().int().default(0),
});

export const weightProductSchema = z.object({
  metalType: z.enum([
    "ORO_18K", "ORO_14K", "ORO_10K",
    "PLATA_925", "PLATA_800",
    "ORO_BLANCO_18K", "ORO_ROSA_18K",
  ]),
  pricePerGram: z.number().int().positive(),
  minGrams: z.number().positive().default(1.0),
  stock: z.number().positive().default(0),
});

export type ProductInput = z.infer<typeof productSchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;
export type WholesaleTierInput = z.infer<typeof wholesaleTierSchema>;
export type WeightProductInput = z.infer<typeof weightProductSchema>;
