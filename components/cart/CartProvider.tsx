"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { Product } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { products as allProducts } from "@/lib/data/products";
import { isPurchasable } from "@/lib/utils";

export interface CartItem {
  product: Product;
  size: string;
  color: string;
  quantity: number;
}

export interface CartToastData {
  product: Product;
  size: string;
  color?: string;
}

// Lightweight cart entry for Supabase storage (no full product object)
interface CartEntry {
  productId: string;
  size: string;
  color: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  cartCount: number;
  cartTotal: number;
  hydrated: boolean;
  addItem: (product: Product, size: string, color: string, quantity?: number) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  toast: CartToastData | null;
  setToast: (data: CartToastData | null) => void;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "upl1ft-cart";

// Most the server accepts per cart line (MAX_QTY_PER_LINE in functions/api/_catalog.ts)
export const MAX_QTY_PER_LINE = 10;

// Check a saved cart against the current catalog. Reads both stored shapes:
// localStorage lines ({ product, size, color, quantity }) and Supabase entries
// ({ productId, size, color, quantity }). The product always comes from the catalog,
// never from the stored snapshot. Lines that can no longer be bought are dropped.
function sanitizeCart(stored: unknown): CartItem[] {
  if (!Array.isArray(stored)) return [];
  const clean: CartItem[] = [];
  for (const line of stored) {
    if (!line || typeof line !== "object") continue;
    const { productId, product: snapshot, size, color, quantity } = line as Record<string, any>;
    const id = typeof productId === "string" ? productId : snapshot?.id;
    const product = allProducts.find((p) => p.id === id);
    if (!product || !isPurchasable(product)) continue;
    if (!product.colors.includes(color) || !product.sizes.includes(size)) continue;
    if (typeof quantity !== "number" || !Number.isFinite(quantity)) continue;
    clean.push({
      product,
      size,
      color,
      quantity: Math.min(MAX_QTY_PER_LINE, Math.max(1, Math.trunc(quantity))),
    });
  }
  return clean;
}

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? sanitizeCart(JSON.parse(stored)) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage full or unavailable
  }
}

// Convert full CartItems to lightweight entries for Supabase
function toEntries(items: CartItem[]): CartEntry[] {
  return items.map((item) => ({
    productId: item.product.id,
    size: item.size,
    color: item.color,
    quantity: item.quantity,
  }));
}

// Hydrate lightweight entries back to full CartItems (checked against the catalog)
function fromEntries(entries: unknown): CartItem[] {
  return sanitizeCart(entries);
}

// Merge two cart arrays, combining quantities for duplicate items
function mergeCarts(a: CartItem[], b: CartItem[]): CartItem[] {
  const merged = [...a];
  for (const item of b) {
    const existing = merged.findIndex(
      (m) =>
        m.product.id === item.product.id &&
        m.size === item.size &&
        m.color === item.color
    );
    if (existing >= 0) {
      merged[existing] = {
        ...merged[existing],
        quantity: merged[existing].quantity + item.quantity,
      };
    } else {
      merged.push(item);
    }
  }
  return merged;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToastState] = useState<CartToastData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { user } = useAuth();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSyncRef = useRef(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setItems(loadCart());
    setHydrated(true);
  }, []);

  // Load cart from Supabase when user logs in — prefer local cart over remote
  const remoteLoadedRef = useRef(false);
  useEffect(() => {
    // Reset flag when user logs out so next login can load remote cart
    if (!user) {
      remoteLoadedRef.current = false;
      return;
    }
    if (!hydrated || !supabaseConfigured) return;
    if (remoteLoadedRef.current) return;
    remoteLoadedRef.current = true;

    const loadRemoteCart = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("cart_data")
          .eq("id", user.id)
          .single();

        if (data?.cart_data && Array.isArray(data.cart_data)) {
          // Lines the catalog no longer sells are dropped here
          const remoteItems = fromEntries(data.cart_data);
          setItems((localItems) => {
            // Local cart has items — keep it as-is (user's current intent)
            if (localItems.length > 0) return localItems;
            // Local cart empty — restore from remote
            return remoteItems;
          });
          // No extra write needed: the debounced save below stores whichever cart
          // was kept, so the dropped lines leave the Supabase copy too.
        }
      } catch {
        // Supabase unavailable or column doesn't exist yet — continue with local cart
      }
    };

    loadRemoteCart();
  }, [user, hydrated]);

  // Persist to localStorage on change (after hydration)
  useEffect(() => {
    if (hydrated) {
      saveCart(items);
    }
  }, [items, hydrated]);

  // Debounced save to Supabase when cart changes
  useEffect(() => {
    if (!hydrated || !user || !supabaseConfigured) return;
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await supabase
          .from("profiles")
          .update({ cart_data: toEntries(items) })
          .eq("id", user.id);
      } catch {
        // Silent fail — localStorage is the primary store
      }
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [items, hydrated, user]);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToastState(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const setToast = useCallback((data: CartToastData | null) => {
    setToastState(data);
  }, []);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const addItem = useCallback(
    (product: Product, size: string, color: string, quantity = 1) => {
      // Coming Soon / out-of-stock products never enter the cart
      if (!isPurchasable(product)) return;
      setItems((prev) => {
        // Check if same product/size/color already in cart
        const existingIndex = prev.findIndex(
          (item) =>
            item.product.id === product.id &&
            item.size === size &&
            item.color === color
        );

        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: Math.min(
              MAX_QTY_PER_LINE,
              updated[existingIndex].quantity + quantity
            ),
          };
          return updated;
        }

        return [
          ...prev,
          { product, size, color, quantity: Math.min(MAX_QTY_PER_LINE, quantity) },
        ];
      });
    },
    []
  );

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateQuantity = useCallback((index: number, quantity: number) => {
    if (quantity < 1 || quantity > MAX_QTY_PER_LINE) return;
    setItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], quantity };
      }
      return updated;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    // Immediately clear remote cart so stale items don't return on next login
    if (user && supabaseConfigured) {
      supabase
        .from("profiles")
        .update({ cart_data: [] })
        .eq("id", user.id)
        .then(() => {});
    }
  }, [user]);

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{ items, cartCount, cartTotal, hydrated, addItem, removeItem, updateQuantity, clearCart, toast, setToast, isDrawerOpen, openDrawer, closeDrawer }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
