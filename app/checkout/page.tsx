"use client";

import { useEffect, useRef, useCallback, useState, startTransition } from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { useCart, type CartItem } from "@/components/cart/CartProvider";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { trackBeginCheckout } from "@/lib/analytics";
import {
  ShoppingBag,
  Lock,
  ChevronLeft,
  AlertTriangle,
  Loader2,
} from "lucide-react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// The discount code is chosen on the cart page and handed over via
// sessionStorage so this page can go straight to payment.
function getCheckoutOpts(): { discountCode?: string } {
  try {
    return JSON.parse(sessionStorage.getItem("upl1ft-checkout-opts") || "{}") || {};
  } catch {
    return {};
  }
}

// A cart line the server refused (sold out, or no longer offered)
interface RefusedLine {
  productId: string;
  size: string;
  color: string;
}

interface CheckoutError {
  message: string;
  lines: RefusedLine[];
  // Stripe itself did not load: only loading the page again can fix that
  reload?: boolean;
}

// How long the payment form may take to appear before the page says so
const FORM_TIMEOUT_MS = 25000;

// The server lists refused lines as `unavailable` (409) or `invalid` (400)
function refusedLines(data: any): RefusedLine[] {
  const lines = data?.unavailable || data?.invalid;
  return Array.isArray(lines)
    ? lines.filter((line) => line && typeof line === "object")
    : [];
}

// Stripe's payment form for one attempt. The two guards are for a customer who leaves
// this page while the form is still loading: the provider would otherwise leave
// behind a checkout object that nothing destroys, and Stripe refuses to make a
// second one when the customer comes back (empty white box until a reload).
function PaymentForm({
  fetchClientSecret,
}: {
  fetchClientSecret: () => Promise<string>;
}) {
  const onScreen = useRef(true);
  useEffect(() => {
    onScreen.current = true;
    return () => {
      onScreen.current = false;
    };
  }, []);

  // 1. Stripe.js is only handed to the provider while the form is on screen
  const [stripe] = useState(() =>
    stripePromise.then((loaded) => (onScreen.current ? loaded : null))
  );

  // 2. Stripe asks for the client secret while it builds the checkout object.
  // Throwing here (not returning a rejected promise) stops the object being built.
  const fetchWhileOnScreen = useCallback(() => {
    if (!onScreen.current) throw new Error("Checkout was closed");
    return fetchClientSecret();
  }, [fetchClientSecret]);

  return (
    <EmbeddedCheckoutProvider
      stripe={stripe}
      options={{ fetchClientSecret: fetchWhileOnScreen }}
    >
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}

export default function CheckoutPage() {
  const { items, cartTotal, hydrated, removeItem } = useCart();
  const tracked = useRef(false);
  const [error, setError] = useState<CheckoutError | null>(null);
  // Key of the payment form: changing it remounts the Stripe provider, which asks
  // for a new session
  const [attempt, setAttempt] = useState(0);
  // Stripe asks for the client secret once, with the function from the form's first
  // render. Reading the cart through a ref gives it the cart as it is at that moment.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  // The payment form is blank until the server has opened a Stripe session. Until
  // then the page shows that it is loading.
  const [sessionReady, setSessionReady] = useState(false);
  // Whether Stripe has asked for the session at all. If it never does, Stripe.js
  // did not load (blocked or unreachable) and the box would stay empty for good.
  const requested = useRef(false);
  const showForm = hydrated && items.length > 0 && !error;

  useEffect(() => {
    if (!showForm) return;
    const timer = window.setTimeout(() => {
      if (!requested.current) {
        setError({
          message:
            "The payment form didn't load. Check your connection, then try again.",
          lines: [],
          reload: true,
        });
      }
    }, FORM_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [showForm, attempt]);

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
    // Show the failure, then throw so Stripe stops waiting for a client secret.
    // Low priority on purpose: the Stripe provider must finish mounting before the
    // error panel replaces it, or its checkout object is never destroyed and
    // "Try Again" could not create a new one.
    const fail = (failure: CheckoutError): never => {
      startTransition(() => setError(failure));
      throw new Error(failure.message);
    };

    requested.current = true;
    const opts = getCheckoutOpts();

    // Ask for the sign-in token now, not at render: after a reload this function
    // runs before the page has restored the session, and getSession waits for it.
    // Without the token a member would be checked out as a guest.
    let accessToken: string | undefined;
    if (supabaseConfigured) {
      try {
        const { data } = await supabase.auth.getSession();
        accessToken = data.session?.access_token;
      } catch {
        accessToken = undefined;
      }
    }

    let response: Response;
    try {
      response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        signal: AbortSignal.timeout(30000),
        // The server takes names, prices and pictures from its own catalog
        body: JSON.stringify({
          items: itemsRef.current.map((item) => ({
            productId: item.product.id,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
          })),
          discountCode: opts.discountCode || undefined,
        }),
      });
    } catch {
      return fail({
        message: "We couldn't reach checkout. Check your connection and try again.",
        lines: [],
      });
    }

    // An error page from the network edge is not JSON
    const data = await response.json().catch(() => null);

    if (!response.ok || typeof data?.clientSecret !== "string") {
      return fail({
        message:
          (typeof data?.error === "string" && data.error) ||
          "Checkout failed. Please try again.",
        lines: refusedLines(data),
      });
    }

    setSessionReady(true);
    return data.clientSecret as string;
  }, []);

  const handleRetry = () => {
    if (error?.reload) {
      window.location.reload();
      return;
    }
    requested.current = false;
    setSessionReady(false);
    setError(null);
    setAttempt((n) => n + 1);
  };

  const isRefused = (item: CartItem) =>
    !!error?.lines.some(
      (line) =>
        line.productId === item.product.id &&
        line.size === item.size &&
        line.color === item.color
    );

  const handleRemoveRefused = () => {
    const indexes = items
      .map((item, index) => (isRefused(item) ? index : -1))
      .filter((index) => index >= 0);
    // Last line first: removing a line shifts the ones after it
    indexes.reverse().forEach((index) => removeItem(index));
    if (indexes.length < items.length) {
      handleRetry();
    } else {
      // Nothing left to pay for; the empty-cart view below takes over
      setError(null);
    }
  };

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

  const refusedItems = items.filter(isRefused);

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
        {error ? (
          <div
            role="alert"
            className="bg-muted border border-border p-6 md:p-8 text-center"
          >
            <AlertTriangle className="h-8 w-8 text-accent mx-auto mb-4" />
            <p className="text-foreground">{error.message}</p>

            {refusedItems.length > 0 && (
              <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                {refusedItems.map((item) => (
                  <li key={`${item.product.id}-${item.size}-${item.color}`}>
                    {item.product.name} ({item.size} / {item.color})
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              {error.lines.length > 0 && (
                <Button size="sm" onClick={handleRemoveRefused}>
                  Remove unavailable items
                </Button>
              )}
              <Button
                size="sm"
                variant={error.lines.length > 0 ? "outline" : "default"}
                onClick={handleRetry}
              >
                Try Again
              </Button>
              <Link href="/cart">
                <Button size="sm" variant="ghost" className="w-full">
                  Back to Cart
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div id="checkout" className="bg-white rounded-lg overflow-hidden">
            {!sessionReady && (
              <div
                role="status"
                className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-neutral-600"
              >
                <Loader2 className="h-6 w-6 animate-spin" />
                Loading secure checkout…
              </div>
            )}
            <PaymentForm key={attempt} fetchClientSecret={fetchClientSecret} />
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-4">
          <Lock className="inline h-3 w-3 mr-1" />
          Secure checkout powered by Stripe
        </p>
      </div>
    </div>
  );
}
