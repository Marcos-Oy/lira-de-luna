import { prisma } from "@/lib/db";
import type { CreateAdminUserInput, UpdateAdminUserInput } from "@/lib/validations/admin";

export const AdminUserModel = {
  findByEmail: (email: string) =>
    prisma.adminUser.findUnique({ where: { email } }),

  findById: (id: string) =>
    prisma.adminUser.findUnique({ where: { id } }),

  findAll: async () => {
    const users = await prisma.adminUser.findMany({
      select: {
        id: true, email: true, name: true, role: true,
        permissions: true, isActive: true, lastLoginAt: true, createdAt: true,
        whatsappNumber: true,
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return users.map((u) => ({ ...u, permissions: u.permissions as string[] }));
  },

  create: (data: Omit<CreateAdminUserInput, "password"> & { passwordHash: string; createdById?: string }) =>
    prisma.adminUser.create({
      data: { ...data, role: data.role as never, permissions: data.permissions ?? [] },
    }),

  update: (id: string, data: Partial<Omit<UpdateAdminUserInput, "password"> & { passwordHash?: string }>) =>
    prisma.adminUser.update({
      where: { id },
      data: { ...(data.role && { role: data.role as never }), ...data },
    }),

  updateLastLogin: (id: string) =>
    prisma.adminUser.update({ where: { id }, data: { lastLoginAt: new Date() } }),

  delete: (id: string) => prisma.adminUser.delete({ where: { id } }),

  createAuditLog: (data: {
    adminUserId: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: Record<string, unknown> | null;
    ipAddress?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) => prisma.auditLog.create({ data: { ...data, details: (data.details as any) ?? undefined } }),
};
