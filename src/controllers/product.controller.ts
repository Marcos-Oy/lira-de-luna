import { ProductModel } from "@/models/product.model";
import { productSchema, productVariantSchema, wholesaleTierSchema, weightProductSchema } from "@/lib/validations/product";
import { NextResponse } from "next/server";

export const ProductController = {
  getAll: async (searchParams: URLSearchParams) => {
    const collectionId = searchParams.get("collectionId") ?? undefined;
    const isActive = searchParams.get("isActive");
    const saleType = searchParams.get("saleType") ?? undefined;

    const products = await ProductModel.findAll({
      collectionId,
      isActive: isActive !== null ? isActive === "true" : undefined,
      saleType,
    });

    return NextResponse.json(products);
  },

  getBySlug: async (slug: string) => {
    const product = await ProductModel.findBySlug(slug);
    if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    return NextResponse.json(product);
  },

  create: async (body: unknown) => {
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const product = await ProductModel.create(parsed.data);
    return NextResponse.json(product, { status: 201 });
  },

  update: async (id: string, body: unknown) => {
    const parsed = productSchema.partial().safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const existing = await ProductModel.findById(id);
    if (!existing) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    const product = await ProductModel.update(id, parsed.data);
    return NextResponse.json(product);
  },

  delete: async (id: string) => {
    const existing = await ProductModel.findById(id);
    if (!existing) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    await ProductModel.delete(id);
    return NextResponse.json({ success: true });
  },

  addVariant: async (productId: string, body: unknown) => {
    const parsed = productVariantSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const variant = await ProductModel.addVariant(productId, parsed.data);
    return NextResponse.json(variant, { status: 201 });
  },

  addWholesaleTier: async (productId: string, body: unknown, tierId?: string) => {
    const parsed = wholesaleTierSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const tier = await ProductModel.upsertWholesaleTier(productId, tierId, parsed.data);
    return NextResponse.json(tier, { status: tierId ? 200 : 201 });
  },

  upsertWeightProduct: async (productId: string, body: unknown) => {
    const parsed = weightProductSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const wp = await ProductModel.upsertWeightProduct(productId, parsed.data);
    return NextResponse.json(wp);
  },
};
