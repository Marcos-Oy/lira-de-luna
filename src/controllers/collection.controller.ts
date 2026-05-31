import { CollectionModel } from "@/models/collection.model";
import { NextResponse } from "next/server";
import { z } from "zod";

const collectionSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  image: z.string().url().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const CollectionController = {
  getAll: async () => {
    const collections = await CollectionModel.findAll();
    return NextResponse.json(collections);
  },

  getBySlug: async (slug: string) => {
    const collection = await CollectionModel.findBySlug(slug);
    if (!collection) return NextResponse.json({ error: "Colección no encontrada" }, { status: 404 });
    return NextResponse.json(collection);
  },

  create: async (body: unknown) => {
    const parsed = collectionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const collection = await CollectionModel.create(parsed.data);
    return NextResponse.json(collection, { status: 201 });
  },

  update: async (id: string, body: unknown) => {
    const parsed = collectionSchema.partial().safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const collection = await CollectionModel.update(id, parsed.data);
    return NextResponse.json(collection);
  },

  delete: async (id: string) => {
    await CollectionModel.delete(id);
    return NextResponse.json({ success: true });
  },

  reorder: async (body: unknown) => {
    const parsed = z.array(z.object({ id: z.string(), sortOrder: z.number().int() })).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Formato inválido" }, { status: 422 });

    await CollectionModel.reorder(parsed.data);
    return NextResponse.json({ success: true });
  },
};
