"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  RefreshCw,
  Package,
  UserPlus,
  Mail,
  Copy,
  Check,
  Truck,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TurnstileWidget } from "@/components/ui/TurnstileWidget";
import { OrderTimeline } from "@/components/account/OrderTimeline";
import { ProductRecommendations } from "@/components/product/ProductRecommendations";
import { useAuth } from "@/components/auth/AuthProvider";

interface OrderItem {
  productId: string;
  name: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  image: string;
}

interface TrackingData {
  status: string;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  ship_date: string | null;
  estimated_delivery: string | null;
  items: OrderItem[];
  created_at: string;
  shipping_name: string;
  total: number;
  subtotal: number;
  shipping: number;
  discount_amount: number;
  discount_code: string | null;
}

const statusHero: Record<string, { title: string; subtitle: string }> = {
  confirmed: {
    title: "Order Confirmed",
    subtitle: "We've received your order and it's being prepared.",
  },
  processing: {
    title: "Crafting Your Gear",
    subtitle: "Our team is preparing your items with care.",
  },
  shipped: {
    title: "On Its Way",
    subtitle: "Your order is heading to you.",
  },
  delivered: {
    title: "Delivered",
    subtitle: "Your order has arrived. Wear it with purpose.",
  },
  cancelled: {
    title: "Order Cancelled",
    subtitle: "This order has been cancelled.",
  },
};

