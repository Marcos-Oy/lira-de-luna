"use client"

import { useState, useTransition } from "react"
import {
  Search, Plus, Minus, X, ChevronDown, ChevronUp,
  ShoppingCart, CheckCircle2, Loader2, Package, SlidersHorizontal,
} from "lucide-react"
import { createPresencialOrder } from "@/app/actions/admin/presencial"
import type { PresencialCartItem } from "@/app/actions/admin/presencial"

// ── Types ──────────────────────────────────────────────────────

type Variant = {
  id: string
  label: string
  type: string
  price: number | null
  stock: number
  isActive: boolean
}

type Product = {
  id: string
  name: string
  price: number
  compareAtPrice: number | null
  images: unknown
  materials: unknown
  stock: number
  collectionId: string
  collection: { id: string; name: string }
  variants: Variant[]
  saleEnabled: boolean
  saleDiscountPct: number | null
  saleStartAt: string | null
  saleEndAt: string | null
}

type Collection = {
  id: string
  name: string
}

type FilterOptionData = {
  id: string
  label: string
  value: string
  minPrice: number | null
  maxPrice: number | null
  isActive: boolean
}

type FilterGroupData = {
  id: string
  name: string
  kind: "MATERIAL" | "PRICE_RANGE" | "CUSTOM"
  options: FilterOptionData[]
}

interface Props {
  products: Product[]
  collections: Collection[]
  filterGroups: FilterGroupData[]
}

// ── Cart item with selected variant tracking ──────────────────

type CartEntry = PresencialCartItem & { cartKey: string; imageUrl: string | null }

// ── Helpers ───────────────────────────────────────────────────

function getImageUrl(images: unknown): string | null {
  try {
    const arr = typeof images === "string" ? JSON.parse(images) : images
    if (Array.isArray(arr) && arr.length > 0) return arr[0] as string
  } catch { /* ignore */ }
  return null
}

function getMaterials(raw: unknown): string[] {
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw
    if (Array.isArray(arr)) return arr as string[]
  } catch { /* ignore */ }
  return []
}

function getEffectivePrice(product: Product): number {
  if (!product.saleEnabled || product.saleDiscountPct == null) return product.price
  const now = Date.now()
  if (product.saleStartAt && new Date(product.saleStartAt).getTime() > now) return product.price
  if (product.saleEndAt && new Date(product.saleEndAt).getTime() < now) return product.price
  return Math.round(product.price * (1 - product.saleDiscountPct / 100))
}

function formatCLP(n: number): string {
  return "$" + n.toLocaleString("es-CL")
}

// ── Payment method config ─────────────────────────────────────

type PayMethod = "CASH" | "CARD" | "TRANSFER" | "PAYMENT_LINK"

const PAY_METHODS: { key: PayMethod; label: string; sub?: string; emoji: string }[] = [
  { key: "CASH",         label: "Efectivo",      emoji: "💵" },
  { key: "CARD",         label: "Tarjeta",        sub: "maquinita", emoji: "💳" },
  { key: "TRANSFER",     label: "Transferencia",  emoji: "🏦" },
  { key: "PAYMENT_LINK", label: "Link de pago",   emoji: "🔗" },
]

// ── Main component ─────────────────────────────────────────────

