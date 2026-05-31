"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, Loader2, Search, X } from "lucide-react";
import ProductCard from "./ProductCard";
import type { Product } from "@/lib/mock-data";

// ── Tipos ─────────────────────────────────────────────────────

type Category = { name: string; slug: string; collectionType: string };

type FilterOption = {
  id: string; label: string; value: string;
  minPrice: number | null; maxPrice: number | null;
};

type FilterGroup = {
  id: string; name: string; slug: string;
  kind: "MATERIAL" | "PRICE_RANGE" | "CUSTOM";
  options: FilterOption[];
};

export type CurrentFilters = {
  q?:          string;
  col?:        string;
  sort?:       string;
  sale?:       boolean;
  priceMin?:   number;
  priceMax?:   number;
  materials?:  string[];
};

interface Props {
  products:       Product[];
  categories:     Category[];
  filterGroups:   FilterGroup[];
  wishlistIds?:   string[];
  total:          number;
  page:           number;
  totalPages:     number;
  currentFilters: CurrentFilters;
}

const SORT_OPTIONS = [
  { label: "Más recientes",         value: "newest"    },
  { label: "Precio: menor a mayor", value: "price-asc" },
  { label: "Precio: mayor a menor", value: "price-desc"},
  { label: "Más populares",         value: "bestseller"},
];

const WINDOW_SIZE = 10; // páginas visibles por ventana

// ── Utilidades ────────────────────────────────────────────────

