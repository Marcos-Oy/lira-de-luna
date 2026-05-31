import { CartController } from "@/controllers/cart.controller";
import { auth } from "@/auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  const sessionId = req.cookies.get("cart_session")?.value;
  return CartController.getCart(session?.user?.id, sessionId);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const sessionId = req.cookies.get("cart_session")?.value;
  const body = await req.json();
  return CartController.addItem(body, session?.user?.id, sessionId);
}
