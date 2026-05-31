import { CouponModel } from "@/models/coupon.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { code, orderAmount } = await req.json();

  if (!code || typeof orderAmount !== "number") {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const result = await CouponModel.validate(code, orderAmount);

  if (!result.valid || !result.coupon) {
    return NextResponse.json({ valid: false, error: result.error }, { status: 400 });
  }

  const c = result.coupon;
  let discount = 0;
  if (c.type === "PERCENTAGE") discount = Math.round(orderAmount * (c.value / 100));
  else if (c.type === "FIXED_AMOUNT") discount = Math.min(c.value, orderAmount);
  else if (c.type === "FREE_SHIPPING") discount = 0; // handled at checkout

  return NextResponse.json({
    valid: true,
    coupon: { id: c.id, code: c.code, type: c.type, value: c.value },
    discount,
  });
}
