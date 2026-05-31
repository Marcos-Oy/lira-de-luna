import { z } from "zod";

// ── ISO 27001 A.9.4.3 — Password Management System ───────────
// Contraseña segura: min 8 chars, mayúscula, minúscula, número y símbolo.
export const passwordSchema = z
  .string()
  .min(8,   "Mínimo 8 caracteres")
  .max(128, "Máximo 128 caracteres")
  .regex(/[A-Z]/,        "Debe incluir al menos una letra mayúscula")
  .regex(/[a-z]/,        "Debe incluir al menos una letra minúscula")
  .regex(/[0-9]/,        "Debe incluir al menos un número")
  .regex(/[^A-Za-z0-9]/, "Debe incluir al menos un símbolo (!@#$%&*...)");

export const registerSchema = z.object({
  name:     z.string().min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres"),
  email:    z.string().email("Email inválido").max(320),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email:    z.string().email().max(320),
  password: z.string().min(1).max(128),
});

export const updateProfileSchema = z.object({
  name:  z.string().min(2).max(100).optional(),
  phone: z.string().max(30).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword:     passwordSchema,
});

export const addressSchema = z.object({
  name:      z.string().min(2).max(150),
  phone:     z.string().max(30).optional(),
  street:    z.string().min(5).max(250),
  city:      z.string().min(2).max(100),
  state:     z.string().min(2).max(100),
  zip:       z.string().min(3).max(20),
  country:   z.string().length(2).default("CL"),
  isDefault: z.boolean().default(false),
});

export type RegisterInput       = z.infer<typeof registerSchema>;
export type LoginInput          = z.infer<typeof loginSchema>;
export type AddressInput        = z.infer<typeof addressSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
