import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import OrderDetailClient from "./OrderDetailClient";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user:            { select: { name: true, email: true, phone: true } },
      shippingAddress: true,
      items: {
        include: {
          product: { select: { name: true, slug: true, images: true } },
          variant: { select: { type: true, label: true } },
        },
        orderBy: { id: "asc" },
      },
      coupon: { select: { code: true } },
    },
  });

  if (!order) notFound();

  return <OrderDetailClient order={order as never} />;
}