/** Devuelve el rango de páginas visible (ventana de WINDOW_SIZE). */
function getPageWindow(current: number, total: number) {
  const start = Math.floor((current - 1) / WINDOW_SIZE) * WINDOW_SIZE + 1;
  const end   = Math.min(start + WINDOW_SIZE - 1, total);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

// ── Sub-componente: sección colapsable ────────────────────────

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-brand-beige pb-5 mb-5">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center justify-between w-full mb-4">
        <span className="text-[10px] tracking-[0.2em] uppercase text-brand-dark font-medium">{title}</span>
        <ChevronDown size={14} strokeWidth={1.5} className={`text-brand-taupe transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && children}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────

export default function TiendaClient({
  products, categories, filterGroups, wishlistIds = [],
  total, page, totalPages, currentFilters,
}: Props) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(currentFilters.q ?? "");

  const wishlistSet = new Set(wishlistIds);
  const hasFilters  =
    !!currentFilters.q || !!currentFilters.col || !!currentFilters.sale ||
    !!currentFilters.priceMin || !!currentFilters.priceMax ||
    (currentFilters.materials?.length ?? 0) > 0;

  // ── Actualizar URL params y navegar (server re-fetch automático) ──

  function navigate(updates: Record<string, string | string[] | null>, resetPage = true) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      params.delete(key); // borrar primero (para arrays)
      if (value === null) continue;
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, v));
      } else if (value !== "") {
        params.set(key, value);
      }
    }

    if (resetPage) params.delete("page");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function toggleCollection(slug: string) {
    navigate({ col: currentFilters.col === slug ? null : slug });
  }

  function toggleMaterial(value: string) {
    const current = currentFilters.materials ?? [];
    const next    = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    navigate({ mat: next.length ? next : null });
  }

  function selectPriceRange(opt: FilterOption) {
    const same = currentFilters.priceMin === (opt.minPrice ?? undefined) &&
                 currentFilters.priceMax === (opt.maxPrice ?? undefined);
    navigate({
      priceMin: same ? null : opt.minPrice  != null ? String(opt.minPrice)  : null,
      priceMax: same ? null : opt.maxPrice  != null ? String(opt.maxPrice)  : null,
    });
  }

  function setSort(value: string) {
    navigate({ sort: value });
  }

  function setSale(active: boolean) {
    navigate({ sale: active ? "1" : null });
  }

  function clearFilters() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  function goToPage(n: number) {
    navigate({ page: String(n) }, false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ q: searchInput.trim() || null });
  }

  // ── Paginación en ventanas de WINDOW_SIZE páginas ─────────────

  const pageWindow   = getPageWindow(page, totalPages);
  const prevWindow   = pageWindow[0] > 1;
  const nextWindow   = pageWindow[pageWindow.length - 1] < totalPages;

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="flex gap-10">

      {/* ── Sidebar de filtros ────────────────────────────── */}
      <aside className="hidden lg:block w-56 shrink-0">
        {isPending && (
          <div className="flex items-center gap-2 mb-4 text-[10px] text-brand-sand">
            <Loader2 size={12} className="animate-spin" />
            Filtrando…
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[10px] tracking-[0.2em] uppercase text-brand-dark font-medium">Filtros</h3>
          {hasFilters && (
            <button onClick={clearFilters} className="text-[9px] tracking-wide text-brand-taupe hover:text-brand-dark underline transition-colors">
              Limpiar todo
            </button>
          )}
        </div>

        {/* Buscador */}
        <form onSubmit={submitSearch} className="mb-5">
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar productos…"
              className="w-full bg-brand-cream border border-brand-beige text-brand-dark placeholder:text-brand-taupe text-xs px-3 py-2.5 pr-8 outline-none focus:border-brand-sand transition-colors"
            />
            {searchInput ? (
              <button type="button" onClick={() => { setSearchInput(""); navigate({ q: null }); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-taupe hover:text-brand-dark">
                <X size={12} strokeWidth={1.5} />
              </button>
            ) : (
              <Search size={12} strokeWidth={1.5} className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-taupe pointer-events-none" />
            )}
          </div>
        </form>

        {/* Ofertas */}
        <FilterSection title="Ofertas">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={!!currentFilters.sale}
              onChange={(e) => setSale(e.target.checked)}
              className="w-3.5 h-3.5 accent-red-500"
            />
            <span className="text-xs text-brand-taupe group-hover:text-brand-dark transition-colors">Solo en oferta</span>
            {currentFilters.sale && (
              <span className="ml-auto text-[9px] uppercase tracking-wide bg-red-500 text-white px-1.5 py-0.5">Activo</span>
            )}
          </label>
        </FilterSection>

        {/* Colecciones / categorías */}
        {categories.length > 0 && (
          <FilterSection title="Categoría">
            <div className="space-y-2.5">
              {categories.map((cat) => (
                <label key={cat.slug} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={currentFilters.col === cat.slug}
                    onChange={() => toggleCollection(cat.slug)}
                    className="w-3.5 h-3.5 accent-[#CDA78F]"
                  />
                  <span className="text-xs text-brand-taupe group-hover:text-brand-dark transition-colors">
                    {cat.name}
                    {cat.collectionType === "SUPPLIES" && (
                      <span className="ml-1.5 text-[8px] uppercase tracking-wide bg-[#EDE2D8] text-brand-taupe px-1 py-0.5">Insumo</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </FilterSection>
        )}

        {/* Grupos de filtros dinámicos (materiales, rangos de precio, etc.) */}
        {filterGroups.map((group) => {
          if (group.options.length === 0) return null;
          const isPriceRange = group.kind === "PRICE_RANGE";

          return (
            <FilterSection key={group.id} title={group.name}>
              <div className="space-y-2.5">
                {group.options.map((opt) => {
                  const isSelected = isPriceRange
                    ? currentFilters.priceMin === (opt.minPrice ?? undefined) &&
                      currentFilters.priceMax === (opt.maxPrice ?? undefined)
                    : (currentFilters.materials ?? []).includes(opt.value);

                  return (
                    <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type={isPriceRange ? "radio" : "checkbox"}
                        name={isPriceRange ? `filter-${group.id}` : undefined}
                        checked={isSelected}
                        onChange={() =>
                          isPriceRange ? selectPriceRange(opt) : toggleMaterial(opt.value)
                        }
                        className="w-3.5 h-3.5 accent-[#CDA78F]"
                      />
                      <span className="text-xs text-brand-taupe group-hover:text-brand-dark transition-colors">
                        {opt.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </FilterSection>
          );
        })}

        {categories.length === 0 && filterGroups.length === 0 && (
          <p className="text-[10px] text-brand-taupe/60 leading-relaxed">
            Configura los filtros en Admin → Filtros.
          </p>
        )}
      </aside>

      {/* ── Área de productos ─────────────────────────────── */}
      <div className="flex-1">

        {/* Barra superior: total + ordenamiento */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-xs text-brand-taupe tracking-wide">
            {total} producto{total !== 1 ? "s" : ""}{hasFilters ? " encontrados" : ""}
          </p>
          <select
            value={currentFilters.sort ?? "newest"}
            onChange={(e) => setSort(e.target.value)}
            className="text-xs tracking-wide text-brand-taupe bg-transparent border border-brand-beige px-3 py-2 outline-none cursor-pointer hover:border-brand-sand transition-colors"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Grid de productos */}
        {products.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-heading text-2xl text-brand-dark mb-2">Sin resultados</p>
            <p className="text-sm text-brand-taupe font-light mb-6">
              Prueba con otros filtros o explora toda la colección.
            </p>
            <button
              onClick={clearFilters}
              className="text-xs tracking-[0.15em] uppercase text-brand-sand hover:text-brand-taupe underline transition-colors"
            >
              Ver todos los productos
            </button>
          </div>
        ) : (
          <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 transition-opacity ${isPending ? "opacity-50" : ""}`}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} isWished={wishlistSet.has(product.id)} />
            ))}
          </div>
        )}

        {/* ── Paginación en ventanas de 10 ─────────────────── */}
        {totalPages > 1 && (
          <nav className="flex justify-center items-center gap-1 mt-16 flex-wrap" aria-label="Paginación">

            {/* Ventana anterior */}
            {prevWindow && (
              <button
                onClick={() => goToPage(pageWindow[0] - 1)}
                className="px-3 py-2 text-xs text-brand-taupe border border-brand-beige hover:border-brand-sand hover:text-brand-dark transition-colors"
                title="Páginas anteriores"
              >
                ‹‹
              </button>
            )}

            {/* Página anterior */}
            <button
              onClick={() => page > 1 && goToPage(page - 1)}
              disabled={page === 1}
              className="px-3 py-2 text-xs text-brand-taupe border border-brand-beige hover:border-brand-sand hover:text-brand-dark transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ‹
            </button>

            {/* Números de página (ventana actual) */}
            {pageWindow.map((n) => (
              <button
                key={n}
                onClick={() => goToPage(n)}
                className={`px-3 py-2 text-xs border transition-colors ${
                  n === page
                    ? "bg-brand-sand border-brand-sand text-white"
                    : "border-brand-beige text-brand-taupe hover:border-brand-sand hover:text-brand-dark"
                }`}
              >
                {n}
              </button>
            ))}

            {/* Página siguiente */}
            <button
              onClick={() => page < totalPages && goToPage(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-2 text-xs text-brand-taupe border border-brand-beige hover:border-brand-sand hover:text-brand-dark transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ›
            </button>

            {/* Ventana siguiente */}
            {nextWindow && (
              <button
                onClick={() => goToPage(pageWindow[pageWindow.length - 1] + 1)}
                className="px-3 py-2 text-xs text-brand-taupe border border-brand-beige hover:border-brand-sand hover:text-brand-dark transition-colors"
                title="Páginas siguientes"
              >
                ››
              </button>
            )}

          </nav>
        )}

        {/* Info de página */}
        {totalPages > 1 && (
          <p className="text-center text-[10px] text-brand-taupe mt-3">
            Página {page} de {totalPages} · {total} productos en total
          </p>
        )}
      </div>
    </div>
  );
}
