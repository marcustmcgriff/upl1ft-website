"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/components/cart/CartProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatPrice } from "@/lib/utils";
import { ShoppingBag, Lock, ChevronLeft, Tag, X } from "lucide-react";

export default function CheckoutPage() {
  const { items, cartTotal } = useCart();
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Discount code state
  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    discount_type: string;
    discount_value: number;
    discount_amount: number;
    description: string;
  } | null>(null);
  const [discountError, setDiscountError] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);

  const subtotalCents = Math.round(cartTotal * 100);
  const discountAmountCents = appliedDiscount?.discount_amount || 0;
  const totalCents = subtotalCents - discountAmountCents;

  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) return;
    setDiscountError("");
    setDiscountLoading(true);

    try {
      const response = await fetch("/api/validate-discount", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          code: discountInput.trim(),
          subtotal: subtotalCents,
        }),
      });

      const data = await response.json();

      if (data.valid) {
        setAppliedDiscount(data);
        setDiscountInput("");
      } else {
        setDiscountError(data.error || "Invalid code");
      }
    } catch {
      setDiscountError("Failed to validate code");
    }

    setDiscountLoading(false);
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.product.id,
            name: item.product.name,
            price: item.product.price,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            image: item.product.images[0],
          })),
          discountCode: appliedDiscount?.code || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto text-center">
          <ShoppingBag className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-3xl font-display uppercase tracking-wider text-accent mb-4">
            Nothing to Check Out
          </h1>
          <p className="text-muted-foreground mb-8">
            Your cart is empty. Add some items first.
          </p>
          <Link href="/shop">
            <Button size="lg">Shop Now</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <Link
        href="/cart"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Cart
      </Link>

      <h1 className="text-4xl md:text-5xl font-display uppercase tracking-wider text-accent gold-glow mb-8">
        Checkout
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Order Review */}
        <div className="lg:col-span-2 space-y-6">
          {/* Auth status */}
          {user && (
            <div className="bg-accent/5 border border-accent/20 p-3 text-sm">
              Signed in as{" "}
              <span className="text-accent font-semibold">{user.email}</span>
            </div>
          )}

          <h2 className="text-xl font-display uppercase tracking-wider text-accent">
            Order Review
          </h2>

          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={`${item.product.id}-${item.size}-${item.color}`}
                className="flex gap-4 bg-muted p-4"
              >
                <div className="relative w-16 h-20 flex-shrink-0 bg-background overflow-hidden">
                  <Image
                    src={item.product.images[0]}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-display uppercase tracking-wider text-accent text-sm">
                    {item.product.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.size} / {item.color} &times; {item.quantity}
                  </p>
                </div>
                <span className="text-foreground font-medium text-sm">
                  {formatPrice(item.product.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-muted/50 border border-border p-4 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Shipping address and payment will be collected securely by Stripe.
            </p>
          </div>
        </div>

        {/* Order Summary + Pay Button */}
        <div className="lg:col-span-1">
          <div className="bg-muted p-6 space-y-4 sticky top-24">
            <h2 className="text-xl font-display uppercase tracking-wider text-accent">
              Order Summary
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-foreground">Free</span>
              </div>
              {appliedDiscount && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <span className="text-green-500">
                      Discount ({appliedDiscount.code})
                    </span>
                    <button
                      onClick={() => setAppliedDiscount(null)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-green-500">
                    -{formatPrice(discountAmountCents / 100)}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span className="text-foreground">Total</span>
                <span className="text-accent">
                  {formatPrice(totalCents / 100)}
                </span>
              </div>
            </div>

            {/* Discount Code Input */}
            {!appliedDiscount && (
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Discount code
                  </span>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter code"
                    value={discountInput}
                    onChange={(e) =>
                      setDiscountInput(e.target.value.toUpperCase())
                    }
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleApplyDiscount()
                    }
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApplyDiscount}
                    disabled={discountLoading || !discountInput.trim()}
                  >
                    {discountLoading ? "..." : "Apply"}
                  </Button>
                </div>
                {discountError && (
                  <p className="text-red-500 text-xs mt-1">{discountError}</p>
                )}
              </div>
            )}

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <Button
              size="lg"
              className="w-full"
              onClick={handleCheckout}
              disabled={loading}
            >
              <Lock className="mr-2 h-4 w-4" />
              {loading ? "Redirecting to Payment..." : "Pay with Stripe"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Secure checkout powered by Stripe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
