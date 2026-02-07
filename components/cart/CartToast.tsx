"use client";

import Link from "next/link";
import Image from "next/image";
import { X, ShoppingBag, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "./CartProvider";

export function CartToast() {
  const { toast, setToast } = useCart();

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 left-6 md:left-auto md:w-96 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-card border border-border rounded-lg shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-accent/10 border-b border-border">
          <span className="text-sm font-semibold text-accent uppercase tracking-wider">
            Added to Cart
          </span>
          <button
            onClick={() => setToast(null)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Product Info */}
        <div className="flex items-center gap-4 p-4">
          <div className="relative w-16 h-20 bg-muted overflow-hidden rounded flex-shrink-0">
            <Image
              src={toast.product.images[0]}
              alt={toast.product.name}
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
          <div className="min-w-0">
            <p className="font-display text-sm uppercase tracking-wider text-foreground truncate">
              {toast.product.name}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Size: {toast.size} &middot; {toast.product.colors[0]}
            </p>
            <p className="text-sm font-semibold text-accent mt-0.5">
              ${toast.product.price.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 p-4 pt-0">
          <Link href="/cart" className="flex-1" onClick={() => setToast(null)}>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <ShoppingBag className="h-4 w-4" />
              View Cart
            </Button>
          </Link>
          <Link href="/checkout" className="flex-1" onClick={() => setToast(null)}>
            <Button size="sm" className="w-full gap-2">
              <CreditCard className="h-4 w-4" />
              Checkout
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
