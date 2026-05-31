"use client";

import { Calendar, MapPin, Link2, Printer, Check, AlertCircle, X, Loader2 } from "lucide-react";
import type { EventConfig } from "@/lib/crm";

type TransferInfo = {
  bankName:      string | null;
  accountName:   string | null;
  accountNumber: string | null;
  accountType:   string | null;
  rut:           string | null;
  instructions:  string | null;
};

type TicketData = {
  id:            string;
  ticketCode:    string;
  name:          string;
  email:         string;
  phone:         string | null;
  ticketMode:    string;
  paymentStatus: string;
  paymentMethod: string | null;
  amount:        number;
  paymentNotes:  string | null;
  attended:      boolean;
  createdAt:     string;
  event: {
    id:     string;
    slug:   string;
    title:  string;
    config: EventConfig;
  };
  transferInfo?: TransferInfo | null;
};

function fmtEventDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

const METHOD_LABELS: Record<string, string> = {
  transfer:    "Transferencia bancaria",
  mercadoPago: "MercadoPago",
  flowPay:     "Flow Pay",
};

export default function TicketView({ ticket }: { ticket: TicketData }) {
  const cfg    = ticket.event.config;
  const accent = cfg.accentColor || "#CDA78F";
  const isPending        = ticket.paymentStatus === "PENDING_TRANSFER";
  const isGatewayPending = ticket.paymentStatus === "PENDING_GATEWAY";
  const isCancelled      = ticket.paymentStatus === "CANCELLED";
  const isConfirmed      = ["CONFIRMED", "PAID"].includes(ticket.paymentStatus);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: cfg.bgColor || "#F7F4F1" }}>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .ticket-card { box-shadow: none !important; }
        }
      `}</style>

      <div className="w-full max-w-md">
        {/* Status banner */}
        {isPending && (
          <div className="bg-amber-50 border border-amber-300 px-4 py-3 mb-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-semibold text-amber-800">Pago pendiente</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Tu lugar está reservado. Realiza la transferencia y espera la confirmación del organizador.
              </p>
            </div>
          </div>
        )}

        {isGatewayPending && (
          <div className="bg-blue-50 border border-blue-300 px-4 py-3 mb-4 flex items-start gap-3">
            <Loader2 size={16} className="text-blue-500 shrink-0 mt-0.5 animate-spin" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-semibold text-blue-800">Procesando pago</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Tu pago está siendo procesado por la pasarela. Cuando se confirme, esta entrada se activará automáticamente.
              </p>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="bg-red-50 border border-red-300 px-4 py-3 mb-4 flex items-start gap-3">
            <X size={16} className="text-red-500 shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-sm text-red-700">Este registro ha sido cancelado.</p>
          </div>
        )}

        {/* Ticket card */}
        <div className="ticket-card bg-white shadow-xl overflow-hidden">
          {/* Header with accent color */}
          <div className="px-6 py-5 text-white relative overflow-hidden" style={{ backgroundColor: accent }}>
            {cfg.heroImage && (
              <img src={cfg.heroImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
            )}
            <div className="relative z-10">
              <p className="text-[10px] tracking-[0.2em] uppercase opacity-80 mb-1">
                {cfg.ticketName || "Entrada"}
                {isConfirmed && <span className="ml-2 inline-flex items-center gap-1"><Check size={10} />Confirmada</span>}
              </p>
              <h1 className="text-xl font-bold leading-tight" style={{ fontFamily: "Georgia, serif" }}>
                {ticket.event.title}
              </h1>
            </div>
          </div>

          {/* Dashed separator */}
          <div className="relative h-px bg-[#D8BFAE] mx-6 my-0">
            <div className="absolute -left-6 -top-3 w-6 h-6 rounded-full bg-[#F7F4F1]" />
            <div className="absolute -right-6 -top-3 w-6 h-6 rounded-full bg-[#F7F4F1]" />
            <div className="border-b border-dashed border-[#D8BFAE] mx-3" />
          </div>

          {/* Event details */}
          <div className="px-6 py-4 space-y-3">
            {cfg.eventDate && (
              <div className="flex items-center gap-2.5" style={{ color: accent }}>
                <Calendar size={16} strokeWidth={1.5} className="shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#5C4A3E]">{fmtEventDate(cfg.eventDate)}</p>
                  {(cfg.eventTime || cfg.eventEndTime) && (
                    <p className="text-xs text-[#8E7A6B]">
                      {cfg.eventTime}{cfg.eventEndTime && ` — ${cfg.eventEndTime}`} hrs
                    </p>
                  )}
                </div>
              </div>
            )}
            {cfg.eventLocation && (
              <div className="flex items-start gap-2.5">
                <MapPin size={16} strokeWidth={1.5} className="shrink-0 mt-0.5" style={{ color: accent }} />
                <div>
                  <p className="text-sm text-[#5C4A3E]">{cfg.eventLocation}</p>
                  {cfg.eventLocationUrl && (
                    <a
                      href={cfg.eventLocationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline"
                      style={{ color: accent }}
                    >
                      Ver en mapa →
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Dashed separator */}
          <div className="relative h-px bg-[#D8BFAE] mx-6">
            <div className="absolute -left-6 -top-3 w-6 h-6 rounded-full bg-[#F7F4F1]" />
            <div className="absolute -right-6 -top-3 w-6 h-6 rounded-full bg-[#F7F4F1]" />
            <div className="border-b border-dashed border-[#D8BFAE] mx-3" />
          </div>

          {/* Attendee + code */}
          <div className="px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] mb-0.5">Titular</p>
                <p className="text-sm font-semibold text-[#5C4A3E]">{ticket.name}</p>
                <p className="text-xs text-[#8E7A6B]">{ticket.email}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] mb-0.5">Código</p>
                <p
                  className="font-mono text-xl font-bold tracking-[0.1em]"
                  style={{ color: accent }}
                >
                  {ticket.ticketCode}
                </p>
              </div>
            </div>

            {/* Payment info if paid */}
            {["PAID", "PAID_BY_DAY"].includes(ticket.ticketMode) && (
              <div className="mt-3 pt-3 border-t border-[#EDE2D8]">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#8E7A6B]">
                    {METHOD_LABELS[ticket.paymentMethod ?? ""] ?? ticket.paymentMethod}
                  </p>
                  <p className="text-sm font-medium text-[#5C4A3E]">
                    ${ticket.amount.toLocaleString("es-CL")} CLP
                  </p>
                </div>
                {ticket.paymentNotes && (
                  <p className="text-[10px] text-[#8E7A6B] mt-1">{ticket.paymentNotes}</p>
                )}
              </div>
            )}
          </div>

          {/* Transfer instructions */}
          {isPending && ticket.paymentMethod === "transfer" && (
            <div className="mx-6 mb-4 bg-amber-50 border border-amber-200 p-3">
              <p className="text-[9px] tracking-[0.15em] uppercase text-amber-700 mb-2 font-medium">
                Instrucciones de pago
              </p>
              <p className="text-xs text-amber-800 mb-2">
                Realiza una transferencia por <strong>${ticket.amount.toLocaleString("es-CL")} CLP</strong>:
              </p>
              {ticket.transferInfo && (
                <div className="space-y-0.5 text-xs text-amber-800 mb-2">
                  {ticket.transferInfo.bankName      && <p><span className="text-amber-600">Banco:</span> {ticket.transferInfo.bankName}</p>}
                  {ticket.transferInfo.accountName   && <p><span className="text-amber-600">Nombre:</span> {ticket.transferInfo.accountName}</p>}
                  {ticket.transferInfo.rut           && <p><span className="text-amber-600">RUT:</span> {ticket.transferInfo.rut}</p>}
                  {ticket.transferInfo.accountType   && <p><span className="text-amber-600">Tipo:</span> {ticket.transferInfo.accountType}</p>}
                  {ticket.transferInfo.accountNumber && <p><span className="text-amber-600">N° cuenta:</span> {ticket.transferInfo.accountNumber}</p>}
                  {ticket.transferInfo.instructions  && <p className="mt-1 italic">{ticket.transferInfo.instructions}</p>}
                </div>
              )}
              <p className="text-xs text-amber-700 font-medium mt-1">
                Incluye tu código <strong>{ticket.ticketCode}</strong> en la glosa/descripción.
              </p>
            </div>
          )}

          {/* Community button on ticket */}
          {cfg.showWhatsappButton && cfg.whatsappAccess === "on_ticket" && cfg.whatsappUrl && isConfirmed && (
            <div className="px-6 pb-4">
              <a
                href={cfg.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 text-white font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: accent }}
              >
                <Link2 size={16} />
                {cfg.whatsappButtonLabel || "Unirse a la comunidad"}
              </a>
            </div>
          )}

          {/* Community button after registration */}
          {cfg.showWhatsappButton && cfg.whatsappAccess === "after_registration" && cfg.whatsappUrl && (
            <div className="px-6 pb-4">
              <a
                href={cfg.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 text-white font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: accent }}
              >
                <Link2 size={16} />
                {cfg.whatsappButtonLabel || "Unirse a la comunidad"}
              </a>
            </div>
          )}
        </div>

        {/* Print / back buttons */}
        <div className="mt-4 flex gap-3 no-print">
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 border text-sm py-2.5 transition-colors"
            style={{ borderColor: accent, color: accent }}
          >
            <Printer size={14} strokeWidth={1.5} />
            Imprimir / Guardar PDF
          </button>
          <a
            href={`/lp/${ticket.event.slug}`}
            className="flex-1 flex items-center justify-center gap-2 text-sm py-2.5 text-[#8E7A6B] border border-[#D8BFAE] hover:border-[#CDA78F] transition-colors"
          >
            ← Volver al evento
          </a>
        </div>

        <p className="text-center text-[10px] text-[#8E7A6B] mt-3 no-print">
          Guarda o imprime esta página como comprobante de tu registro.
        </p>
      </div>
    </div>
  );
}
