import { AdminUserModel } from "@/models/admin-user.model";
import { createAdminUserSchema, updateAdminUserSchema } from "@/lib/validations/admin";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { AdminJWTPayload } from "./admin-auth.controller";

function hasPermission(admin: AdminJWTPayload, permission: string) {
  if (admin.role === "ROOT") return true;
  return admin.permissions.includes(permission);
}

export const AdminController = {
  getUsers: async (caller: AdminJWTPayload) => {
    if (!hasPermission(caller, "admin_users:read")) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }
    const users = await AdminUserModel.findAll();
    return NextResponse.json(users);
  },

  createUser: async (body: unknown, caller: AdminJWTPayload) => {
    if (!hasPermission(caller, "admin_users:write")) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const parsed = createAdminUserSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    // Only ROOT can create another ROOT
    if (parsed.data.role === "ROOT" && caller.role !== "ROOT") {
      return NextResponse.json({ error: "Solo ROOT puede crear otro ROOT" }, { status: 403 });
    }

    const existing = await AdminUserModel.findByEmail(parsed.data.email);
    if (existing) return NextResponse.json({ error: "Email ya en uso" }, { status: 409 });

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const { password: _p, ...rest } = parsed.data;

    const user = await AdminUserModel.create({
      ...rest,
      passwordHash,
      createdById: caller.adminId,
    });

    await AdminUserModel.createAuditLog({
      adminUserId: caller.adminId,
      action: "CREATE",
      resource: "AdminUser",
      resourceId: user.id,
      details: { email: user.email, role: user.role },
    });

    return NextResponse.json(user, { status: 201 });
  },

  updateUser: async (id: string, body: unknown, caller: AdminJWTPayload) => {
    if (!hasPermission(caller, "admin_users:write")) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const target = await AdminUserModel.findById(id);
    if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    // ROOT cannot be modified by non-ROOT
    if (target.role === "ROOT" && caller.role !== "ROOT") {
      return NextResponse.json({ error: "No puedes modificar un ROOT" }, { status: 403 });
    }

    const parsed = updateAdminUserSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const { password, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest };
    if (password) updateData.passwordHash = await bcrypt.hash(password, 12);

    const updated = await AdminUserModel.update(id, updateData);

    await AdminUserModel.createAuditLog({
      adminUserId: caller.adminId,
      action: "UPDATE",
      resource: "AdminUser",
      resourceId: id,
      details: rest,
    });

    return NextResponse.json(updated);
  },

  deleteUser: async (id: string, caller: AdminJWTPayload) => {
    if (!hasPermission(caller, "admin_users:delete")) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const target = await AdminUserModel.findById(id);
    if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    if (target.role === "ROOT") return NextResponse.json({ error: "No se puede eliminar el ROOT" }, { status: 403 });
    if (target.id === caller.adminId) return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 403 });

    await AdminUserModel.delete(id);

    await AdminUserModel.createAuditLog({
      adminUserId: caller.adminId,
      action: "DELETE",
      resource: "AdminUser",
      resourceId: id,
    });

    return NextResponse.json({ success: true });
  },
};
