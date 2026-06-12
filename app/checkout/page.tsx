"use client";

import { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/CartProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { trackBeginCheckout } from "@/lib/analytics";
import { ShoppingBag, Lock, ChevronLeft } from "lucide-react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// Discount code and gift message are chosen on the cart page and handed
// over via sessionStorage so this page can go straight to payment.
function getCheckoutOpts(): { discountCode?: string; giftMessage?: string } {
  try {
    return JSON.parse(sessionStorage.getItem("upl1ft-checkout-opts") || "{}");
  } catch {
    return {};
  }
}

export default function CheckoutPage() {
  const { items, cartTotal, hydrated } = useCart();
  const { session } = useAuth();
  const tracked = useRef(false);

  useEffect(() => {
    if (hydrated && items.length > 0 && !tracked.current) {
      tracked.current = true;
      trackBeginCheckout(
        cartTotal,
        items.reduce((sum, item) => sum + item.quantity, 0)
      );
    }
  }, [hydrated, items, cartTotal]);

  const fetchClientSecret = useCallback(async () => {
    const opts = getCheckoutOpts();
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
        discountCode: opts.discountCode || undefined,
        giftMessage: opts.giftMessage?.trim() || undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Checkout failed");
    }

    return data.clientSecret;
  }, [items, session?.access_token]);

  // Wait for the cart to load before deciding anything
  if (!hydrated) {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
        Loading…
      </div>
    );
  }

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
        Payment
      </h1>

      <div className="max-w-3xl mx-auto">
        <div id="checkout" className="bg-white rounded-lg overflow-hidden">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ fetchClientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          <Lock className="inline h-3 w-3 mr-1" />
          Secure checkout powered by Stripe
        </p>
      </div>
    </div>
  );
}