async function fetchTracking(
  trackingToken: string
): Promise<TrackingData | null> {
  const response = await fetch("/api/order-tracking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackingToken }),
  });
  if (!response.ok) return null;
  return response.json();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-muted-foreground hover:text-accent transition-colors p-1"
      title="Copy tracking number"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-accent" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function GuestTrackingContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { user } = useAuth();
  const [order, setOrder] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(!!token);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupStatus, setLookupStatus] = useState<
    "idle" | "loading" | "sent"
  >("idle");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await fetchTracking(token);
        if (!data) {
          setError("Order not found. Please check your tracking link.");
        } else {
          setOrder(data);
        }
      } catch {
        setError("Something went wrong. Please try again.");
      }

      setLoading(false);
    }
    loadOrder();
  }, [token]);

  const handleEmailLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupStatus("loading");

    try {
      await fetch("/api/resend-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: lookupEmail, turnstileToken }),
      });
    } catch {
      // Always show success to prevent email enumeration
    }

    setLookupStatus("sent");
  };

  const handleRefreshTracking = async () => {
    if (!token) return;
    setRefreshing(true);

    try {
      const data = await fetchTracking(token);
      if (data) {
        setOrder(data);
      }
    } catch {
      // Silently fail — tracking may not be available yet
    }

    setRefreshing(false);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="animate-pulse max-w-2xl mx-auto space-y-10">
        <div className="space-y-4 text-center">
          <div className="h-10 bg-muted/30 w-64 mx-auto" />
          <div className="h-4 bg-muted/20 w-48 mx-auto" />
          <div className="h-3 bg-muted/20 w-36 mx-auto" />
        </div>
        <div className="h-px bg-muted/20 max-w-xs mx-auto" />
        <div className="h-48 bg-muted/10 glass-card" />
        <div className="h-32 bg-muted/10 glass-card" />
        <div className="h-48 bg-muted/10 glass-card" />
      </div>
    );
  }

  // ─── No token: email lookup form ───
  if (!token) {
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="text-center mb-8">
          <Package className="h-16 w-16 text-accent mx-auto mb-6" />
          <h1 className="text-3xl font-display uppercase tracking-wider text-accent mb-3">
            Track Your Order
          </h1>
          <p className="text-muted-foreground text-base">
            Enter the email you used at checkout and we&apos;ll send your
            tracking links.
          </p>
        </div>

        {lookupStatus === "sent" ? (
          <>
            <div className="bg-accent/5 border border-accent/20 p-6 text-center mb-6 fade-in-up">
              <Mail className="h-10 w-10 text-accent mx-auto mb-4" />
              <h2 className="font-display uppercase tracking-wider text-accent text-xl mb-2">
                Check Your Email
              </h2>
              <p className="text-muted-foreground text-base mb-6">
                If we found orders matching that email, we&apos;ve sent tracking
                links to your inbox.
              </p>
              <button
                onClick={() => {
                  setLookupStatus("idle");
                  setLookupEmail("");
                }}
                className="text-base text-muted-foreground hover:text-foreground transition-colors"
              >
                Try a different email
              </button>
            </div>

            {!user && (
              <div className="bg-muted border border-border p-6 text-center fade-in-up">
                <UserPlus className="h-8 w-8 text-accent mx-auto mb-3" />
                <h3 className="font-display uppercase tracking-wider text-accent text-base mb-2">
                  Skip the Email Next Time
                </h3>
                <p className="text-muted-foreground text-base mb-4">
                  Create a free account to track all orders instantly, get
                  exclusive discounts, and early access to new drops.
                </p>
                <Link href="/signup">
                  <Button size="sm">Create Free Account</Button>
                </Link>
              </div>
            )}
          </>
        ) : (
          <>
            <form onSubmit={handleEmailLookup} className="space-y-4">
              <Input
                type="email"
                placeholder="your@email.com"
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
                required
                disabled={lookupStatus === "loading"}
                className="w-full"
              />
              <TurnstileWidget
                onToken={setTurnstileToken}
                onExpire={() => setTurnstileToken(null)}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={lookupStatus === "loading" || !turnstileToken}
              >
                {lookupStatus === "loading"
                  ? "Sending..."
                  : "Send Tracking Links"}
              </Button>
            </form>

            {!user && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Have an account?{" "}
                <Link
                  href="/login"
                  className="text-accent hover:underline"
                >
                  Sign in
                </Link>{" "}
                to track all orders instantly.
              </p>
            )}
          </>
        )}

        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row gap-4 justify-center text-center">
          <Link href="/shop">
            <Button variant="ghost" size="sm">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ─── Token provided but order not found ───
  if (error || !order) {
    return (
      <div className="text-center py-20 max-w-md mx-auto">
        <Package className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
        <h1 className="text-3xl font-display uppercase tracking-wider text-accent mb-4">
          Order Not Found
        </h1>
        <p className="text-muted-foreground text-base mb-8">
          {error || "We couldn't find an order with that tracking link."}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/orders/track">
            <Button>Try Email Lookup</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline">Sign In to View Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ─── Full tracking detail view ───
  const purchasedIds = order.items.map((item) => item.productId);
  const hero = statusHero[order.status] || statusHero.confirmed;

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      {/* ── Status Hero ── */}
      <div className="text-center fade-in-up">
        <h1 className="font-display uppercase tracking-[0.2em] text-accent text-2xl md:text-3xl mb-3">
          {hero.title}
        </h1>
        <p className="text-muted-foreground text-base mb-4">
          {hero.subtitle}
        </p>
        <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
          {order.created_at && <span>{formatDate(order.created_at)}</span>}
          {order.shipping_name && (
            <>
              <span className="text-border">·</span>
              <span>
                Shipping to{" "}
                <span className="text-foreground">{order.shipping_name}</span>
              </span>
            </>
          )}
        </div>
        <div className="ornamental-divider mt-8 mx-auto max-w-xs" />
      </div>

      {/* ── Vertical Timeline ── */}
      <div
        className="glass-card-accent p-8 fade-in-up"
        style={{ animationDelay: "0.1s" }}
      >
        <OrderTimeline
          status={order.status}
          createdAt={order.created_at}
          shipDate={order.ship_date}
          estimatedDelivery={order.estimated_delivery}
        />
      </div>

      {/* ── Tracking Card ── */}
      <div
        className="glass-card p-8 fade-in-up"
        style={{ animationDelay: "0.2s" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display uppercase tracking-[0.15em] text-accent text-xs">
            Shipment Details
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshTracking}
            disabled={refreshing}
            className="gap-2 text-xs h-8"
          >
            <RefreshCw
              className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Checking..." : "Refresh"}
          </Button>
        </div>

        {order.tracking_number ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-muted-foreground text-xs mb-1.5 uppercase tracking-wider">
                  Carrier
                </p>
                <p className="text-foreground text-sm font-medium">
                  {order.carrier || "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-xs mb-1.5 uppercase tracking-wider">
                  Tracking Number
                </p>
                <div className="flex items-center justify-end gap-1.5">
                  <p className="text-accent text-sm font-mono">
                    {order.tracking_number}
                  </p>
                  <CopyButton text={order.tracking_number} />
                </div>
              </div>
            </div>

            {(order.ship_date || order.estimated_delivery) && (
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/[0.04]">
                {order.ship_date && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1.5 uppercase tracking-wider">
                      Ship Date
                    </p>
                    <div className="flex items-center gap-2">
                      <Truck className="h-3.5 w-3.5 text-accent" />
                      <p className="text-foreground text-sm">
                        {formatDate(order.ship_date)}
                      </p>
                    </div>
                  </div>
                )}
                {order.estimated_delivery && (
                  <div className="text-right">
                    <p className="text-muted-foreground text-xs mb-1.5 uppercase tracking-wider">
                      Estimated Delivery
                    </p>
                    <div className="flex items-center justify-end gap-2">
                      <Clock className="h-3.5 w-3.5 text-accent" />
                      <p className="text-foreground text-sm">
                        {formatDate(order.estimated_delivery)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 py-3">
            <div className="pulse-dot" />
            <p className="text-muted-foreground text-sm">
              Tracking info will appear once your order ships.
            </p>
          </div>
        )}
      </div>

      {/* ── Order Items ── */}
      {order.items && order.items.length > 0 && (
        <div
          className="glass-card p-8 fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <h2 className="font-display uppercase tracking-[0.15em] text-accent text-xs mb-6">
            Order Items
          </h2>
          <div className="space-y-5">
            {order.items.map((item, idx) => (
              <div
                key={`${item.productId}-${item.size}-${idx}`}
                className="flex gap-4"
              >
                {item.image && (
                  <div className="w-16 h-16 bg-background border border-white/[0.04] flex-shrink-0 overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">
                    {item.name}
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {item.size} / {item.color}
                    {item.quantity > 1 && ` × ${item.quantity}`}
                  </p>
                </div>
                <p className="text-foreground text-sm font-medium flex-shrink-0 tabular-nums">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Order Summary ── */}
      <div
        className="glass-card p-8 fade-in-up"
        style={{ animationDelay: "0.4s" }}
      >
        <h2 className="font-display uppercase tracking-[0.15em] text-accent text-xs mb-6">
          Order Summary
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground tabular-nums">
              {formatPrice(order.subtotal)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span className="text-foreground tabular-nums">
              {order.shipping === 0 ? "Free" : formatPrice(order.shipping)}
            </span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Discount
                {order.discount_code && (
                  <span className="text-accent/60 ml-1.5">
                    ({order.discount_code})
                  </span>
                )}
              </span>
              <span className="text-accent tabular-nums">
                −{formatPrice(order.discount_amount)}
              </span>
            </div>
          )}
          <div className="flex justify-between pt-4 border-t border-white/[0.04]">
            <span className="text-foreground font-medium">Total</span>
            <span className="text-foreground font-bold text-lg tabular-nums">
              {formatPrice(order.total)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Ornamental Divider ── */}
      <div className="ornamental-divider mx-auto max-w-xs" />

      {/* ── Product Recommendations ── */}
      <div className="fade-in-up" style={{ animationDelay: "0.5s" }}>
        <ProductRecommendations purchasedProductIds={purchasedIds} />
      </div>

      {/* ── Guest Signup CTA ── */}
      {!user && (
        <div
          className="glass-card-accent p-8 fade-in-up"
          style={{ animationDelay: "0.6s" }}
        >
          <div className="flex items-start gap-5">
            <UserPlus className="h-6 w-6 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display uppercase tracking-[0.15em] text-accent text-xs mb-2">
                Create an Account for Full Order Details
              </h3>
              <p className="text-sm text-muted-foreground mb-5">
                Sign up to see your complete order history, item details, and
                unlock member-only perks and discount codes.
              </p>
              <Link href="/signup">
                <Button size="sm">Join the Movement</Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer Actions ── */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2 pb-8">
        <Link href="/shop">
          <Button variant="ghost" size="sm">
            Continue Shopping
          </Button>
        </Link>
        {user && (
          <Link href="/account/orders">
            <Button variant="outline" size="sm">
              View Order History
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

export default function GuestTrackOrderPage() {
  return (
    <div className="container mx-auto px-4 py-20">
      <Suspense
        fallback={
          <div className="animate-pulse max-w-2xl mx-auto space-y-10">
            <div className="space-y-4 text-center">
              <div className="h-10 bg-muted/30 w-64 mx-auto" />
              <div className="h-4 bg-muted/20 w-48 mx-auto" />
            </div>
            <div className="h-px bg-muted/20 max-w-xs mx-auto" />
            <div className="h-48 bg-muted/10 glass-card" />
            <div className="h-32 bg-muted/10 glass-card" />
          </div>
        }
      >
        <GuestTrackingContent />
      </Suspense>
    </div>
  );
}
