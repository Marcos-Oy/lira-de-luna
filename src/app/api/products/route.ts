import { ProductController } from "@/controllers/product.controller";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return ProductController.getAll(req.nextUrl.searchParams);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  return ProductController.create(body);
}
