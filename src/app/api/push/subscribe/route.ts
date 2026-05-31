import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashEndpoint } from "@/lib/web-push";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    const session = await auth();
    const userId  = session?.user?.id ?? null;
    const hash    = hashEndpoint(body.endpoint);

    await prisma.pushSubscription.upsert({
      where: { endpointHash: hash },
      update: { p256dh: body.keys.p256dh, auth: body.keys.auth, userId },
      create: {
        endpointHash: hash,
        endpoint:     body.endpoint,
        p256dh:       body.keys.p256dh,
        auth:         body.keys.auth,
        userId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json() as { endpoint: string };
    const hash = hashEndpoint(endpoint);
    await prisma.pushSubscription.deleteMany({ where: { endpointHash: hash } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
