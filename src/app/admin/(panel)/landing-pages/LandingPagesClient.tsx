"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Globe, Pencil, Trash2, Copy, Check, ExternalLink,
  ToggleLeft, ToggleRight, Loader2, Users, X, ShoppingBag, Calendar,
} from "lucide-react";
import { deleteLandingPage, updateLandingPage } from "@/app/actions/admin/landingPages";

type Page = {
  id: string; title: string; slug: string; type: string;
  isActive: boolean; leadCount: number; createdAt: string;
};

interface Props { pages: Page[] }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function TypeBadge({ type }: { type: string }) {
  if (type === "EVENT") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-violet-100 text-violet-700 text-[9px] tracking-[0.08em] uppercase rounded">
        <Calendar size={9} />
        Evento
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#EDE2D8] text-[#8E7A6B] text-[9px] tracking-[0.08em] uppercase rounded">
      <ShoppingBag size={9} />
      Promo
    </span>
  );
}

function NewTypeModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D8BFAE]">
          <h2 className="text-sm font-semibold text-[#5C4A3E]">¿Qué tipo de landing page?</h2>
          <button onClick={onClose} className="text-[#8E7A6B] hover:text-[#5C4A3E]">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3">
          {/* PROMO */}
          <button
            onClick={() => { onClose(); router.push("/admin/landing-pages/nueva"); }}
            className="flex flex-col items-center gap-3 border border-[#D8BFAE] hover:border-[#CDA78F] hover:bg-[#F7F4F1] rounded p-5 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-[#EDE2D8] rounded-full flex items-center justify-center">
              <ShoppingBag size={18} className="text-[#8E7A6B]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#5C4A3E] mb-0.5">Promocional</p>
              <p className="text-[10px] text-[#8E7A6B] leading-relaxed">
                Captura leads, muestra productos y dirige tráfico a la tienda.
              </p>
            </div>
          </button>

          {/* EVENT */}
          <button
            onClick={() => { onClose(); router.push("/admin/landing-pages/nueva?type=evento"); }}
            className="flex flex-col items-center gap-3 border border-[#D8BFAE] hover:border-violet-300 hover:bg-violet-50/30 rounded p-5 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
              <Calendar size={18} className="text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#5C4A3E] mb-0.5">Evento</p>
              <p className="text-[10px] text-[#8E7A6B] leading-relaxed">
                Registros con entrada, fecha, lugar y pagos opcionales.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LandingPagesClient({ pages: initialPages }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pages, setPages] = useState(initialPages);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(false);

  function handleCopy(slug: string) {
    const url = `${window.location.origin}/lp/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    });
  }

  function handleToggleActive(id: string, current: boolean) {
    startTransition(async () => {
      const res = await updateLandingPage(id, { isActive: !current });
      if ("error" in res && res.error) return;
      setPages((ps) => ps.map((p) => p.id === id ? { ...p, isActive: !current } : p));
    });
  }

  function handleDeleteConfirm(id: string) {
    if (deleteConfirm !== id) { setDeleteConfirm(id); return; }
    startTransition(async () => {
      await deleteLandingPage(id);
      setPages((ps) => ps.filter((p) => p.id !== id));
      setDeleteConfirm(null);
    });
  }

  function handleEdit(p: Page) {
    if (p.type === "EVENT") {
      router.push(`/admin/eventos/${p.id}/editar`);
    } else {
      router.push(`/admin/landing-pages/${p.id}`);
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#F7F4F1]">
      {showTypeModal && <NewTypeModal onClose={() => setShowTypeModal(false)} />}

      {/* Toolbar */}
      <div className="bg-white border-b border-[#D8BFAE] px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <p className="text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B]">Total</p>
          <p className="text-sm font-medium text-[#5C4A3E]">{pages.length} landing pages</p>
        </div>
        <button
          onClick={() => setShowTypeModal(true)}
          className="flex items-center gap-1.5 bg-[#5C4A3E] text-white px-4 py-2 rounded text-xs hover:bg-[#4a3a30] transition-colors"
        >
          <Plus size={13} />
          Nueva landing page
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Globe size={40} className="text-[#D8BFAE] mb-3" />
            <p className="text-sm font-medium text-[#5C4A3E] mb-1">Sin landing pages</p>
            <p className="text-xs text-[#8E7A6B] mb-4">Crea tu primera landing page para capturar leads</p>
            <button
              onClick={() => setShowTypeModal(true)}
              className="flex items-center gap-1.5 bg-[#5C4A3E] text-white px-4 py-2 rounded text-xs hover:bg-[#4a3a30]"
            >
              <Plus size={13} />
              Crear landing page
            </button>
          </div>
        ) : (
          <div className="bg-white border border-[#D8BFAE] rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#D8BFAE]">
                  {["Título", "Tipo", "URL Pública", "Leads", "Estado", "Creado", "Acciones"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <tr key={p.id} className="border-b border-[#D8BFAE]/50 hover:bg-[#F7F4F1]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#5C4A3E]">{p.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={p.type} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[#8E7A6B] font-mono text-[10px]">/lp/{p.slug}</span>
                        <button
                          onClick={() => handleCopy(p.slug)}
                          className="text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors"
                          title="Copiar URL"
                        >
                          {copiedSlug === p.slug ? (
                            <Check size={11} className="text-green-500" />
                          ) : (
                            <Copy size={11} />
                          )}
                        </button>
                        <a
                          href={`/lp/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#8E7A6B] hover:text-[#CDA78F]"
                          title="Ver landing page"
                        >
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-[#5C4A3E]">
                        <Users size={11} className="text-[#8E7A6B]" />
                        {p.leadCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(p.id, p.isActive)}
                        disabled={isPending}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        {p.isActive ? (
                          <>
                            <ToggleRight size={16} className="text-emerald-500" />
                            <span className="text-emerald-600">Activa</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft size={16} className="text-[#8E7A6B]" />
                            <span className="text-[#8E7A6B]">Inactiva</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[#8E7A6B] whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(p)}
                          className="text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors"
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        {deleteConfirm === p.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDeleteConfirm(p.id)}
                              disabled={isPending}
                              className="text-[9px] tracking-[0.08em] uppercase bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 disabled:opacity-50 flex items-center gap-1"
                            >
                              {isPending && <Loader2 size={10} className="animate-spin" />}
                              Confirmar
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="text-[9px] text-[#8E7A6B] hover:text-[#5C4A3E] uppercase tracking-[0.08em]"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDeleteConfirm(p.id)}
                            className="text-[#8E7A6B] hover:text-red-500 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
