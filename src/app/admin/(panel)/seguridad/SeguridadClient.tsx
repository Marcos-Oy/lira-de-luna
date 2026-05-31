"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useState } from "react";
import {
  ShieldAlert, ShieldCheck, AlertTriangle, XCircle,
  Info, ChevronLeft, ChevronRight, Search, X, Filter,
} from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────

type SecurityLog = {
  id:        string;
  event:     string;
  severity:  string;
  ip:        string | null;
  userAgent: string | null;
  email:     string | null;
  userId:    string | null;
  adminId:   string | null;
  details:   Record<string, unknown> | null;
  createdAt: string;
};

type Kpis = {
  todayTotal:   number;
  todayFailed:  number;
  todayBlocked: number;
  todayCritical: number;
};

type Filters = {
  event:     string;
  severity:  string;
  ip:        string;
  email:     string;
  dateFrom:  string;
  dateTo:    string;
};

interface Props {
  logs:       SecurityLog[];
  total:      number;
  page:       number;
  totalPages: number;
  kpis:       Kpis;
  filters:    Filters;
}

// ── Constantes ────────────────────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
  LOGIN_SUCCESS:          "Login exitoso",
  LOGIN_FAILED:           "Login fallido",
  LOGIN_BLOCKED:          "Login bloqueado (IP)",
  ADMIN_LOGIN_SUCCESS:    "Admin login OK",
  ADMIN_LOGIN_FAILED:     "Admin login fallido",
  ADMIN_LOGIN_BLOCKED:    "Admin bloqueado",
  REGISTER_SUCCESS:       "Registro exitoso",
  REGISTER_BLOCKED:       "Registro bloqueado",
  ACCOUNT_LOCKED:         "Cuenta bloqueada",
  RATE_LIMIT_EXCEEDED:    "Rate limit excedido",
  PASSWORD_RESET_REQUEST: "Reset contraseña",
  PASSWORD_CHANGED:       "Contraseña cambiada",
  SUSPICIOUS_ACTIVITY:    "Actividad sospechosa",
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  INFO:     { label: "Info",     color: "text-[#8E7A6B]",  bg: "bg-[#EDE2D8]",        icon: Info          },
  WARNING:  { label: "Alerta",  color: "text-amber-700",   bg: "bg-amber-50",          icon: AlertTriangle },
  ERROR:    { label: "Error",   color: "text-orange-700",  bg: "bg-orange-50",         icon: ShieldAlert   },
  CRITICAL: { label: "Crítico", color: "text-red-700",     bg: "bg-red-50",            icon: XCircle       },
};

const WINDOW = 10;

// ── Sub-componente: KPI card ──────────────────────────────────

