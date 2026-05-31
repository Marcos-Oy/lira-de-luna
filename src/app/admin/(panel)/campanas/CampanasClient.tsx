"use client";

import { useState, useTransition, useRef } from "react";
import { Users, Send, ImageIcon, X, Upload, Eye, EyeOff, Mail, History, Trash2 } from "lucide-react";
import { unsubscribeManual, resubscribeManual, deleteSubscriber, sendCampaign, uploadCampaignImage } from "@/app/actions/admin/campaigns";
import { sanitizeHtml } from "@/lib/sanitize";
import RichEditor from "@/components/admin/RichEditor";

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  source: string;
  subscribedAt: string;
}

interface Campaign {
  id: string;
  subject: string;
  status: string;
  sentCount: number;
  sentAt: string | null;
  createdAt: string;
}

interface Props {
  subscribers: Subscriber[];
  campaigns: Campaign[];
}

// ── Main ──────────────────────────────────────────────────────

export default function CampanasClient({ subscribers: initial, campaigns: initialCampaigns }: Props) {
  const [tab, setTab]           = useState<"composer" | "subscribers" | "history">("composer");
  const [subscribers, setSubs]  = useState(initial);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [filterSubs, setFilterSubs] = useState<"all" | "active" | "inactive">("all");

  // Composer state
  const [subject,   setSubject]   = useState("");
  const [preheader, setPreheader] = useState("");
  const [content,   setContent]   = useState("");
  const [imageUrl,  setImageUrl]  = useState("");
  const [preview,   setPreview]   = useState(false);
  const [sendResult, setSendResult] = useState<{ ok?: boolean; msg?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [isPending, startTransition] = useTransition();

  const activeCount = subscribers.filter((s) => s.isActive).length;

  // ── Subscribers ──────────────────────────────────────────────

  function handleUnsub(id: string) {
    startTransition(async () => {
      await unsubscribeManual(id);
      setSubs((s) => s.map((x) => x.id === id ? { ...x, isActive: false } : x));
    });
  }

  function handleResub(id: string) {
    startTransition(async () => {
      await resubscribeManual(id);
      setSubs((s) => s.map((x) => x.id === id ? { ...x, isActive: true } : x));
    });
  }

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar suscriptor permanentemente?")) return;
    startTransition(async () => {
      await deleteSubscriber(id);
      setSubs((s) => s.filter((x) => x.id !== id));
    });
  }

  // ── Image upload ─────────────────────────────────────────────

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("image", file);
    startTransition(async () => {
      const res = await uploadCampaignImage(fd);
      if ("imageUrl" in res && res.imageUrl) setImageUrl(res.imageUrl);
    });
  }

  // ── Send ─────────────────────────────────────────────────────

  function handleSend() {
    if (!subject.trim()) { setSendResult({ ok: false, msg: "El asunto es obligatorio" }); return; }
    if (!content.trim()) { setSendResult({ ok: false, msg: "El contenido no puede estar vacío" }); return; }
    if (!confirm(`¿Enviar esta campaña a ${activeCount} suscriptores activos?`)) return;
    setSendResult(null);
    startTransition(async () => {
      const res = await sendCampaign({ subject, preheader, content, imageUrl: imageUrl || undefined });
      if ("error" in res && res.error) {
        setSendResult({ ok: false, msg: res.error });
      } else if ("sent" in res) {
        setSendResult({ ok: true, msg: `Enviado a ${res.sent} de ${res.total} suscriptores` });
        setSubject(""); setPreheader(""); setContent(""); setImageUrl("");
      }
    });
  }

  const filteredSubs = subscribers.filter((s) => {
    if (filterSubs === "active")   return s.isActive;
    if (filterSubs === "inactive") return !s.isActive;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">Campañas de email</h1>
          <p className="text-[10px] text-[#8E7A6B] mt-0.5">{activeCount} suscriptores activos</p>
        </div>
        <div className="flex gap-1">
          {(["composer", "subscribers", "history"] as const).map((t) => {
            const labels = { composer: "Nueva campaña", subscribers: `Suscriptores (${subscribers.length})`, history: "Historial" };
            const icons  = { composer: Send, subscribers: Users, history: History };
            const Icon   = icons[t];
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 text-[10px] tracking-[0.1em] uppercase px-3 py-2 transition-colors ${tab === t ? "bg-[#CDA78F] text-white" : "bg-[#F7F4F1] border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F]"}`}
              >
                <Icon size={11} strokeWidth={1.5} />
                {labels[t]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Composer */}
      {tab === "composer" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Form */}
          <div className="lg:col-span-2 bg-[#F7F4F1] border border-[#D8BFAE]">
            <div className="px-6 py-4 border-b border-[#D8BFAE]">
              <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">Composición</h2>
            </div>
            <div className="p-6 space-y-5">

              {/* Subject */}
              <div>
                <label className="block text-[10px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-1.5">Asunto</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ej. Nuevas colecciones de temporada ✨"
                  className="w-full bg-[#EDE2D8] border border-[#D8BFAE] text-[#5C4A3E] text-xs px-3 py-2.5 outline-none focus:border-[#CDA78F] transition-colors"
                />
              </div>

              {/* Preheader */}
              <div>
                <label className="block text-[10px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-1.5">
                  Preheader <span className="text-[#D8BFAE] normal-case tracking-normal">— texto de vista previa del correo</span>
                </label>
                <input
                  value={preheader}
                  onChange={(e) => setPreheader(e.target.value)}
                  placeholder="Descubre las joyas que hablan por ti…"
                  className="w-full bg-[#EDE2D8] border border-[#D8BFAE] text-[#5C4A3E] text-xs px-3 py-2.5 outline-none focus:border-[#CDA78F] transition-colors"
                />
              </div>

              {/* Image */}
              <div>
                <label className="block text-[10px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-1.5">Imagen de cabecera</label>
                {imageUrl ? (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="" className="h-28 object-cover border border-[#D8BFAE]" />
                    <button
                      onClick={() => setImageUrl("")}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-[#5C4A3E] text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
                    >
                      <X size={9} strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <div className="h-20 w-40 bg-[#EDE2D8] border border-dashed border-[#D8BFAE] flex items-center justify-center">
                    <ImageIcon size={20} strokeWidth={1} className="text-[#D8BFAE]" />
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={isPending}
                  className="mt-2 flex items-center gap-1.5 text-[10px] tracking-[0.1em] uppercase text-[#8E7A6B] border border-[#D8BFAE] px-3 py-1.5 hover:border-[#CDA78F] transition-colors"
                >
                  <Upload size={10} strokeWidth={1.5} />
                  {isPending && imageUrl === "" ? "Subiendo…" : "Seleccionar imagen"}
                </button>
              </div>

              {/* Content */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] tracking-[0.12em] uppercase text-[#8E7A6B]">Contenido</label>
                  <button
                    type="button"
                    onClick={() => setPreview((p) => !p)}
                    className="flex items-center gap-1 text-[10px] text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors"
                  >
                    {preview ? <EyeOff size={11} strokeWidth={1.5} /> : <Eye size={11} strokeWidth={1.5} />}
                    {preview ? "Editar" : "Vista previa"}
                  </button>
                </div>
                {preview ? (
                  <div
                    className="border border-[#D8BFAE] bg-white p-6 text-sm text-[#5C4A3E] leading-relaxed min-h-[200px]"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) || "<p class='text-[#D8BFAE]'>Sin contenido</p>" }}
                  />
                ) : (
                  <RichEditor value={content} onChange={setContent} />
                )}
              </div>

              {/* Send result */}
              {sendResult && (
                <p className={`text-[11px] px-3 py-2 ${sendResult.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                  {sendResult.msg}
                </p>
              )}

              {/* Send button */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-[10px] text-[#8E7A6B]">
                  Se enviará a <strong className="text-[#5C4A3E]">{activeCount}</strong> suscriptores activos
                </p>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isPending}
                  className="flex items-center gap-2 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[10px] tracking-[0.15em] uppercase px-6 py-3 transition-colors disabled:opacity-50"
                >
                  <Send size={12} strokeWidth={1.5} />
                  {isPending ? "Enviando…" : "Enviar campaña"}
                </button>
              </div>
            </div>
          </div>

          {/* Preview panel */}
          <div className="bg-[#F7F4F1] border border-[#D8BFAE]">
            <div className="px-6 py-4 border-b border-[#D8BFAE]">
              <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">Vista previa del email</h2>
            </div>
            <div className="p-4">
              <div className="border border-[#D8BFAE] bg-white text-[#5C4A3E]" style={{ fontSize: 11 }}>
                <div className="bg-[#F7F4F1] px-4 py-3 border-b border-[#D8BFAE] text-center">
                  <p style={{ fontStyle: "italic", letterSpacing: 3, fontSize: 14 }}>Lira de Luna</p>
                </div>
                {imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="w-full object-cover" style={{ maxHeight: 100 }} />
                )}
                <div className="p-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) || "<p style='color:#D8BFAE'>El contenido aparecerá aquí…</p>" }} />
                <div className="bg-[#F7F4F1] px-4 py-2 border-t border-[#D8BFAE] text-center">
                  <p style={{ color: "#8E7A6B", fontSize: 9 }}>Lira de Luna · <span style={{ color: "#CDA78F" }}>Desuscribirse</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscribers */}
      {tab === "subscribers" && (
        <div className="bg-[#F7F4F1] border border-[#D8BFAE]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8BFAE]">
            <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">
              Lista de suscriptores
            </h2>
            <div className="flex gap-1">
              {(["all", "active", "inactive"] as const).map((f) => {
                const labels = { all: "Todos", active: "Activos", inactive: "Desuscritos" };
                return (
                  <button
                    key={f}
                    onClick={() => setFilterSubs(f)}
                    className={`text-[9px] tracking-[0.1em] uppercase px-3 py-1.5 transition-colors ${filterSubs === f ? "bg-[#CDA78F] text-white" : "border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F]"}`}
                  >
                    {labels[f]}
                  </button>
                );
              })}
            </div>
          </div>

          {filteredSubs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Mail size={24} strokeWidth={1} className="text-[#D8BFAE] mx-auto mb-3" />
              <p className="text-xs text-[#8E7A6B]">Sin suscriptores en esta categoría</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#EDE2D8]">
                    {["Correo", "Nombre", "Origen", "Fecha", "Estado", ""].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDE2D8]">
                  {filteredSubs.map((s) => (
                    <tr key={s.id} className="hover:bg-[#EDE2D8]/40 transition-colors">
                      <td className="px-5 py-3 text-xs text-[#5C4A3E]">{s.email}</td>
                      <td className="px-5 py-3 text-xs text-[#8E7A6B]">{s.name ?? "—"}</td>
                      <td className="px-5 py-3 text-[10px] text-[#8E7A6B]">{s.source}</td>
                      <td className="px-5 py-3 text-xs text-[#8E7A6B]">
                        {new Date(s.subscribedAt).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 ${s.isActive ? "bg-emerald-100 text-emerald-700" : "bg-[#EDE2D8] text-[#8E7A6B]"}`}>
                          {s.isActive ? "Activo" : "Desuscrito"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {s.isActive ? (
                            <button onClick={() => handleUnsub(s.id)} disabled={isPending} className="text-[10px] text-amber-600 hover:text-amber-800 transition-colors">
                              Desuscribir
                            </button>
                          ) : (
                            <button onClick={() => handleResub(s.id)} disabled={isPending} className="text-[10px] text-emerald-600 hover:text-emerald-800 transition-colors">
                              Reactivar
                            </button>
                          )}
                          <button onClick={() => handleDelete(s.id)} disabled={isPending} className="text-[#D8BFAE] hover:text-red-400 transition-colors">
                            <Trash2 size={12} strokeWidth={1.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {tab === "history" && (
        <div className="bg-[#F7F4F1] border border-[#D8BFAE]">
          <div className="px-6 py-4 border-b border-[#D8BFAE]">
            <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">Historial de campañas</h2>
          </div>
          {campaigns.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-xs text-[#8E7A6B]">Aún no se han enviado campañas</p>
            </div>
          ) : (
            <div className="divide-y divide-[#EDE2D8]">
              {campaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-6 py-4 hover:bg-[#EDE2D8]/40 transition-colors">
                  <div>
                    <p className="text-xs text-[#5C4A3E] font-medium">{c.subject}</p>
                    <p className="text-[10px] text-[#8E7A6B] mt-0.5">
                      {new Date(c.createdAt).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {c.status === "sent" && (
                      <p className="text-[10px] text-[#8E7A6B]">
                        <strong className="text-[#5C4A3E]">{c.sentCount}</strong> enviados
                      </p>
                    )}
                    <span className={`text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 ${
                      c.status === "sent" ? "bg-emerald-100 text-emerald-700"
                      : c.status === "sending" ? "bg-blue-50 text-blue-600"
                      : "bg-[#EDE2D8] text-[#8E7A6B]"
                    }`}>
                      {c.status === "sent" ? "Enviada" : c.status === "sending" ? "Enviando" : "Borrador"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
