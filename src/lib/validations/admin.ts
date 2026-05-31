import { z } from "zod";
import { passwordSchema } from "@/lib/validations/user";

export const adminLoginSchema = z.object({
  email:    z.string().email().max(320),
  password: z.string().min(1).max(128),
});

export const createAdminUserSchema = z.object({
  name:        z.string().min(2).max(100),
  email:       z.string().email().max(320),
  password:    passwordSchema,               // ISO 27001 A.9.4.3
  role:        z.enum(["ROOT", "MANAGER", "EDITOR", "VIEWER"]),
  permissions: z.array(z.string().max(100)).max(50).default([]),
});

export const updateAdminUserSchema = z.object({
  name:        z.string().min(2).max(100).optional(),
  role:        z.enum(["ROOT", "MANAGER", "EDITOR", "VIEWER"]).optional(),
  permissions: z.array(z.string().max(100)).max(50).optional(),
  isActive:    z.boolean().optional(),
  password:    passwordSchema.optional(),    // ISO 27001 A.9.4.3
});

export const couponSchema = z.object({
  code:           z.string().min(3).max(30).toUpperCase(),
  description:    z.string().max(500).optional(),
  type:           z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"]),
  value:          z.number().int().positive(),
  minOrderAmount: z.number().int().positive().optional(),
  maxUses:        z.number().int().positive().optional(),
  isActive:       z.boolean().default(true),
  expiresAt:      z.string().datetime().optional(),
});

export type AdminLoginInput      = z.infer<typeof adminLoginSchema>;
export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;
export type CouponInput          = z.infer<typeof couponSchema>;
