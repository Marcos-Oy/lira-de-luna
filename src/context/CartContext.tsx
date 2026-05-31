"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { products as allProducts, type Product } from "@/lib/mock-data";

export type CartItem = { product: Product; quantity: number; size?: string };

type CartContextType = {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, size?: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
};

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = "lira_cart";

type StoredItem = { productId: string; quantity: number; size?: string };

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Hydrate from localStorage once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const stored: StoredItem[] = JSON.parse(raw);
      const resolved = stored
        .map((s) => {
          const product = allProducts.find((p) => p.id === s.productId);
          return product ? { product, quantity: s.quantity, size: s.size } : null;
        })
        .filter(Boolean) as CartItem[];
      setItems(resolved);
    } catch {}
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    const stored: StoredItem[] = items.map((i) => ({
      productId: i.product.id,
      quantity: i.quantity,
      size: i.size,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [items]);

  const addItem = useCallback((product: Product, quantity = 1, size?: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id && i.size === size);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id && i.size === size
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { product, quantity, size }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.product.id !== productId));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
      );
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
