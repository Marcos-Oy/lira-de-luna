import { CollectionController } from "@/controllers/collection.controller";
import { NextRequest } from "next/server";

export async function GET() {
  return CollectionController.getAll();
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  return CollectionController.create(body);
}
