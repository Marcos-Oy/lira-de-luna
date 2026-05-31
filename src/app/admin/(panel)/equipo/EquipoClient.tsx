"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Search, Plus, Edit2, Trash2, RotateCcw, X, Check,
  ShieldCheck, ChevronDown, ChevronRight,
} from "lucide-react";
import {
  createAdminUser,
  updateAdminUser,
  toggleAdminUserActive,
  resetAdminPassword,
  deleteAdminUser,
} from "@/app/actions/admin/adminUsers";

// ── Types ──────────────────────────────────────────────────────

type AdminUserData = {
  id: string;
  name: string;
  email: string;
  role: "ROOT" | "MANAGER" | "EDITOR" | "VIEWER";
  permissions: string[];
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  createdBy: { name: string } | null;
  whatsappNumber: string | null;
};

interface Props {
  adminUsers: AdminUserData[];
  currentAdminId: string;
  currentAdminRole: string;
}

// ── Permission groups (covers all sidebar modules) ─────────────

const PERMISSION_GROUPS = [
  {
    group: "Tienda",
    items: [
      { key: "productos",   label: "Productos" },
      { key: "colecciones", label: "Colecciones" },
      { key: "filtros",     label: "Filtros" },
    ],
  },
  {
    group: "Ventas",
    items: [
      { key: "pedidos",          label: "Registros de pago" },
      { key: "venta_presencial", label: "Venta presencial" },
      { key: "compras",          label: "Compras" },
    ],
  },
  {
    group: "Postventa",
    items: [
      { key: "devoluciones", label: "Devoluciones" },
      { key: "perdidas",     label: "Pérdidas" },
    ],
  },
  {
    group: "Clientes",
    items: [
      { key: "usuarios", label: "Clientes" },
      { key: "crm",      label: "CRM" },
    ],
  },
  {
    group: "Marketing",
    items: [
      { key: "personalizacion", label: "Personalización" },
      { key: "campanas",        label: "Campañas" },
      { key: "landing_pages",   label: "Landing pages" },
      { key: "notificaciones",  label: "Notificaciones" },
    ],
  },
  {
    group: "Finanzas",
    items: [{ key: "finanzas", label: "Finanzas" }],
  },
  {
    group: "Ajustes",
    items: [{ key: "configuracion", label: "Configuración" }],
  },
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.items);

const ROLE_META: Record<string, { label: string; description: string; bg: string; text: string }> = {
  ROOT:    { label: "Root",    description: "Acceso total, sin restricciones",           bg: "bg-[#5C4A3E]", text: "text-white" },
  MANAGER: { label: "Manager", description: "Gestión operativa completa",                bg: "bg-[#CDA78F]", text: "text-white" },
  EDITOR:  { label: "Editor",  description: "Edición de contenido y productos",          bg: "bg-[#D8BFAE]", text: "text-[#5C4A3E]" },
  VIEWER:  { label: "Viewer",  description: "Solo lectura en las secciones autorizadas", bg: "bg-[#EDE2D8]", text: "text-[#8E7A6B]" },
};

// ── Helpers ───────────────────────────────────────────────────