export default function VentaPresencialClient({ products, collections, filterGroups }: Props) {
  // ── Catalog state ────────────────────────────────────────────
  const [search, setSearch]                         = useState("")
  const [activeCollection, setActiveCollection]     = useState<string | null>(null)
  const [selectedVariants, setSelectedVariants]     = useState<Record<string, string>>({})
  const [shakingIds, setShakingIds]                 = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters]               = useState(false)
  // groupId → Set of selected option values
  const [activeFilters, setActiveFilters]           = useState<Record<string, Set<string>>>({})

  // ── Cart state ────────────────────────────────────────────────
  const [cart, setCart]                   = useState<CartEntry[]>([])
  const [showCart, setShowCart]           = useState(true)
  const [discount, setDiscount]           = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PayMethod | null>(null)
  const [showCustomer, setShowCustomer]   = useState(false)
  const [customerName, setCustomerName]   = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [notes, setNotes]                 = useState("")

  // ── Submission state ──────────────────────────────────────────
  const [isPending, startTransition]      = useTransition()
  const [success, setSuccess]             = useState<{ orderId: string; orderNumber: string } | null>(null)
  const [error, setError]                 = useState<string | null>(null)

  // ── Filter helpers ────────────────────────────────────────────

  function toggleFilter(groupId: string, value: string) {
    setActiveFilters((prev) => {
      const current = new Set(prev[groupId] ?? [])
      if (current.has(value)) current.delete(value)
      else current.add(value)
      return { ...prev, [groupId]: new Set(current) }
    })
  }

  function clearFilters() {
    setActiveFilters({})
  }

  const activeFilterCount = Object.values(activeFilters).reduce((s, v) => s + v.size, 0)

  // ── Filtered products ─────────────────────────────────────────
  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchCol    = !activeCollection || p.collectionId === activeCollection

    const matchFilters = filterGroups.every((group) => {
      const selected = activeFilters[group.id]
      if (!selected || selected.size === 0) return true

      if (group.kind === "PRICE_RANGE") {
        const price = getEffectivePrice(p)
        return [...selected].some((val) => {
          const opt = group.options.find((o) => o.value === val)
          if (!opt) return false
          const min = opt.minPrice ?? 0
          return price >= min && (opt.maxPrice == null || price <= opt.maxPrice)
        })
      } else {
        const mats = getMaterials(p.materials)
        return [...selected].some((val) =>
          mats.some((m) => m.toLowerCase() === val.toLowerCase())
        )
      }
    })

    return matchSearch && matchCol && matchFilters
  })

  // ── Cart helpers ──────────────────────────────────────────────

  function cartKey(productId: string, variantId: string | null) {
    return variantId ? `${productId}__${variantId}` : productId
  }

  function addToCart(product: Product) {
    const hasVariants = product.variants.length > 0
    const variantId   = hasVariants ? (selectedVariants[product.id] ?? null) : null

    if (hasVariants && !variantId) {
      setShakingIds((prev) => {
        const next = new Set(prev)
        next.add(product.id)
        return next
      })
      setTimeout(() => {
        setShakingIds((prev) => {
          const next = new Set(prev)
          next.delete(product.id)
          return next
        })
      }, 500)
      return
    }

    const variant    = variantId ? product.variants.find((v) => v.id === variantId) : null
    // Apply sale discount: to variant price if it exists, else to product effective price
    const basePrice  = variant?.price ?? getEffectivePrice(product)
    const key        = cartKey(product.id, variantId)

    setCart((prev) => {
      const existing = prev.find((e) => e.cartKey === key)
      if (existing) {
        return prev.map((e) =>
          e.cartKey === key ? { ...e, quantity: e.quantity + 1 } : e
        )
      }
      const entry: CartEntry = {
        cartKey:      key,
        productId:    product.id,
        productName:  product.name,
        variantId:    variantId,
        variantLabel: variant?.label ?? null,
        quantity:     1,
        unitPrice:    basePrice,
        imageUrl:     getImageUrl(product.images),
      }
      return [...prev, entry]
    })
  }

  function updateQty(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((e) => e.cartKey === key ? { ...e, quantity: e.quantity + delta } : e)
        .filter((e) => e.quantity > 0)
    )
  }

  function removeItem(key: string) {
    setCart((prev) => prev.filter((e) => e.cartKey !== key))
  }

  // ── Totals ────────────────────────────────────────────────────

  const subtotal      = cart.reduce((s, e) => s + e.unitPrice * e.quantity, 0)
  const discountAmt   = Math.min(parseInt(discount) || 0, subtotal)
  const total         = Math.max(0, subtotal - discountAmt)

  // ── Submit ────────────────────────────────────────────────────

  function handleSubmit() {
    if (!cart.length || !paymentMethod) return
    setError(null)

    startTransition(async () => {
      const res = await createPresencialOrder({
        items: cart.map(({ cartKey: _ck, imageUrl: _img, ...rest }) => rest),
        paymentMethod,
        customerName:  customerName  || undefined,
        customerPhone: customerPhone || undefined,
        customerEmail: customerEmail || undefined,
        discount:      discountAmt   || undefined,
        notes:         notes         || undefined,
      })

      if ("error" in res && res.error) {
        setError(res.error)
      } else if ("success" in res && res.success) {
        setSuccess({ orderId: res.orderId!, orderNumber: res.orderNumber! })
      }
    })
  }

  function resetAll() {
    setCart([])
    setDiscount("")
    setPaymentMethod(null)
    setCustomerName("")
    setCustomerPhone("")
    setCustomerEmail("")
    setNotes("")
    setSearch("")
    setActiveCollection(null)
    setSelectedVariants({})
    setActiveFilters({})
    setSuccess(null)
    setError(null)
    setShowCustomer(false)
    setShowCart(true)
  }

  // ── Shared style helpers ──────────────────────────────────────
  const inputCls = "w-full bg-white border border-[#D8BFAE] text-xs text-[#5C4A3E] px-3 py-2 outline-none focus:border-[#CDA78F] transition-colors"
  const labelCls = "block text-[9px] tracking-[0.12em] uppercase text-[#8E7A6B] mb-1"

  // ── Success screen ────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-10 text-center max-w-sm w-full space-y-5">
          <CheckCircle2 size={40} strokeWidth={1} className="text-emerald-500 mx-auto" />
          <div>
            <p className="text-[9px] tracking-[0.2em] uppercase text-[#8E7A6B] mb-1">Venta registrada</p>
            <p className="font-heading text-2xl text-[#5C4A3E]">#{success.orderNumber}</p>
          </div>
          <p className="text-xs text-[#8E7A6B]">
            La venta presencial fue creada correctamente.
          </p>
          <button
            onClick={resetAll}
            className="w-full bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[10px] tracking-[0.15em] uppercase py-3 transition-colors"
          >
            Nueva venta
          </button>
        </div>
      </div>
    )
  }

  // ── Main layout ───────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl">

      {/* ════════════════════════════════════════════════════════
          LEFT — Product catalog
      ════════════════════════════════════════════════════════ */}
      <div className="lg:col-span-2 space-y-3">

        {/* Search + Filters button */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white border border-[#D8BFAE] px-3 py-2.5 focus-within:border-[#CDA78F] transition-colors">
            <Search size={13} strokeWidth={1.5} className="text-[#8E7A6B] shrink-0" />
            <input
              type="text"
              placeholder="Buscar producto…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs text-[#5C4A3E] placeholder:text-[#8E7A6B] outline-none w-full"
            />
            {search && (
              <button onClick={() => setSearch("")}>
                <X size={12} className="text-[#8E7A6B] hover:text-[#5C4A3E]" />
              </button>
            )}
          </div>

          {filterGroups.length > 0 && (
            <button
              onClick={() => setShowFilters((s) => !s)}
              className={`flex items-center gap-1.5 px-3 py-2.5 border text-[10px] tracking-[0.1em] uppercase transition-colors shrink-0 ${
                showFilters || activeFilterCount > 0
                  ? "bg-[#5C4A3E] text-white border-[#5C4A3E]"
                  : "bg-white border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F]"
              }`}
            >
              <SlidersHorizontal size={12} strokeWidth={1.5} />
              Filtros
              {activeFilterCount > 0 && (
                <span className="bg-[#CDA78F] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Collection filter tabs */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCollection(null)}
            className={`text-[9px] tracking-[0.1em] uppercase px-3 py-1.5 transition-colors ${
              !activeCollection
                ? "bg-[#5C4A3E] text-white"
                : "bg-white border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F]"
            }`}
          >
            Todos
          </button>
          {collections.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCollection(c.id === activeCollection ? null : c.id)}
              className={`text-[9px] tracking-[0.1em] uppercase px-3 py-1.5 transition-colors ${
                activeCollection === c.id
                  ? "bg-[#5C4A3E] text-white"
                  : "bg-white border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F]"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Advanced filters panel */}
        {showFilters && filterGroups.length > 0 && (
          <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Filtros avanzados</p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-[9px] tracking-[0.1em] uppercase text-[#CDA78F] hover:text-[#8E7A6B] flex items-center gap-1 transition-colors"
                >
                  <X size={10} strokeWidth={2} /> Limpiar
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              {filterGroups.map((group) => (
                <div key={group.id}>
                  <p className="text-[9px] tracking-[0.12em] uppercase text-[#5C4A3E] font-medium mb-2">
                    {group.name}
                  </p>
                  <div className="space-y-1.5">
                    {group.options.map((opt) => {
                      const selected = activeFilters[group.id]?.has(opt.value) ?? false
                      return (
                        <label key={opt.id} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleFilter(group.id, opt.value)}
                            className="accent-[#CDA78F] w-3 h-3 shrink-0"
                          />
                          <span className={`text-[10px] transition-colors ${selected ? "text-[#5C4A3E] font-medium" : "text-[#8E7A6B] group-hover:text-[#5C4A3E]"}`}>
                            {opt.label}
                            {group.kind === "PRICE_RANGE" && opt.maxPrice == null && " +"}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Product grid */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#8E7A6B]">
            Sin productos para mostrar
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="block mx-auto mt-3 text-[10px] text-[#CDA78F] hover:text-[#8E7A6B] underline transition-colors">
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((product) => {
              const img          = getImageUrl(product.images)
              const isShaking    = shakingIds.has(product.id)
              const hasVariants  = product.variants.length > 0
              const selVariant   = selectedVariants[product.id] ?? null
              const selectedV    = product.variants.find((v) => v.id === selVariant)
              const basePrice    = selectedV?.price ?? product.price
              const effectivePrice = selectedV?.price != null
                ? selectedV.price  // variants keep their own price; sale applied only to base
                : getEffectivePrice(product)
              const hasSale      = effectivePrice < basePrice
              const outOfStock   = product.stock === 0 && !hasVariants

              return (
                <div
                  key={product.id}
                  className={`bg-[#F7F4F1] border border-[#D8BFAE] flex flex-col overflow-hidden transition-transform ${
                    isShaking ? "animate-[shake_0.4s_ease-in-out]" : ""
                  }`}
                  style={isShaking ? { animation: "shake 0.4s ease-in-out" } : {}}
                >
                  {/* Image */}
                  <div className="relative bg-[#EDE2D8] aspect-square overflow-hidden">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={24} strokeWidth={1} className="text-[#CDA78F]" />
                      </div>
                    )}
                    {outOfStock && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="bg-white text-[9px] tracking-[0.1em] uppercase text-[#5C4A3E] px-2 py-0.5">
                          Agotado
                        </span>
                      </div>
                    )}
                    {hasSale && !outOfStock && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-medium px-1.5 py-0.5">
                        −{product.saleDiscountPct}%
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5 flex flex-col gap-2 flex-1">
                    <p className="text-[11px] text-[#5C4A3E] font-medium leading-tight line-clamp-2">
                      {product.name}
                    </p>

                    {/* Price — with sale support */}
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <p className={`text-xs font-medium ${hasSale ? "text-red-500" : "text-[#CDA78F]"}`}>
                        {formatCLP(effectivePrice)}
                      </p>
                      {hasSale && (
                        <p className="text-[10px] text-[#8E7A6B] line-through">
                          {formatCLP(basePrice)}
                        </p>
                      )}
                    </div>

                    {/* Variant pills */}
                    {hasVariants && (
                      <div className="flex flex-wrap gap-1">
                        {product.variants.map((v) => (
                          <button
                            key={v.id}
                            onClick={() =>
                              setSelectedVariants((prev) => ({
                                ...prev,
                                [product.id]: prev[product.id] === v.id ? "" : v.id,
                              }))
                            }
                            className={`text-[9px] px-1.5 py-0.5 border transition-colors ${
                              selVariant === v.id
                                ? "bg-[#CDA78F] text-white border-[#CDA78F]"
                                : "bg-white border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F]"
                            }`}
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Add button */}
                    <button
                      onClick={() => addToCart(product)}
                      disabled={outOfStock}
                      className="mt-auto flex items-center justify-center gap-1.5 bg-[#5C4A3E] hover:bg-[#CDA78F] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[9px] tracking-[0.1em] uppercase py-2 transition-colors"
                    >
                      <Plus size={11} strokeWidth={2} />
                      Agregar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════
          RIGHT — Cart + form
      ════════════════════════════════════════════════════════ */}
      <div className="lg:col-span-1">
        <div className="sticky top-6 space-y-4">

          {/* Cart panel */}
          <div className="bg-[#F7F4F1] border border-[#D8BFAE]">
            <button
              onClick={() => setShowCart((s) => !s)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#EDE2D8]/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart size={13} strokeWidth={1.5} className="text-[#CDA78F]" />
                <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">
                  Carrito — {cart.length} {cart.length === 1 ? "producto" : "productos"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!showCart && cart.length > 0 && (
                  <span className="text-xs font-medium text-[#5C4A3E]">{formatCLP(total)}</span>
                )}
                {showCart
                  ? <ChevronUp size={13} strokeWidth={1.5} className="text-[#8E7A6B]" />
                  : <ChevronDown size={13} strokeWidth={1.5} className="text-[#8E7A6B]" />
                }
              </div>
            </button>

            {showCart && (
              <>
                {cart.length === 0 ? (
                  <p className="text-[10px] text-[#8E7A6B] italic text-center py-8 px-4 border-t border-[#D8BFAE]">
                    Agrega productos desde el catálogo
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-[#EDE2D8] border-t border-[#D8BFAE]">
                    {cart.map((entry) => (
                      <div key={entry.cartKey} className="px-3 py-2.5 flex items-center gap-2.5">
                        {/* Thumbnail */}
                        <div className="w-10 h-10 shrink-0 bg-[#EDE2D8] overflow-hidden rounded-sm">
                          {entry.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={entry.imageUrl}
                              alt={entry.productName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={14} strokeWidth={1} className="text-[#CDA78F]" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-[#5C4A3E] font-medium leading-tight truncate">
                            {entry.productName}
                          </p>
                          {entry.variantLabel && (
                            <p className="text-[9px] text-[#CDA78F] mt-0.5">{entry.variantLabel}</p>
                          )}
                          <p className="text-[10px] text-[#8E7A6B] mt-0.5">
                            {formatCLP(entry.unitPrice)} c/u
                          </p>
                        </div>

                        {/* Qty stepper */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => updateQty(entry.cartKey, -1)}
                            className="w-6 h-6 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] hover:text-[#5C4A3E] transition-colors"
                          >
                            <Minus size={9} strokeWidth={2} />
                          </button>
                          <span className="w-6 text-center text-xs text-[#5C4A3E] font-medium">
                            {entry.quantity}
                          </span>
                          <button
                            onClick={() => updateQty(entry.cartKey, +1)}
                            className="w-6 h-6 flex items-center justify-center border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] hover:text-[#5C4A3E] transition-colors"
                          >
                            <Plus size={9} strokeWidth={2} />
                          </button>
                        </div>

                        {/* Line total + remove */}
                        <div className="text-right shrink-0 space-y-1">
                          <p className="text-xs text-[#5C4A3E] font-medium">
                            {formatCLP(entry.unitPrice * entry.quantity)}
                          </p>
                          <button
                            onClick={() => removeItem(entry.cartKey)}
                            className="text-[#D8BFAE] hover:text-red-400 transition-colors"
                          >
                            <X size={11} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totals */}
                {cart.length > 0 && (
                  <div className="px-4 py-3 border-t border-[#D8BFAE] space-y-2">
                    <div className="flex justify-between text-xs text-[#8E7A6B]">
                      <span>Subtotal</span>
                      <span>{formatCLP(subtotal)}</span>
                    </div>

                    {/* Discount field */}
                    <div className="flex items-center gap-2">
                      <label className="text-[9px] tracking-[0.1em] uppercase text-[#8E7A6B] shrink-0">
                        Descuento CLP
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        placeholder="0"
                        className="flex-1 bg-white border border-[#D8BFAE] text-xs text-[#5C4A3E] px-2 py-1 outline-none focus:border-[#CDA78F] transition-colors text-right"
                      />
                    </div>

                    {discountAmt > 0 && (
                      <div className="flex justify-between text-xs text-emerald-600">
                        <span>Descuento</span>
                        <span>−{formatCLP(discountAmt)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-baseline pt-1 border-t border-[#EDE2D8]">
                      <span className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Total</span>
                      <span className="font-heading text-xl text-[#5C4A3E]">{formatCLP(total)}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Customer section */}
          <div className="bg-[#F7F4F1] border border-[#D8BFAE]">
            <button
              onClick={() => setShowCustomer((s) => !s)}
              className="w-full flex items-center justify-between px-4 py-3 text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B] hover:text-[#5C4A3E] transition-colors"
            >
              <span>Registrar cliente (opcional)</span>
              {showCustomer
                ? <ChevronUp size={13} strokeWidth={1.5} />
                : <ChevronDown size={13} strokeWidth={1.5} />
              }
            </button>
            {showCustomer && (
              <div className="px-4 pb-4 space-y-3 border-t border-[#EDE2D8] pt-3">
                <div>
                  <label className={labelCls}>Nombre</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nombre del cliente"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Teléfono</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+56 9 1234 5678"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Correo</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="cliente@ejemplo.com"
                    className={inputCls}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Payment method */}
          <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-4 space-y-2">
            <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Método de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {PAY_METHODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setPaymentMethod(m.key)}
                  className={`flex flex-col items-center justify-center gap-1 py-3 px-2 border text-center transition-colors ${
                    paymentMethod === m.key
                      ? "bg-[#CDA78F] text-white border-[#CDA78F]"
                      : "bg-white border-[#D8BFAE] text-[#5C4A3E] hover:border-[#CDA78F]"
                  }`}
                >
                  <span className="text-base">{m.emoji}</span>
                  <span className="text-[10px] font-medium tracking-wide">{m.label}</span>
                  {m.sub && (
                    <span className={`text-[9px] ${paymentMethod === m.key ? "text-white/70" : "text-[#8E7A6B]"}`}>
                      {m.sub}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-[#F7F4F1] border border-[#D8BFAE] p-4 space-y-2">
            <label className={labelCls}>Notas internas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Observaciones internas sobre esta venta…"
              className="w-full bg-white border border-[#D8BFAE] text-xs text-[#5C4A3E] px-3 py-2 outline-none focus:border-[#CDA78F] resize-none transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 px-4 py-2.5 text-xs text-red-600">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!cart.length || !paymentMethod || isPending}
            className="w-full flex items-center justify-center gap-2 bg-[#5C4A3E] hover:bg-[#CDA78F] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] tracking-[0.2em] uppercase py-4 transition-colors"
          >
            {isPending ? (
              <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
            ) : (
              <ShoppingCart size={14} strokeWidth={1.5} />
            )}
            {isPending ? "Registrando…" : "Registrar venta"}
          </button>

          {/* Validation hints */}
          {(!cart.length || !paymentMethod) && (
            <p className="text-[9px] text-[#8E7A6B] text-center tracking-wide">
              {!cart.length && !paymentMethod
                ? "Agrega productos y selecciona un método de pago"
                : !cart.length
                ? "El carrito está vacío"
                : "Selecciona un método de pago"}
            </p>
          )}
        </div>
      </div>

      {/* Shake keyframe */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-4px); }
          40%       { transform: translateX(4px); }
          60%       { transform: translateX(-3px); }
          80%       { transform: translateX(3px); }
        }
      `}</style>
    </div>
  )
}
