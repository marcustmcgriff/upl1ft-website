"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/CartProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { products } from "@/lib/data/products";
import type { Product } from "@/lib/types";
import {
  estimatedDeliveryRange,
  formatPrice,
  isPurchasable,
} from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ShoppingBag,
  UserPlus,
  Truck,
} from "lucide-react";
import { trackPurchase } from "@/lib/analytics";

// checking   asking the server what happened to this checkout
// confirmed  paid (or the answer could not be read: Stripe only sends people here
//            after a checkout, so that is treated as paid, as before)
// pending    finished with a payment that clears later (a bank debit)
// open       the payment was declined or abandoned; nothing was charged
// none       opened without a checkout to show
type Outcome = "checking" | "confirmed" | "pending" | "open" | "none";

export default function CheckoutSuccessPage() {
  const { clearCart, hydrated, cartCount } = useCart();
  const { user } = useAuth();
  const [outcome, setOutcome] = useState<Outcome>("checking");
  const [sessionId, setSessionId] = useState<string | null>(null);
  // Filled in after the page loads: both depend on today's date or on chance, which
  // the pre-built page cannot know
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [upsellProducts, setUpsellProducts] = useState<Product[]>([]);

  const clearCartRef = useRef(clearCart);
  clearCartRef.current = clearCart;
  const clearedAt = useRef(0);

  // Ask the server whether this checkout was really paid. Stripe also sends people
  // here after a declined or abandoned Klarna, Affirm, Cash App Pay or Amazon Pay
  // attempt, with the checkout still open.
  useEffect(() => {
    setEstimatedDelivery(estimatedDeliveryRange(new Date()) || "");
    // With a single product on sale the only suggestion would be what was just bought
    const buyable = products.filter(isPurchasable);
    if (buyable.length >= 2) {
      setUpsellProducts(
        [...buyable].sort(() => Math.random() - 0.5).slice(0, 2)
      );
    }

    const id = new URLSearchParams(window.location.search).get("session_id");
    setSessionId(id);
    if (!id) {
      setOutcome("none");
      return;
    }

    let cancelled = false;
    (async () => {
      let status: string | null = null;
      let paymentStatus: string | null = null;
      try {
        const response = await fetch(
          `/api/session-status?session_id=${encodeURIComponent(id)}`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (response.ok) {
          const data = await response.json();
          status = typeof data?.status === "string" ? data.status : null;
          paymentStatus =
            typeof data?.payment_status === "string" ? data.payment_status : null;
        } else if (response.status === 400 || response.status === 404) {
          status = "unknown";
        }
      } catch {
        // Could not ask. Handled below as "confirmed".
      }
      if (cancelled) return;

      if (status === "open" || status === "expired") setOutcome("open");
      else if (status === "unknown") setOutcome("none");
      else if (status === "complete" && paymentStatus === "unpaid")
        setOutcome("pending");
      else setOutcome("confirmed");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Once per order: count the purchase and empty the cart. The marker keeps a later
  // visit to this page (Back button, a restored tab) from emptying a new cart.
  // Waits for the cart to load from localStorage: clearing before that is undone
  // when the saved cart is loaded, and the purchase would come back.
  useEffect(() => {
    if (!hydrated || !sessionId) return;
    if (outcome !== "confirmed" && outcome !== "pending") return;

    const marker = `upl1ft-order-done-${sessionId}`;
    try {
      if (localStorage.getItem(marker)) return;
      localStorage.setItem(marker, String(Date.now()));
    } catch {
      // No storage (private mode): fall through and clear, as the page always did
    }

    if (outcome === "confirmed") {
      try {
        const stored = localStorage.getItem("upl1ft-cart");
        const items: { product: { price: number }; quantity: number }[] = stored
          ? JSON.parse(stored)
          : [];
        const total = items.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0
        );
        const count = items.reduce((sum, item) => sum + item.quantity, 0);
        if (total > 0) trackPurchase(total, count, sessionId);
      } catch {
        // Analytics must never break the confirmation page
      }
    }

    clearedAt.current = Date.now();
    clearCartRef.current();
  }, [hydrated, sessionId, outcome]);

  // A signed-in customer's saved cart (Supabase) can still arrive just after the
  // clear above. It holds what was just bought, so empty it again. Only in the first
  // seconds after this page cleared the cart, never on a later visit.
  useEffect(() => {
    if (
      cartCount > 0 &&
      clearedAt.current > 0 &&
      Date.now() - clearedAt.current < 15000
    ) {
      clearCartRef.current();
    }
  }, [cartCount]);

  if (outcome === "checking") {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
        Confirming your order…
      </div>
    );
  }

  if (outcome === "open") {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto text-center">
          <AlertTriangle className="h-16 w-16 text-accent mx-auto mb-6" />
          <h1 className="text-3xl font-display uppercase tracking-wider text-accent mb-4">
            Payment Not Completed
          </h1>
          <p className="text-foreground/90 mb-2">
            Your payment didn&apos;t go through, so no order was placed and
            you have not been charged.
          </p>
          <p className="text-muted-foreground mb-8">
            Your cart is still saved. You can try again or choose another way
            to pay.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/checkout">
              <Button size="lg">Return to Checkout</Button>
            </Link>
            <Link href="/cart">
              <Button variant="outline" size="lg">
                View Cart
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (outcome === "none") {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-3xl font-display uppercase tracking-wider text-accent mb-4">
            No Order To Show
          </h1>
          <p className="text-muted-foreground mb-8">
            If you just placed an order, your confirmation email has the
            details and a link to track it.
          </p>
          <Link href="/shop">
            <Button size="lg">Shop Now</Button>
          </Link>
        </div>
      </div>
    );
  }

  const pending = outcome === "pending";

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-2xl mx-auto">
        {/* Confirmation Header */}
        <div className="text-center mb-10">
          {pending ? (
            <Clock className="h-20 w-20 text-accent mx-auto mb-6" />
          ) : (
            <CheckCircle className="h-20 w-20 text-accent mx-auto mb-6" />
          )}

          <h1 className="text-3xl md:text-4xl font-display uppercase tracking-wider text-accent gold-glow mb-4">
            {pending ? "Order Received" : "Order Confirmed"}
          </h1>

          <p className="text-foreground/90 mb-2 text-lg">
            Thank you for your purchase.
          </p>
          <p className="text-muted-foreground">
            {pending
              ? "Your bank is still confirming the payment. We'll email your order confirmation as soon as it clears."
              : "You'll receive a confirmation email with tracking information."}
          </p>
        </div>

        {/* Estimated Delivery */}
        {!pending && (
          <div className="flex items-center gap-3 bg-accent/5 border border-accent/20 p-4 mb-6">
            <Truck className="h-5 w-5 text-accent flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Estimated delivery: {estimatedDelivery || "5–10 business days"}
              </p>
              <p className="text-xs text-muted-foreground">
                Free shipping — tracking will be emailed when your order ships
              </p>
            </div>
          </div>
        )}

        {/* What Happens Next */}
        <div className="bg-muted p-6 mb-8 text-left space-y-3">
          <h2 className="font-display uppercase tracking-wider text-accent text-sm">
            What Happens Next
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>1. Your order is sent to our fulfillment center</li>
            <li>2. Your items are printed and quality-checked</li>
            <li>3. Your package is shipped with tracking</li>
            <li>4. You receive your gear and walk in purpose</li>
          </ul>
        </div>

        {/* Guest → Member Prompt */}
        {!user && (
          <div className="bg-accent/5 border border-accent/20 p-6 mb-8">
            <div className="flex items-start gap-4">
              <UserPlus className="h-6 w-6 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display uppercase tracking-wider text-accent text-sm mb-2">
                  Track This Order & Get Member Perks
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a free account to track your order, access exclusive
                  drops, and unlock member-only discount codes.
                </p>
                <Link href="/signup">
                  <Button size="sm">
                    Join the Movement
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link href="/shop">
            <Button size="lg">Continue Shopping</Button>
          </Link>
          {user ? (
            <Link href="/account/orders">
              <Button variant="outline" size="lg">
                View Your Orders
              </Button>
            </Link>
          ) : (
            <Link href="/">
              <Button variant="outline" size="lg">
                Back to Home
              </Button>
            </Link>
          )}
        </div>

        {/* Upsell Section */}
        {upsellProducts.length > 0 && (
          <div>
            <h2 className="text-xl font-display uppercase tracking-wider text-accent text-center mb-6">
              Complete the Look
            </h2>
            <div
              className={
                upsellProducts.length > 1
                  ? "grid grid-cols-2 gap-4"
                  : "grid w-1/2 mx-auto"
              }
            >
              {upsellProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/shop/${product.slug}`}
                  className="group"
                >
                  <div className="relative aspect-[3/4] bg-muted overflow-hidden mb-3">
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 50vw, 300px"
                    />
                  </div>
                  <h3 className="font-display uppercase tracking-wider text-accent text-xs mb-1">
                    {product.name}
                  </h3>
                  <p className="text-sm text-foreground">
                    {formatPrice(product.price)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