function Avatar({ name, email }: { name: string; email: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["bg-[#CDA78F] text-white", "bg-[#D8BFAE] text-[#5C4A3E]", "bg-[#8E7A6B] text-white", "bg-[#EDE2D8] text-[#5C4A3E]"];
  const color = colors[email.charCodeAt(0) % colors.length];
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const m = ROLE_META[role] ?? { label: role, bg: "bg-[#EDE2D8]", text: "text-[#8E7A6B]" };
  return (
    <span className={`text-[9px] tracking-[0.12em] uppercase px-2 py-0.5 ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}

function labelForKey(key: string) {
  return ALL_PERMISSIONS.find((p) => p.key === key)?.label ?? key;
}

function groupForKey(key: string) {
  return PERMISSION_GROUPS.find((g) => g.items.some((i) => i.key === key))?.group ?? "";
}

// ── Permissions picker ────────────────────────────────────────

function PermissionsPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (perms: string[]) => void;
}) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PERMISSION_GROUPS.map((g) => [g.group, true]))
  );

  function toggleGroup(group: string) {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  }

  function toggleItem(key: string) {
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  }

  function toggleGroupAll(group: typeof PERMISSION_GROUPS[0]) {
    const keys = group.items.map((i) => i.key);
    const allSelected = keys.every((k) => selected.includes(k));
    if (allSelected) {
      onChange(selected.filter((k) => !keys.includes(k)));
    } else {
      const next = [...selected];
      for (const k of keys) if (!next.includes(k)) next.push(k);
      onChange(next);
    }
  }

  return (
    <div className="border border-[#D8BFAE] divide-y divide-[#EDE2D8]">
      {PERMISSION_GROUPS.map((g) => {
        const keys = g.items.map((i) => i.key);
        const selectedCount = keys.filter((k) => selected.includes(k)).length;
        const allSelected = selectedCount === keys.length;
        const someSelected = selectedCount > 0 && !allSelected;
        const isOpen = openGroups[g.group] ?? true;

        return (
          <div key={g.group}>
            {/* Group header */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#F7F4F1]">
              <button
                type="button"
                onClick={() => toggleGroup(g.group)}
                className="flex items-center gap-1.5 text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors"
              >
                {isOpen ? <ChevronDown size={11} strokeWidth={1.5} /> : <ChevronRight size={11} strokeWidth={1.5} />}
                {g.group}
              </button>
              <button
                type="button"
                onClick={() => toggleGroupAll(g)}
                className={`text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 transition-colors ${
                  allSelected
                    ? "bg-[#CDA78F] text-white"
                    : someSelected
                    ? "bg-[#EDE2D8] text-[#5C4A3E]"
                    : "text-[#8E7A6B] hover:text-[#5C4A3E]"
                }`}
              >
                {allSelected ? "Quitar todos" : "Todos"}
              </button>
            </div>

            {/* Items */}
            {isOpen && (
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 px-3 py-2.5 bg-white">
                {g.items.map((item) => (
                  <label key={item.key} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selected.includes(item.key)}
                      onChange={() => toggleItem(item.key)}
                      className="w-3.5 h-3.5 accent-[#CDA78F]"
                    />
                    <span className="text-[10px] text-[#8E7A6B] group-hover:text-[#5C4A3E] transition-colors">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Admin Form Modal ──────────────────────────────────────────

type AdminFormData = {
  name: string;
  email: string;
  password: string;
  role: string;
  permissions: string[];
  whatsappNumber: string;
};

const emptyForm: AdminFormData = {
  name: "", email: "", password: "", role: "EDITOR", permissions: [], whatsappNumber: "",
};

function AdminFormModal({
  mode,
  initial,
  onClose,
  onSubmit,
  isPending,
}: {
  mode: "create" | "edit";
  initial: AdminFormData;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<AdminFormData>(initial);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("name", form.name);
    fd.set("email", form.email);
    if (mode === "create") fd.set("password", form.password);
    fd.set("role", form.role);
    form.permissions.forEach((p) => fd.append("permissions", p));
    fd.set("whatsappNumber", form.whatsappNumber);
    onSubmit(fd);
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-[#F7F4F1] border border-[#D8BFAE] w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8BFAE] shrink-0">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">
            {mode === "create" ? "Nuevo miembro del equipo" : "Editar miembro"}
          </h2>
          <button onClick={onClose} className="text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Name + Email row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] block mb-1.5">Nombre</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                required
              />
            </div>
            <div>
              <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] block mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                disabled={mode === "edit"}
                className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />
            </div>
          </div>

          {/* Password (create only) */}
          {mode === "create" && (
            <div>
              <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] block mb-1.5">Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                minLength={8}
                required
              />
              <p className="text-[9px] text-[#8E7A6B] mt-1">Mínimo 8 caracteres</p>
            </div>
          )}

          {/* Role */}
          <div>
            <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] block mb-1.5">Rol</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] cursor-pointer"
            >
              {Object.entries(ROLE_META).map(([key, m]) => (
                <option key={key} value={key}>
                  {m.label} — {m.description}
                </option>
              ))}
            </select>
          </div>

          {/* Permissions (not for ROOT) */}
          {form.role !== "ROOT" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">
                  Permisos por módulo
                </label>
                <span className="text-[9px] text-[#CDA78F]">
                  {form.permissions.length} / {ALL_PERMISSIONS.length} seleccionados
                </span>
              </div>
              <PermissionsPicker
                selected={form.permissions}
                onChange={(perms) => setForm((f) => ({ ...f, permissions: perms }))}
              />
            </div>
          )}

          {form.role === "ROOT" && (
            <div className="bg-[#EDE2D8] px-4 py-3 text-[10px] text-[#5C4A3E]">
              Los administradores <strong>Root</strong> tienen acceso completo a todos los módulos.
              No es necesario asignar permisos individuales.
            </div>
          )}

          {/* WhatsApp */}
          <div>
            <label className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] block mb-1.5">
              WhatsApp <span className="normal-case tracking-normal opacity-70">(recuperación de contraseña)</span>
            </label>
            <input
              type="tel"
              value={form.whatsappNumber}
              onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))}
              placeholder="56912345678"
              className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] font-mono"
            />
            <p className="text-[9px] text-[#8E7A6B] mt-1">Con código de país, sin espacios ni guiones.</p>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-[#D8BFAE] flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-[#D8BFAE] text-[10px] tracking-[0.15em] uppercase text-[#8E7A6B] py-2.5 hover:border-[#CDA78F] transition-colors"
          >
            Cancelar
          </button>
          <button
            form=""
            onClick={(e) => {
              e.preventDefault();
              const fd = new FormData();
              fd.set("name", form.name);
              fd.set("email", form.email);
              if (mode === "create") fd.set("password", form.password);
              fd.set("role", form.role);
              form.permissions.forEach((p) => fd.append("permissions", p));
              fd.set("whatsappNumber", form.whatsappNumber);
              onSubmit(fd);
            }}
            disabled={isPending}
            className="flex-1 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[10px] tracking-[0.15em] uppercase py-2.5 transition-colors disabled:opacity-50"
          >
            {isPending ? "Guardando…" : mode === "create" ? "Crear" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reset Password Modal ──────────────────────────────────────

function ResetPasswordModal({
  adminId,
  adminName,
  onClose,
}: {
  adminId: string;
  adminName: string;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await resetAdminPassword(adminId, password);
      if (res?.error) setError(res.error);
      else setOk(true);
    });
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-[#F7F4F1] border border-[#D8BFAE] w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8BFAE]">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">
            Resetear contraseña
          </h2>
          <button onClick={onClose} className="text-[#8E7A6B] hover:text-[#5C4A3E]">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
        <div className="px-6 py-5">
          {ok ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Check size={24} className="text-[#CDA78F]" strokeWidth={1.5} />
              <p className="text-xs text-[#5C4A3E]">Contraseña actualizada correctamente</p>
              <button onClick={onClose} className="text-[10px] tracking-[0.15em] uppercase text-[#8E7A6B] underline">
                Cerrar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-[10px] text-[#8E7A6B]">
                Nueva contraseña para <strong className="text-[#5C4A3E]">{adminName}</strong>
              </p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nueva contraseña (mín. 8 caracteres)"
                className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F]"
                minLength={8}
                required
              />
              {error && <p className="text-[10px] text-red-500">{error}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 border border-[#D8BFAE] text-[10px] tracking-[0.15em] uppercase text-[#8E7A6B] py-2.5 hover:border-[#CDA78F] transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isPending} className="flex-1 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[10px] tracking-[0.15em] uppercase py-2.5 transition-colors disabled:opacity-50">
                  {isPending ? "Guardando…" : "Actualizar"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Permissions summary (compact display in table) ────────────

function PermsSummary({ permissions, role }: { permissions: string[]; role: string }) {
  if (role === "ROOT") return <span className="text-[10px] text-[#8E7A6B] italic">Acceso total</span>;
  if (permissions.length === 0) return <span className="text-[10px] text-[#8E7A6B]/50">Sin permisos</span>;

  const byGroup = PERMISSION_GROUPS
    .map((g) => ({
      group: g.group,
      count: g.items.filter((i) => permissions.includes(i.key)).length,
      total: g.items.length,
    }))
    .filter((g) => g.count > 0);

  return (
    <div className="flex flex-wrap gap-1">
      {byGroup.map((g) => (
        <span key={g.group} className="text-[9px] bg-[#EDE2D8] text-[#8E7A6B] px-1.5 py-0.5 whitespace-nowrap">
          {g.group} {g.count < g.total && `(${g.count}/${g.total})`}
        </span>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export default function EquipoClient({ adminUsers, currentAdminId, currentAdminRole }: Props) {
  const [search, setSearch]             = useState("");
  const [showForm, setShowForm]         = useState(false);
  const [editTarget, setEditTarget]     = useState<AdminUserData | null>(null);
  const [resetTarget, setResetTarget]   = useState<AdminUserData | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError]               = useState("");
  const [isPending, startTransition]    = useTransition();
  const isRoot = currentAdminRole === "ROOT";

  const filtered = useMemo(
    () =>
      adminUsers.filter(
        (a) =>
          !search ||
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.email.toLowerCase().includes(search.toLowerCase())
      ),
    [adminUsers, search]
  );

  function handleCreate(fd: FormData) {
    setError("");
    startTransition(async () => {
      const res = await createAdminUser(fd);
      if (res?.error) setError(res.error);
      else setShowForm(false);
    });
  }

  function handleEdit(fd: FormData) {
    if (!editTarget) return;
    setError("");
    startTransition(async () => {
      const res = await updateAdminUser(editTarget.id, fd);
      if (res?.error) setError(res.error);
      else setEditTarget(null);
    });
  }

  function handleToggleActive(a: AdminUserData) {
    startTransition(async () => {
      const res = await toggleAdminUserActive(a.id, !a.isActive);
      if (res?.error) setError(res.error);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteAdminUser(id);
      if (res?.error) setError(res.error);
      else setDeleteConfirm(null);
    });
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl text-[#5C4A3E] tracking-wide">Equipo</h1>
        <p className="text-[11px] text-[#8E7A6B] mt-1">
          Administradores con acceso al panel. Solo Root puede crear y modificar cuentas de equipo.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2.5 w-64">
          <Search size={13} strokeWidth={1.5} className="text-[#8E7A6B]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email…"
            className="bg-transparent text-xs text-[#5C4A3E] placeholder:text-[#8E7A6B] outline-none w-full"
          />
        </div>
        {isRoot && (
          <button
            onClick={() => { setShowForm(true); setError(""); }}
            className="flex items-center gap-2 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[10px] tracking-[0.15em] uppercase px-4 py-2.5 transition-colors"
          >
            <Plus size={13} strokeWidth={2} />
            Agregar miembro
          </button>
        )}
      </div>

      {!isRoot && (
        <p className="text-[10px] text-[#8E7A6B] bg-[#EDE2D8] px-4 py-3">
          Solo los administradores con rol <strong>Root</strong> pueden gestionar el equipo.
        </p>
      )}

      {error && (
        <p className="text-[10px] text-red-500 bg-red-50 border border-red-200 px-3 py-2">{error}</p>
      )}

      {/* Roles legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(ROLE_META).map(([key, m]) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`text-[9px] tracking-[0.12em] uppercase px-2 py-0.5 ${m.bg} ${m.text}`}>{m.label}</span>
            <span className="text-[10px] text-[#8E7A6B]">{m.description}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#F7F4F1] border border-[#D8BFAE] overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#8E7A6B]">
            {adminUsers.length === 0 ? "Sin miembros de equipo" : "Sin resultados"}
          </div>
        ) : (
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-[#D8BFAE] bg-[#EDE2D8]/40">
                {["Miembro", "Rol", "Permisos por módulo", "Último acceso", "Estado", isRoot ? "Acciones" : ""].filter(Boolean).map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDE2D8]">
              {filtered.map((a) => {
                const isSelf = a.id === currentAdminId;
                return (
                  <tr key={a.id} className={`transition-colors ${isSelf ? "bg-[#EDE2D8]/20" : "hover:bg-[#EDE2D8]/20"}`}>
                    {/* Member */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={a.name} email={a.email} />
                        <div>
                          <p className="text-xs text-[#5C4A3E] font-medium">
                            {a.name}
                            {isSelf && <span className="ml-2 text-[9px] text-[#CDA78F]">(Tú)</span>}
                          </p>
                          <p className="text-[10px] text-[#8E7A6B]">{a.email}</p>
                          {a.createdBy && (
                            <p className="text-[9px] text-[#8E7A6B]/60">Creado por {a.createdBy.name}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-5 py-4">
                      <RoleBadge role={a.role} />
                    </td>

                    {/* Permissions */}
                    <td className="px-5 py-4 max-w-[260px]">
                      <PermsSummary permissions={a.permissions} role={a.role} />
                    </td>

                    {/* Last login */}
                    <td className="px-5 py-4 text-[10px] text-[#8E7A6B] whitespace-nowrap">
                      {a.lastLoginAt
                        ? new Date(a.lastLoginAt).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })
                        : "Nunca"}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className={`text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 ${a.isActive ? "bg-emerald-100 text-emerald-700" : "bg-[#EDE2D8] text-[#8E7A6B]"}`}>
                        {a.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    {/* Actions (ROOT only, not self) */}
                    {isRoot && (
                      <td className="px-5 py-4">
                        {!isSelf && (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => { setEditTarget(a); setError(""); }}
                              title="Editar"
                              className="text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors"
                            >
                              <Edit2 size={13} strokeWidth={1.5} />
                            </button>
                            <button
                              onClick={() => setResetTarget(a)}
                              title="Resetear contraseña"
                              className="text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors"
                            >
                              <RotateCcw size={13} strokeWidth={1.5} />
                            </button>
                            <button
                              onClick={() => handleToggleActive(a)}
                              disabled={isPending}
                              title={a.isActive ? "Desactivar" : "Activar"}
                              className={`text-[10px] uppercase tracking-wide transition-colors ${
                                a.isActive ? "text-amber-500 hover:text-amber-700" : "text-emerald-500 hover:text-emerald-700"
                              }`}
                            >
                              {a.isActive ? "Desactivar" : "Activar"}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(a.id)}
                              title="Eliminar"
                              className="text-[#8E7A6B] hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={13} strokeWidth={1.5} />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div className="px-5 py-3.5 border-t border-[#D8BFAE]">
          <p className="text-[10px] text-[#8E7A6B]">
            {filtered.length} de {adminUsers.length} {adminUsers.length === 1 ? "miembro" : "miembros"}
          </p>
        </div>
      </div>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-[#F7F4F1] border border-[#D8BFAE] w-full max-w-sm shadow-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="text-red-400 shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="text-xs text-[#5C4A3E] font-medium">¿Eliminar este miembro del equipo?</p>
                <p className="text-[10px] text-[#8E7A6B] mt-1">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-[#D8BFAE] text-[10px] tracking-[0.15em] uppercase text-[#8E7A6B] py-2.5 hover:border-[#CDA78F] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isPending}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white text-[10px] tracking-[0.15em] uppercase py-2.5 transition-colors disabled:opacity-50"
              >
                {isPending ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <AdminFormModal
          mode="create"
          initial={emptyForm}
          onClose={() => setShowForm(false)}
          onSubmit={handleCreate}
          isPending={isPending}
        />
      )}
      {editTarget && (
        <AdminFormModal
          mode="edit"
          initial={{
            name: editTarget.name,
            email: editTarget.email,
            password: "",
            role: editTarget.role,
            permissions: editTarget.permissions,
            whatsappNumber: editTarget.whatsappNumber ?? "",
          }}
          onClose={() => setEditTarget(null)}
          onSubmit={handleEdit}
          isPending={isPending}
        />
      )}
      {resetTarget && (
        <ResetPasswordModal
          adminId={resetTarget.id}
          adminName={resetTarget.name}
          onClose={() => setResetTarget(null)}
        />
      )}
    </div>
  );
}