function KpiCard({ label, value, sub, danger }: { label: string; value: number; sub: string; danger?: boolean }) {
  return (
    <div className={`bg-white border p-4 ${danger && value > 0 ? "border-red-200 bg-red-50" : "border-[#D8BFAE]"}`}>
      <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] mb-1">{label}</p>
      <p className={`text-2xl font-bold ${danger && value > 0 ? "text-red-600" : "text-[#5C4A3E]"}`}>{value}</p>
      <p className="text-[10px] text-[#8E7A6B] mt-0.5">{sub}</p>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────

export default function SeguridadClient({ logs, total, page, totalPages, kpis, filters }: Props) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId]  = useState<string | null>(null);

  // Form state (local — submit on Enter or button)
  const [fEvent,    setFEvent]    = useState(filters.event);
  const [fSeverity, setFSeverity] = useState(filters.severity);
  const [fIp,       setFIp]       = useState(filters.ip);
  const [fEmail,    setFEmail]    = useState(filters.email);
  const [fDateFrom, setFDateFrom] = useState(filters.dateFrom);
  const [fDateTo,   setFDateTo]   = useState(filters.dateTo);

  function navigate(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    navigate({ event: fEvent, severity: fSeverity, ip: fIp, email: fEmail, dateFrom: fDateFrom, dateTo: fDateTo });
  }

  function clearFilters() {
    setFEvent(""); setFSeverity(""); setFIp(""); setFEmail(""); setFDateFrom(""); setFDateTo("");
    startTransition(() => router.push(pathname));
  }

  function goToPage(n: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(n));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const hasFilters = !!(filters.event || filters.severity || filters.ip || filters.email || filters.dateFrom || filters.dateTo);

  // Paginación en ventanas de WINDOW páginas
  const wStart = Math.floor((page - 1) / WINDOW) * WINDOW + 1;
  const wEnd   = Math.min(wStart + WINDOW - 1, totalPages);
  const pages  = Array.from({ length: wEnd - wStart + 1 }, (_, i) => wStart + i);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <ShieldAlert size={20} strokeWidth={1.5} className="text-[#CDA78F]" />
        <div>
          <h1 className="text-lg font-semibold text-[#5C4A3E]">Logs de Seguridad</h1>
          <p className="text-[10px] text-[#8E7A6B] tracking-wide">ISO 27001 A.12.4.1 — Registro de eventos</p>
        </div>
      </div>

      {/* KPIs del día */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Eventos hoy"         value={kpis.todayTotal}    sub="Total del día"            />
        <KpiCard label="Intentos fallidos"   value={kpis.todayFailed}   sub="Login fallido hoy"        />
        <KpiCard label="Bloqueos activos"    value={kpis.todayBlocked}  sub="IPs/cuentas bloqueadas"   danger />
        <KpiCard label="Eventos críticos"    value={kpis.todayCritical} sub="Severidad CRITICAL hoy"   danger />
      </div>

      {/* Filtros */}
      <form onSubmit={applyFilters} className="bg-white border border-[#D8BFAE] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={13} strokeWidth={1.5} className="text-[#CDA78F]" />
          <span className="text-[10px] tracking-[0.15em] uppercase text-[#5C4A3E] font-medium">Filtros</span>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="ml-auto text-[9px] uppercase tracking-wide text-[#8E7A6B] hover:text-red-500 flex items-center gap-1 transition-colors">
              <X size={11} /> Limpiar
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <select value={fEvent} onChange={(e) => setFEvent(e.target.value)}
            className="border border-[#D8BFAE] text-[11px] text-[#5C4A3E] px-2 py-2 outline-none focus:border-[#CDA78F]">
            <option value="">Todos los eventos</option>
            {Object.entries(EVENT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

          <select value={fSeverity} onChange={(e) => setFSeverity(e.target.value)}
            className="border border-[#D8BFAE] text-[11px] text-[#5C4A3E] px-2 py-2 outline-none focus:border-[#CDA78F]">
            <option value="">Toda severidad</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Alerta</option>
            <option value="ERROR">Error</option>
            <option value="CRITICAL">Crítico</option>
          </select>

          <input value={fIp} onChange={(e) => setFIp(e.target.value)}
            placeholder="IP…" className="border border-[#D8BFAE] text-[11px] text-[#5C4A3E] px-2 py-2 outline-none focus:border-[#CDA78F] font-mono" />

          <input value={fEmail} onChange={(e) => setFEmail(e.target.value)}
            placeholder="Email…" className="border border-[#D8BFAE] text-[11px] text-[#5C4A3E] px-2 py-2 outline-none focus:border-[#CDA78F]" />

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

        {/* Cabecera */}
        <div className="px-4 py-3 border-b border-[#D8BFAE] flex items-center justify-between">
          <p className="text-[10px] text-[#8E7A6B]">
            {total} evento{total !== 1 ? "s" : ""}{hasFilters ? " encontrados" : " en total"}
          </p>
          {totalPages > 1 && (
            <p className="text-[10px] text-[#8E7A6B]">Página {page} de {totalPages}</p>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ShieldCheck size={32} strokeWidth={1} className="text-[#D8BFAE]" />
            <p className="text-sm text-[#8E7A6B]">Sin eventos registrados{hasFilters ? " con estos filtros" : ""}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-[#F7F4F1] border-b border-[#D8BFAE]">
                  {["Fecha/Hora", "Evento", "Severidad", "IP", "Email / Usuario", "Detalles"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const sev     = SEVERITY_CONFIG[log.severity] ?? SEVERITY_CONFIG.INFO;
                  const SevIcon = sev.icon;
                  const isExpanded = expandedId === log.id;

                  return (
                    <>
                      <tr key={log.id}
                        className={`border-b border-[#EDE2D8] hover:bg-[#F7F4F1] transition-colors cursor-pointer ${
                          log.severity === "CRITICAL" ? "bg-red-50/50" :
                          log.severity === "ERROR"    ? "bg-orange-50/30" : ""
                        }`}
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      >
                        <td className="px-3 py-2.5 text-[#8E7A6B] font-mono whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("es-CL", {
                            day: "2-digit", month: "2-digit", year: "2-digit",
                            hour: "2-digit", minute: "2-digit", second: "2-digit",
                          })}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-[#5C4A3E] whitespace-nowrap">
                          {EVENT_LABELS[log.event] ?? log.event}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] uppercase tracking-wide font-medium ${sev.bg} ${sev.color}`}>
                            <SevIcon size={10} strokeWidth={2} />
                            {sev.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[#5C4A3E] whitespace-nowrap">
                          {log.ip ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 text-[#5C4A3E] max-w-[180px] truncate">
                          {log.email ?? log.userId ?? log.adminId ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 text-[#8E7A6B]">
                          {log.details ? (
                            <span className="text-[#CDA78F] underline underline-offset-2 text-[9px]">
                              {isExpanded ? "▲ ocultar" : "▼ ver"}
                            </span>
                          ) : "—"}
                        </td>
                      </tr>

                      {/* Fila expandible con detalles JSON */}
                      {isExpanded && log.details && (
                        <tr key={`${log.id}-detail`} className="bg-[#F7F4F1] border-b border-[#EDE2D8]">
                          <td colSpan={6} className="px-4 py-3">
                            <pre className="text-[10px] text-[#5C4A3E] font-mono whitespace-pre-wrap overflow-x-auto bg-white border border-[#D8BFAE] p-3 max-h-40">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                            {log.userAgent && (
                              <p className="text-[9px] text-[#8E7A6B] mt-1.5 font-mono truncate">
                                UA: {log.userAgent}
                              </p>
                            )}
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

        {/* Paginación ventana de 10 */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-[#D8BFAE] flex items-center justify-between flex-wrap gap-2">
            <p className="text-[10px] text-[#8E7A6B]">
              {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} de {total}
            </p>
            <div className="flex items-center gap-1">
              {wStart > 1 && (
                <button onClick={() => goToPage(wStart - 1)}
                  className="px-2 py-1 text-[10px] border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] transition-colors">
                  ‹‹
                </button>
              )}
              <button onClick={() => goToPage(page - 1)} disabled={page <= 1}
                className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] disabled:opacity-40 transition-colors">
                <ChevronLeft size={12} strokeWidth={1.5} />
              </button>
              {pages.map((n) => (
                <button key={n} onClick={() => goToPage(n)}
                  className={`w-7 h-7 flex items-center justify-center text-[10px] border transition-colors ${
                    n === page
                      ? "bg-[#CDA78F] border-[#CDA78F] text-white"
                      : "border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F]"
                  }`}>
                  {n}
                </button>
              ))}
              <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages}
                className="w-7 h-7 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] disabled:opacity-40 transition-colors">
                <ChevronRight size={12} strokeWidth={1.5} />
              </button>
              {wEnd < totalPages && (
                <button onClick={() => goToPage(wEnd + 1)}
                  className="px-2 py-1 text-[10px] border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] transition-colors">
                  ››
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
