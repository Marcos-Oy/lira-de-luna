"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useUser } from "@/context/UserContext";
import { Search, User, ShoppingBag, Menu, LogOut, Package, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/context/CartContext";
import { useSiteConfig } from "@/context/SiteConfigContext";
import { products } from "@/lib/mock-data";

// ── Search overlay ────────────────────────────────────────────
function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = query.trim().length >= 2
    ? products.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.collection.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6)
    : [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/tienda?q=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  }

  return (
    <div className="absolute inset-0 bg-brand-cream z-50 flex flex-col">
      {/* Search bar */}
      <form onSubmit={handleSubmit} className="flex items-center h-full px-6 gap-4">
        <Search size={18} strokeWidth={1.5} className="text-brand-taupe shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar joyas, collares, aretes…"
          className="flex-1 bg-transparent text-brand-dark placeholder:text-brand-taupe text-sm tracking-wide outline-none"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar búsqueda"
          className="text-brand-taupe hover:text-brand-dark transition-colors shrink-0"
        >
          <X size={18} strokeWidth={1.5} />
        </button>
      </form>

      {/* Results dropdown */}
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-brand-cream border-t border-brand-beige shadow-md z-50 max-h-80 overflow-y-auto">
          {results.map((p) => (
            <Link
              key={p.id}
              href={`/producto/${p.slug}`}
              onClick={onClose}
              className="flex items-center gap-4 px-6 py-3 hover:bg-brand-beige-light transition-colors"
            >
              <div className="flex-1">
                <p className="text-xs text-brand-dark">{p.name}</p>
                <p className="text-[10px] text-brand-taupe tracking-wide">{p.collection}</p>
              </div>
              <p className="text-xs font-heading text-brand-taupe shrink-0">
                ${p.price.toLocaleString("es-CL")} CLP
              </p>
            </Link>
          ))}
          {query.trim().length >= 2 && (
            <button
              onClick={handleSubmit as unknown as React.MouseEventHandler}
              className="w-full px-6 py-3 text-[10px] tracking-[0.15em] uppercase text-brand-sand hover:text-brand-taupe border-t border-brand-beige transition-colors text-left"
            >
              Ver todos los resultados para "{query}"
            </button>
          )}
        </div>
      )}

      {query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 bg-brand-cream border-t border-brand-beige shadow-md z-50 px-6 py-5">
          <p className="text-xs text-brand-taupe">
            Sin resultados para <span className="text-brand-dark">"{query}"</span>
          </p>
        </div>
      )}
    </div>
  );
}

// ── UserMenu ──────────────────────────────────────────────────
function UserMenu() {
  const user = useUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!user) {
    return (
      <Link href="/cuenta/login" aria-label="Iniciar sesión" className="text-brand-taupe hover:text-brand-dark transition-colors">
        <User size={18} strokeWidth={1.5} />
      </Link>
    );
  }

  const initial = user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-7 h-7 rounded-full bg-brand-sand text-white text-xs font-medium flex items-center justify-center hover:bg-brand-taupe transition-colors"
        aria-label="Mi cuenta"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-52 bg-brand-cream border border-brand-beige shadow-md z-50">
          <div className="px-4 py-3 border-b border-brand-beige">
            <p className="text-xs font-medium text-brand-dark truncate">{user.name}</p>
            <p className="text-[10px] text-brand-taupe truncate">{user.email}</p>
          </div>
          <div className="py-1">
            <Link
              href="/cuenta"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-brand-taupe hover:text-brand-dark hover:bg-brand-beige-light transition-colors"
            >
              <Package size={13} strokeWidth={1.5} />
              Mis pedidos
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-brand-taupe hover:text-red-400 hover:bg-red-50 transition-colors"
            >
              <LogOut size={13} strokeWidth={1.5} />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cart badges ───────────────────────────────────────────────
