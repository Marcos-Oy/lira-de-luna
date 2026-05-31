import { OrderController } from "@/controllers/order.controller";
import { auth } from "@/auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return OrderController.getAll(req.nextUrl.searchParams);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json();
  return OrderController.createOrder(body, session?.user?.id);
}
