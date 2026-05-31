"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useState } from "react";
import { ClipboardList, ChevronLeft, ChevronRight, Search, X, Filter } from "lucide-react";

type AuditLog = {
  id:         string;
  action:     string;
  resource:   string;
  resourceId: string | null;
  details:    Record<string, unknown> | null;
  ipAddress:  string | null;
  createdAt:  string;
  adminUser:  { name: string; email: string; role: string } | null;
};

type Admin = { id: string; name: string; email: string };

interface Props {
  logs:       AuditLog[];
  total:      number;
  page:       number;
  totalPages: number;
  todayCount: number;
  admins:     Admin[];
  filters:    { action: string; resource: string; adminId: string; dateFrom: string; dateTo: string };
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN:   "bg-emerald-50 text-emerald-700",
  CREATE:  "bg-blue-50 text-blue-700",
  UPDATE:  "bg-amber-50 text-amber-700",
  DELETE:  "bg-red-50 text-red-700",
  EXPORT:  "bg-purple-50 text-purple-700",
};

const WINDOW = 10;

export default function AuditoriaClient({ logs, total, page, totalPages, todayCount, admins, filters }: Props) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId]  = useState<string | null>(null);

  const [fAction,   setFAction]   = useState(filters.action);
  const [fResource, setFResource] = useState(filters.resource);
  const [fAdminId,  setFAdminId]  = useState(filters.adminId);
  const [fDateFrom, setFDateFrom] = useState(filters.dateFrom);
  const [fDateTo,   setFDateTo]   = useState(filters.dateTo);

  function navigate(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") params.delete(k); else params.set(k, v);
    }
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    navigate({ action: fAction, resource: fResource, adminId: fAdminId, dateFrom: fDateFrom, dateTo: fDateTo });
  }

  function clearFilters() {
    setFAction(""); setFResource(""); setFAdminId(""); setFDateFrom(""); setFDateTo("");
    startTransition(() => router.push(pathname));
  }

  function goToPage(n: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(n));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const hasFilters = !!(filters.action || filters.resource || filters.adminId || filters.dateFrom || filters.dateTo);
  const wStart = Math.floor((page - 1) / WINDOW) * WINDOW + 1;
  const wEnd   = Math.min(wStart + WINDOW - 1, totalPages);
  const pages  = Array.from({ length: wEnd - wStart + 1 }, (_, i) => wStart + i);

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <ClipboardList size={20} strokeWidth={1.5} className="text-[#CDA78F]" />
        <div>
          <h1 className="text-lg font-semibold text-[#5C4A3E]">Auditoría de Administradores</h1>
          <p className="text-[10px] text-[#8E7A6B] tracking-wide">ISO 27001 A.12.4.1 — Trazabilidad de acciones admin</p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 max-w-sm">
        <div className="bg-white border border-[#D8BFAE] p-4">
          <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] mb-1">Total registros</p>
          <p className="text-2xl font-bold text-[#5C4A3E]">{total}</p>
        </div>
        <div className="bg-white border border-[#D8BFAE] p-4">
          <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] mb-1">Acciones hoy</p>
          <p className="text-2xl font-bold text-[#5C4A3E]">{todayCount}</p>
        </div>
      </div>

      {/* Filtros */}
      <form onSubmit={applyFilters} className="bg-white border border-[#D8BFAE] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={13} strokeWidth={1.5} className="text-[#CDA78F]" />
          <span className="text-[10px] tracking-[0.15em] uppercase text-[#5C4A3E] font-medium">Filtros</span>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="ml-auto text-[9px] uppercase tracking-wide text-[#8E7A6B] hover:text-red-500 flex items-center gap-1">
              <X size={11} /> Limpiar
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <input value={fAction} onChange={(e) => setFAction(e.target.value)}
            placeholder="Acción (LOGIN, CREATE…)"
            className="border border-[#D8BFAE] text-[11px] text-[#5C4A3E] px-2 py-2 outline-none focus:border-[#CDA78F]" />
          <input value={fResource} onChange={(e) => setFResource(e.target.value)}
            placeholder="Recurso (Product, Order…)"
            className="border border-[#D8BFAE] text-[11px] text-[#5C4A3E] px-2 py-2 outline-none focus:border-[#CDA78F]" />
          <select value={fAdminId} onChange={(e) => setFAdminId(e.target.value)}
            className="border border-[#D8BFAE] text-[11px] text-[#5C4A3E] px-2 py-2 outline-none focus:border-[#CDA78F]">
            <option value="">Todos los admins</option>
            {admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input type="date" value={fDateFrom} onChange={(e) => setFDateFrom(e.target.value)}
            className="border border-[#D8BFAE] text-[11px] text-[#5C4A3E] px-2 py-2 outline-none focus:border-[#CDA78F]" />
          <input type="date" value={fDateTo} onChange={(e) => setFDateTo(e.target.value)}
            className="border border-[#D8BFAE] text-[11px] text-[#5C4A3E] px-2 py-2 outline-none focus:border-[#CDA78F]" />
        </div>
        <div className="flex justify-end mt-3">
          <button type="submit" disabled={isPending}
            className="flex items-center gap-1.5 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[10px] tracking-[0.15em] uppercase px-4 py-2 transition-colors disabled:opacity-50">
            <Search size={12} /> Buscar
          </button>
        </div>
      </form>

      {/* Tabla */}
      <div className={`bg-white border border-[#D8BFAE] overflow-hidden transition-opacity ${isPending ? "opacity-50" : ""}`}>
        <div className="px-4 py-3 border-b border-[#D8BFAE]">
          <p className="text-[10px] text-[#8E7A6B]">{total} registro{total !== 1 ? "s" : ""}</p>
        </div>

        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ClipboardList size={32} strokeWidth={1} className="text-[#D8BFAE]" />
            <p className="text-sm text-[#8E7A6B]">Sin registros{hasFilters ? " con estos filtros" : ""}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-[#F7F4F1] border-b border-[#D8BFAE]">
                  {["Fecha/Hora", "Admin", "Acción", "Recurso", "ID Recurso", "IP", ""].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const actionColor = Object.entries(ACTION_COLORS).find(([k]) => log.action.includes(k))?.[1]
                    ?? "bg-[#EDE2D8] text-[#8E7A6B]";
                  const isExpanded = expandedId === log.id;
                  return (
                    <>
                      <tr key={log.id}
                        className="border-b border-[#EDE2D8] hover:bg-[#F7F4F1] transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      >
                        <td className="px-3 py-2.5 font-mono text-[#8E7A6B] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("es-CL", {
                            day:"2-digit", month:"2-digit", year:"2-digit",
                            hour:"2-digit", minute:"2-digit", second:"2-digit",
                          })}
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="text-[#5C4A3E] font-medium">{log.adminUser?.name ?? "—"}</p>
                          <p className="text-[#8E7A6B] text-[9px]">{log.adminUser?.role}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 text-[9px] uppercase tracking-wide font-medium ${actionColor}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[#5C4A3E]">{log.resource}</td>
                        <td className="px-3 py-2.5 font-mono text-[#8E7A6B] text-[9px] max-w-[100px] truncate">
                          {log.resourceId ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[#8E7A6B]">{log.ipAddress ?? "—"}</td>
                        <td className="px-3 py-2.5 text-[#CDA78F] text-[9px]">
                          {log.details ? (isExpanded ? "▲" : "▼") : ""}
                        </td>
                      </tr>
                      {isExpanded && log.details && (
                        <tr key={`${log.id}-d`} className="bg-[#F7F4F1] border-b border-[#EDE2D8]">
                          <td colSpan={7} className="px-4 py-3">
                            <pre className="text-[10px] font-mono text-[#5C4A3E] whitespace-pre-wrap bg-white border border-[#D8BFAE] p-3 max-h-40 overflow-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-[#D8BFAE] flex items-center justify-between flex-wrap gap-2">
            <p className="text-[10px] text-[#8E7A6B]">{(page-1)*50+1}–{Math.min(page*50, total)} de {total}</p>
            <div className="flex items-center gap-1">
              {wStart > 1 && <button onClick={() => goToPage(wStart-1)} className="px-2 py-1 text-[10px] border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F]">‹‹</button>}
              <button onClick={() => goToPage(page-1)} disabled={page<=1} className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] disabled:opacity-40"><ChevronLeft size={12}/></button>
              {pages.map((n) => (
                <button key={n} onClick={() => goToPage(n)} className={`w-7 h-7 flex items-center justify-center text-[10px] border ${n===page ? "bg-[#CDA78F] border-[#CDA78F] text-white" : "border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F]"}`}>{n}</button>
              ))}
              <button onClick={() => goToPage(page+1)} disabled={page>=totalPages} className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] disabled:opacity-40"><ChevronRight size={12}/></button>
              {wEnd < totalPages && <button onClick={() => goToPage(wEnd+1)} className="px-2 py-1 text-[10px] border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F]">››</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
