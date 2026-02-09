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

export interface CartItem {
  product: Product;
  size: string;
  color: string;
  quantity: number;
}

export interface CartToastData {
  product: Product;
  size: string;
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

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
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

// Hydrate lightweight entries back to full CartItems
function fromEntries(entries: CartEntry[]): CartItem[] {
  return entries
    .map((entry) => {
      const product = allProducts.find((p) => p.id === entry.productId);
      if (!product) return null;
      return {
        product,
        size: entry.size,
        color: entry.color,
        quantity: entry.quantity,
      };
    })
    .filter(Boolean) as CartItem[];
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

  // Load cart from Supabase when user logs in and merge with local cart
  useEffect(() => {
    if (!hydrated || !user || !supabaseConfigured) return;

    const loadRemoteCart = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("cart_data")
          .eq("id", user.id)
          .single();

        if (data?.cart_data && Array.isArray(data.cart_data)) {
          const remoteItems = fromEntries(data.cart_data as CartEntry[]);
          setItems((localItems) => {
            if (localItems.length === 0) return remoteItems;
            if (remoteItems.length === 0) return localItems;
            return mergeCarts(localItems, remoteItems);
          });
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
            quantity: updated[existingIndex].quantity + quantity,
          };
          return updated;
        }

        return [...prev, { product, size, color, quantity }];
      });
    },
    []
  );

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateQuantity = useCallback((index: number, quantity: number) => {
    if (quantity < 1) return;
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
  }, []);

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{ items, cartCount, cartTotal, addItem, removeItem, updateQuantity, clearCart, toast, setToast, isDrawerOpen, openDrawer, closeDrawer }}
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
