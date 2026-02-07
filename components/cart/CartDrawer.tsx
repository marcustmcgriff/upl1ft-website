"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "./CartProvider";
import { formatPrice } from "@/lib/utils";

export function CartDrawer() {
  const {
    items,
    cartCount,
    cartTotal,
    removeItem,
    updateQuantity,
    isDrawerOpen,
    closeDrawer,
  } = useCart();

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    if (isDrawerOpen) {
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [isDrawerOpen, closeDrawer]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isDrawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-background border-l border-border shadow-2xl shadow-black/50 transition-transform duration-300 ease-out flex flex-col ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-accent" />
            <h2 className="font-display text-lg uppercase tracking-wider text-foreground">
              Your Cart
            </h2>
            {cartCount > 0 && (
              <span className="text-sm text-muted-foreground">
                ({cartCount} {cartCount === 1 ? "item" : "items"})
              </span>
            )}
          </div>
          <button
            onClick={closeDrawer}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-2">Your cart is empty</p>
              <Link href="/shop" onClick={closeDrawer}>
                <Button variant="outline" size="sm">
                  Start Shopping
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item, index) => (
                <div key={`${item.product.id}-${item.size}-${item.color}`} className="flex gap-4 p-4 px-6">
                  {/* Product Image */}
                  <Link
                    href={`/shop/${item.product.slug}`}
                    onClick={closeDrawer}
                    className="relative w-20 h-24 bg-muted overflow-hidden flex-shrink-0"
                  >
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </Link>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/shop/${item.product.slug}`}
                      onClick={closeDrawer}
                      className="block"
                    >
                      <h3 className="font-display text-sm uppercase tracking-wider text-foreground truncate hover:text-accent transition-colors">
                        {item.product.name}
                      </h3>
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.size} &middot; {item.color}
                    </p>
                    <p className="text-sm font-semibold text-accent mt-1">
                      {formatPrice(item.product.price)}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border border-border">
                        <button
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-3 text-sm font-medium text-foreground min-w-[2rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(index)}
                        className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Line Total */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-foreground">
                      {formatPrice(item.product.price * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer — Order Summary + Checkout */}
        {items.length > 0 && (
          <div className="border-t border-border px-6 py-4 space-y-4 bg-muted/50">
            {/* Free Shipping Notice */}
            <p className="text-xs text-center text-muted-foreground uppercase tracking-wider">
              Free shipping on all orders
            </p>

            {/* Subtotal */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-lg font-display text-accent">
                {formatPrice(cartTotal)}
              </span>
            </div>

            {/* Checkout Button */}
            <Link href="/checkout" onClick={closeDrawer} className="block">
              <Button className="w-full" size="lg">
                Checkout
              </Button>
            </Link>

            {/* Continue Shopping */}
            <button
              onClick={closeDrawer}
              className="w-full text-center text-sm text-muted-foreground hover:text-accent transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
