"use client";

import { useState, useMemo } from "react";
import { Search, Users, UserX } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────

type CustomerData = {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
  _count: { orders: number };
  orders: { total: number; createdAt: Date }[];
};

type GuestData = {
  email: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: Date;
};

interface Props {
  customerUsers: CustomerData[];
  guestStats: GuestData[];
}

// ── Helpers ───────────────────────────────────────────────────

function Avatar({ name, email }: { name: string | null; email: string }) {
  const label = name ?? email;
  const initials = label.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["bg-[#CDA78F] text-white", "bg-[#D8BFAE] text-[#5C4A3E]", "bg-[#8E7A6B] text-white", "bg-[#EDE2D8] text-[#5C4A3E]"];
  const color = colors[label.charCodeAt(0) % colors.length];
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

// ── Clientes registrados ───────────────────────────────────────

function ClientesRegistrados({ users }: { users: CustomerData[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !search ||
        (u.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchFilter =
        filter === "Todos" ||
        (filter === "Con pedidos" && u._count.orders > 0) ||
        (filter === "Sin pedidos" && u._count.orders === 0);
      return matchSearch && matchFilter;
    });
  }, [users, search, filter]);

  return (
    <div className="space-y-4">
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
        <div className="flex gap-1">
          {["Todos", "Con pedidos", "Sin pedidos"].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-[10px] tracking-[0.1em] uppercase px-3 py-2 transition-colors ${
                filter === t
                  ? "bg-[#CDA78F] text-white"
                  : "bg-[#F7F4F1] border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#F7F4F1] border border-[#D8BFAE] overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#8E7A6B]">
            {users.length === 0 ? "Sin clientes registrados aún" : "Sin resultados"}
          </div>
        ) : (
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-[#D8BFAE] bg-[#EDE2D8]/40">
                {["Cliente", "Pedidos", "Gasto total", "Miembro desde", "Último pedido"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDE2D8]">
              {filtered.map((u) => {
                const totalSpent = u.orders.reduce((s, o) => s + o.total, 0);
                const lastOrder = u.orders[0]?.createdAt;
                return (
                  <tr key={u.id} className="hover:bg-[#EDE2D8]/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} email={u.email} />
                        <div>
                          <p className="text-xs text-[#5C4A3E] font-medium">{u.name ?? "—"}</p>
                          <p className="text-[10px] text-[#8E7A6B]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-[#5C4A3E]">
                      {u._count.orders} {u._count.orders === 1 ? "pedido" : "pedidos"}
                    </td>
                    <td className="px-5 py-4 text-xs text-[#5C4A3E] font-medium">
                      {totalSpent > 0 ? `$${totalSpent.toLocaleString("es-CL")} CLP` : "—"}
                    </td>
                    <td className="px-5 py-4 text-[10px] text-[#8E7A6B]">
                      {new Date(u.createdAt).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4 text-[10px] text-[#8E7A6B]">
                      {lastOrder
                        ? new Date(lastOrder).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div className="px-5 py-3.5 border-t border-[#D8BFAE]">
          <p className="text-[10px] text-[#8E7A6B]">{filtered.length} de {users.length} clientes registrados</p>
        </div>
      </div>
    </div>
  );
}

// ── Clientes invitados ─────────────────────────────────────────

function ClientesInvitados({ guests }: { guests: GuestData[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => guests.filter((g) => !search || g.email.toLowerCase().includes(search.toLowerCase())),
    [guests, search]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-[#F7F4F1] border border-[#D8BFAE] px-3 py-2.5 w-64">
          <Search size={13} strokeWidth={1.5} className="text-[#8E7A6B]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar email…"
            className="bg-transparent text-xs text-[#5C4A3E] placeholder:text-[#8E7A6B] outline-none w-full"
          />
        </div>
      </div>
      <p className="text-[10px] text-[#8E7A6B]">
        Compradores que no crearon una cuenta, identificados por el email del pedido.
      </p>

      <div className="bg-[#F7F4F1] border border-[#D8BFAE] overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#8E7A6B]">
            {guests.length === 0 ? "Sin compras de clientes invitados aún" : "Sin resultados"}
          </div>
        ) : (
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="border-b border-[#D8BFAE] bg-[#EDE2D8]/40">
                {["Email", "Pedidos", "Gasto total", "Última compra"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDE2D8]">
              {filtered.map((g) => (
                <tr key={g.email} className="hover:bg-[#EDE2D8]/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#EDE2D8] flex items-center justify-center shrink-0">
                        <UserX size={14} strokeWidth={1.5} className="text-[#8E7A6B]" />
                      </div>
                      <p className="text-xs text-[#5C4A3E]">{g.email}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs text-[#5C4A3E]">
                    {g.orderCount} {g.orderCount === 1 ? "pedido" : "pedidos"}
                  </td>
                  <td className="px-5 py-4 text-xs text-[#5C4A3E] font-medium">
                    ${g.totalSpent.toLocaleString("es-CL")} CLP
                  </td>
                  <td className="px-5 py-4 text-[10px] text-[#8E7A6B]">
                    {new Date(g.lastOrderAt).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="px-5 py-3.5 border-t border-[#D8BFAE]">
          <p className="text-[10px] text-[#8E7A6B]">{filtered.length} de {guests.length} clientes invitados</p>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

type Tab = "registrados" | "invitados";

export default function ClientesUsuariosClient({ customerUsers, guestStats }: Props) {
  const [tab, setTab] = useState<Tab>("registrados");

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: "registrados", label: "Clientes registrados", icon: <Users size={13} strokeWidth={1.5} />,   count: customerUsers.length },
    { key: "invitados",   label: "Compradores invitados", icon: <UserX size={13} strokeWidth={1.5} />,  count: guestStats.length },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="font-heading text-2xl text-[#5C4A3E] tracking-wide">Clientes</h1>
        <p className="text-[11px] text-[#8E7A6B] mt-1">
          Clientes con cuenta registrada y compradores que compraron como invitados.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap border-b border-[#D8BFAE] pb-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-3 text-[10px] tracking-[0.12em] uppercase transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "border-[#CDA78F] text-[#5C4A3E]"
                : "border-transparent text-[#8E7A6B] hover:text-[#5C4A3E]"
            }`}
          >
            {t.icon}
            {t.label}
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-[#CDA78F] text-white" : "bg-[#EDE2D8] text-[#8E7A6B]"}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {tab === "registrados" && <ClientesRegistrados users={customerUsers} />}
      {tab === "invitados"   && <ClientesInvitados guests={guestStats} />}
    </div>
  );
}
