import { OrderModel } from "@/models/order.model";
import { ProductModel } from "@/models/product.model";
import { CouponModel } from "@/models/coupon.model";
import { createOrderSchema, updateOrderStatusSchema } from "@/lib/validations/order";
import { NextResponse } from "next/server";

export const OrderController = {
  getAll: async (searchParams: URLSearchParams) => {
    const page = Number(searchParams.get("page") ?? 1);
    const status = searchParams.get("status") ?? undefined;
    const orders = await OrderModel.findAll(page, 20, { status });
    return NextResponse.json(orders);
  },

  getById: async (id: string) => {
    const order = await OrderModel.findById(id);
    if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    return NextResponse.json(order);
  },

  createOrder: async (body: unknown, userId?: string) => {
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const { items, couponCode, guestEmail, shippingAddressId } = parsed.data;

    // Build order items + calculate subtotal
    let subtotal = 0;
    const orderItems: {
      productId: string;
      variantId?: string;
      productName: string;
      variantLabel?: string;
      saleType: "UNIT" | "WHOLESALE" | "WEIGHT";
      quantity: number;
      weightGrams?: number;
      unitPrice: number;
      totalPrice: number;
    }[] = [];

    for (const item of items) {
      const product = await ProductModel.findById(item.productId);
      if (!product || !product.isActive) {
        return NextResponse.json({ error: `Producto no disponible: ${item.productId}` }, { status: 400 });
      }

      let unitPrice = product.price;

      if (product.saleType === "WHOLESALE") {
        const tiers = product.wholesaleTiers.sort(
          (a: { minQuantity: number }, b: { minQuantity: number }) => b.minQuantity - a.minQuantity
        );
        const matched = tiers.find((t: { minQuantity: number; pricePerUnit: number }) => item.quantity >= t.minQuantity);
        if (matched) unitPrice = matched.pricePerUnit;
      } else if (product.saleType === "WEIGHT" && product.weightProduct) {
        const grams = item.weightGrams ?? product.weightProduct.minGrams;
        unitPrice = Math.round(product.weightProduct.pricePerGram * grams);
      } else if (item.variantId) {
        const variant = product.variants?.find((v: { id: string; price: number | null }) => v.id === item.variantId);
        if (variant?.price) unitPrice = variant.price;
      }

      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        productId: item.productId,
        variantId: item.variantId,
        productName: product.name,
        saleType: product.saleType as "UNIT" | "WHOLESALE" | "WEIGHT",
        quantity: item.quantity,
        weightGrams: item.weightGrams,
        unitPrice,
        totalPrice,
      });
    }

    // Coupon discount
    let discountAmount = 0;
    let couponId: string | undefined;
    if (couponCode) {
      const result = await CouponModel.validate(couponCode, subtotal);
      if (!result.valid || !result.coupon) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      const c = result.coupon;
      if (c.type === "PERCENTAGE") discountAmount = Math.round(subtotal * (c.value / 100));
      else if (c.type === "FIXED_AMOUNT") discountAmount = Math.min(c.value, subtotal);
      couponId = c.id;
    }

    const shippingAmount = subtotal - discountAmount >= 30000 ? 0 : 5990; // gratis sobre $30.000 CLP
    const total = subtotal - discountAmount + shippingAmount;
    const orderNumber = await OrderModel.generateOrderNumber();

    const order = await OrderModel.create({
      orderNumber,
      userId,
      guestEmail,
      subtotal,
      discountAmount,
      shippingAmount,
      total,
      couponId,
      shippingAddressId,
      items: { create: orderItems },
    });

    if (couponId) await CouponModel.incrementUsage(couponId);

    return NextResponse.json(order, { status: 201 });
  },

  updateStatus: async (id: string, body: unknown) => {
    const parsed = updateOrderStatusSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const order = await OrderModel.update(id, {
      status: parsed.data.status as never,
      ...(parsed.data.trackingNumber && { trackingNumber: parsed.data.trackingNumber }),
      ...(parsed.data.carrier && { carrier: parsed.data.carrier }),
      ...(parsed.data.notes && { notes: parsed.data.notes }),
      ...(parsed.data.status === "SHIPPED" && { shippedAt: new Date() }),
      ...(parsed.data.status === "DELIVERED" && { deliveredAt: new Date() }),
    });

    return NextResponse.json(order);
  },
};