function CartBadge() {
  const { totalItems } = useCart();
  return (
    <Link href="/carrito" aria-label="Carrito" className="text-brand-taupe hover:text-brand-dark transition-colors relative">
      <ShoppingBag size={18} strokeWidth={1.5} />
      {totalItems > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-brand-sand text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
          {totalItems}
        </span>
      )}
    </Link>
  );
}

function MobileCartBadge() {
  const { totalItems } = useCart();
  return (
    <Link href="/carrito" className="text-brand-taupe relative">
      <ShoppingBag size={18} strokeWidth={1.5} />
      {totalItems > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-brand-sand text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
          {totalItems}
        </span>
      )}
    </Link>
  );
}

// ── Navbar ────────────────────────────────────────────────────
export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const { retailEnabled, wholesaleEnabled, logoUrl, storeName } = useSiteConfig();

  const navLinks = [
    { href: "/",               label: "Inicio" },
    ...(retailEnabled  ? [{ href: "/tienda",      label: "Tienda"      },
                          { href: "/colecciones", label: "Colecciones" }] : []),
    ...(wholesaleEnabled ? [{ href: "/mayorista", label: "Mayorista"   }] : []),
    { href: "/nosotros",       label: "Nosotros" },
    { href: "/guia-de-cuidado", label: "Guía de Cuidado" },
  ];

  return (
    <nav className="bg-brand-cream border-b border-brand-beige sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between relative">

        {searchOpen && <SearchOverlay onClose={closeSearch} />}

        {/* Desktop left: Logo + Nav links */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className="select-none shrink-0 text-center">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={storeName} className="h-10 object-contain" />
            ) : (
              <>
                <span className="font-heading text-[13px] tracking-[0.35em] uppercase text-brand-dark leading-tight block">Lira</span>
                <span className="font-heading text-[11px] tracking-[0.25em] uppercase text-brand-taupe leading-tight block">de</span>
                <span className="font-heading text-[22px] tracking-[0.3em] uppercase text-brand-dark leading-tight block">Luna</span>
              </>
            )}
          </Link>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[11px] font-light tracking-[0.18em] uppercase text-brand-taupe hover:text-brand-dark transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Mobile: Logo (left) */}
        <Link href="/" className="md:hidden select-none shrink-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={storeName} className="h-8 object-contain" />
          ) : (
            <span className="font-heading text-xl tracking-[0.3em] uppercase text-brand-dark">{storeName}</span>
          )}
        </Link>

        {/* Icons — desktop right */}
        <div className="hidden md:flex items-center gap-5">
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Buscar"
            className="text-brand-taupe hover:text-brand-dark transition-colors"
          >
            <Search size={18} strokeWidth={1.5} />
          </button>
          <UserMenu />
          <CartBadge />
        </div>

        {/* Mobile: Icons (right) */}
        <div className="flex md:hidden items-center gap-4">
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Buscar"
            className="text-brand-taupe hover:text-brand-dark transition-colors"
          >
            <Search size={18} strokeWidth={1.5} />
          </button>
          <MobileCartBadge />
          <Sheet>
            <SheetTrigger aria-label="Menú" className="text-brand-taupe hover:text-brand-dark transition-colors">
              <Menu size={20} strokeWidth={1.5} />
            </SheetTrigger>
            <SheetContent side="left" className="bg-brand-cream border-brand-beige w-72">
              <div className="flex flex-col gap-8 pt-10">
                <Link href="/" className="text-center">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt={storeName} className="h-10 object-contain mx-auto" />
                  ) : (
                    <>
                      <div className="font-heading text-2xl tracking-widest uppercase text-brand-dark">{storeName}</div>
                      <div className="text-xs tracking-[0.2em] text-brand-taupe mt-1">Belleza que conecta</div>
                    </>
                  )}
                </Link>
                <div className="flex flex-col gap-6">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-sm tracking-[0.15em] uppercase text-brand-taupe hover:text-brand-dark transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Link href="/cuenta" className="text-sm tracking-[0.15em] uppercase text-brand-taupe hover:text-brand-dark transition-colors">
                    Mi cuenta
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

      </div>
    </nav>
  );
}
