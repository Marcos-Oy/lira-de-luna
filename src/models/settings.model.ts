import { prisma } from "@/lib/db";

export const SettingsModel = {
  findSingleton: () =>
    prisma.storeSettings.findUnique({ where: { id: "singleton" } }),
};
