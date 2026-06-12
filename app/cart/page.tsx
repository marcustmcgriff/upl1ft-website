"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShoppingBag,
  Minus,
  Plus,
  X,
  Tag,
  Gift,
  Lock,
  UserPlus,
} from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatPrice } from "@/lib/utils";

export default function CartPage() {
  const { items, cartTotal, removeItem, updateQuantity } = useCart();
  const { user, session } = useAuth();
  const router = useRouter();

  // Discount code state
  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    discount_amount: number;
  } | null>(null);
  const [discountError, setDiscountError] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);

  // Gift message state
  const [giftMessage, setGiftMessage] = useState("");
  const [showGiftMessage, setShowGiftMessage] = useState(false);

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

  const handleCheckout = () => {
    // Hand the chosen options to the payment page
    try {
      sessionStorage.setItem(
        "upl1ft-checkout-opts",
        JSON.stringify({
          discountCode: appliedDiscount?.code || undefined,
          giftMessage: giftMessage.trim() || undefined,
        })
      );
    } catch {
      // sessionStorage unavailable — checkout proceeds without options
    }
    router.push("/checkout");
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto text-center">
          <ShoppingBag className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-3xl font-display uppercase tracking-wider text-accent mb-4">
            Your Cart is Empty
          </h1>
          <p className="text-muted-foreground mb-8">
            Add some armor to your collection.
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
      <h1 className="text-4xl md:text-5xl font-display uppercase tracking-wider text-accent gold-glow mb-8">
        Your Cart
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item, index) => (
            <div
              key={`${item.product.id}-${item.size}-${item.color}`}
              className="flex gap-4 bg-muted p-4"
            >
              {/* Product Image */}
              <div className="relative w-24 h-32 flex-shrink-0 bg-background overflow-hidden">
                <Image
                  src={item.product.images[0]}
                  alt={item.product.name}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>

              {/* Product Details */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-display uppercase tracking-wider text-accent text-sm">
                      {item.product.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.size} / {item.color}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(index)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label="Remove item"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-4">
                  {/* Quantity Controls */}
                  <div className="flex items-center border border-border">
                    <button
                      onClick={() => updateQuantity(index, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="p-2 hover:bg-background transition-colors disabled:opacity-50"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-4 text-sm font-medium min-w-[2rem] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(index, item.quantity + 1)}
                      className="p-2 hover:bg-background transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Item Total */}
                  <span className="text-accent font-bold">
                    {formatPrice(item.product.price * item.quantity)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Gift Message */}
          <div className="bg-muted p-4">
            <button
              onClick={() => setShowGiftMessage(!showGiftMessage)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-full"
            >
              <Gift className="h-4 w-4" />
              <span>
                {showGiftMessage
                  ? "Remove gift message"
                  : "Add a gift message (free)"}
              </span>
            </button>
            {showGiftMessage && (
              <div className="mt-3">
                <textarea
                  placeholder="Write a personal message to include with this order..."
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value.slice(0, 200))}
                  rows={3}
                  className="w-full bg-background border border-border p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {giftMessage.length}/200
                </p>
              </div>
            )}
          </div>

          {/* Member nudge for guests */}
          {!user && (
            <div className="flex items-start gap-3 bg-accent/5 border border-accent/20 p-4">
              <UserPlus className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-foreground">
                  <Link
                    href="/signup"
                    className="text-accent font-semibold hover:underline"
                  >
                    Join the movement
                  </Link>{" "}
                  or{" "}
                  <Link
                    href="/login?redirect=%2Fcart"
                    className="text-accent font-semibold hover:underline"
                  >
                    sign in
                  </Link>{" "}
                  before checkout.
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  Members get order tracking, exclusive drops, and member-only
                  discount codes. Guest checkout works too.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
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
                      aria-label="Remove discount"
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
                    onKeyDown={(e) => e.key === "Enter" && handleApplyDiscount()}
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

            <Button size="lg" className="w-full" onClick={handleCheckout}>
              <Lock className="mr-2 h-4 w-4" />
              Pay Now
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Free shipping &middot; Secure checkout powered by Stripe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
