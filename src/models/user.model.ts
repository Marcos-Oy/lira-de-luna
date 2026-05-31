import { prisma } from "@/lib/db";

export const UserModel = {
  findByEmail: (email: string) =>
    prisma.user.findUnique({ where: { email } }),

  findById: (id: string) =>
    prisma.user.findUnique({
      where:  { id },
      select: { id: true, email: true, name: true, image: true, phone: true, role: true, createdAt: true },
    }),

  create: (data: { email: string; name?: string; passwordHash?: string; image?: string }) =>
    prisma.user.create({ data }),

  update: (id: string, data: Partial<{ name: string; phone: string; image: string; emailVerified: Date; country: string }>) =>
    prisma.user.update({ where: { id }, data }),

  findAll: (page = 1, limit = 20) =>
    prisma.user.findMany({
      skip:    (page - 1) * limit,
      take:    limit,
      select:  { id: true, email: true, name: true, role: true, createdAt: true, _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" },
    }),

  count: () => prisma.user.count(),

  // ── Direcciones ─────────────────────────────────────────────

  findDefaultAddress: (userId: string) =>
    prisma.address.findFirst({ where: { userId, isDefault: true } }),

  createAddress: (data: {
    userId:     string;
    name:       string;
    phone:      string;
    street:     string;
    city:       string;
    state:      string;
    zip:        string;
    country:    string;
    isDefault?: boolean;
  }) => prisma.address.create({ data }),

  // ── Newsletter ───────────────────────────────────────────────

  upsertNewsletter: (
    email: string,
    data:  { name?: string; userId?: string; source?: string },
  ) =>
    prisma.newsletterSubscriber.upsert({
      where:  { email },
      update: {
        isActive: true,
        ...(data.userId && { userId: data.userId }),
        ...(data.name   && { name:   data.name }),
      },
      create: { email, ...data },
    }),
};
