"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { RefreshCw, ExternalLink, Package, UserPlus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TurnstileWidget } from "@/components/ui/TurnstileWidget";
import { OrderProgressBar } from "@/components/account/OrderProgressBar";
import { useAuth } from "@/components/auth/AuthProvider";

interface TrackingData {
  status: string;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
}

async function fetchTracking(trackingToken: string): Promise<TrackingData | null> {
  const response = await fetch("/api/order-tracking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackingToken }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return {
    status: data.status,
    tracking_number: data.tracking_number,
    tracking_url: data.tracking_url,
    carrier: data.carrier,
  };
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
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "sent">("idle");
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
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                status: data.status || prev.status,
                tracking_number: data.tracking_number || prev.tracking_number,
                tracking_url: data.tracking_url || prev.tracking_url,
                carrier: data.carrier || prev.carrier,
              }
            : data
        );
      }
    } catch {
      // Silently fail — tracking may not be available yet
    }

    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 max-w-2xl mx-auto">
        <div className="h-8 bg-muted w-48" />
        <div className="h-16 bg-muted" />
        <div className="h-40 bg-muted" />
      </div>
    );
  }

  // No token provided — show email lookup form
  if (!token) {
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="text-center mb-8">
          <Package className="h-16 w-16 text-accent mx-auto mb-6" />
          <h1 className="text-2xl font-display uppercase tracking-wider text-accent mb-3">
            Track Your Order
          </h1>
          <p className="text-muted-foreground text-sm">
            Enter the email you used at checkout and we&apos;ll send your tracking links.
          </p>
        </div>

        {lookupStatus === "sent" ? (
          <>
            <div className="bg-accent/5 border border-accent/20 p-6 text-center mb-6">
              <Mail className="h-10 w-10 text-accent mx-auto mb-4" />
              <h2 className="font-display uppercase tracking-wider text-accent text-lg mb-2">
                Check Your Email
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                If we found orders matching that email, we&apos;ve sent tracking links to your inbox.
              </p>
              <button
                onClick={() => { setLookupStatus("idle"); setLookupEmail(""); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Try a different email
              </button>
            </div>

            {/* Signup CTA — shown after email lookup */}
            {!user && (
              <div className="bg-muted border border-border p-6 text-center">
                <UserPlus className="h-8 w-8 text-accent mx-auto mb-3" />
                <h3 className="font-display uppercase tracking-wider text-accent text-sm mb-2">
                  Skip the Email Next Time
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Create a free account to track all orders instantly, get exclusive discounts, and early access to new drops.
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
                {lookupStatus === "loading" ? "Sending..." : "Send Tracking Links"}
              </Button>
            </form>

            {/* Subtle signup hint below form */}
            {!user && (
              <p className="text-center text-xs text-muted-foreground mt-4">
                Have an account?{" "}
                <Link href="/login" className="text-accent hover:underline">
                  Sign in
                </Link>
                {" "}to track all orders instantly.
              </p>
            )}
          </>
        )}

        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row gap-4 justify-center text-center">
          <Link href="/shop">
            <Button variant="ghost" size="sm">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Token provided but order not found
  if (error || !order) {
    return (
      <div className="text-center py-20 max-w-md mx-auto">
        <Package className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
        <h1 className="text-2xl font-display uppercase tracking-wider text-accent mb-4">
          Order Not Found
        </h1>
        <p className="text-muted-foreground mb-8">
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-display uppercase tracking-wider text-accent mb-2">
          Order Status
        </h1>
        <p className="text-muted-foreground text-sm">
          Track your order in real time
        </p>
      </div>

      {/* Status Progress */}
      <div className="bg-muted border border-border p-6">
        <OrderProgressBar status={order.status} />
      </div>

      {/* Tracking Info */}
      <div className="bg-muted border border-border p-4 flex items-center justify-between">
        <div>
          {order.tracking_number ? (
            <div className="space-y-1">
              <p className="text-sm text-foreground">
                <span className="text-muted-foreground">Carrier:</span>{" "}
                {order.carrier || "—"}
              </p>
              <p className="text-sm text-foreground">
                <span className="text-muted-foreground">Tracking:</span>{" "}
                {order.tracking_url ? (
                  <a
                    href={order.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline inline-flex items-center gap-1"
                  >
                    {order.tracking_number}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  order.tracking_number
                )}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tracking info will appear once your order ships.
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshTracking}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Checking..." : "Refresh"}
        </Button>
      </div>

      {/* Guest → Member Prompt */}
      {!user && (
        <div className="bg-accent/5 border border-accent/20 p-6">
          <div className="flex items-start gap-4">
            <UserPlus className="h-6 w-6 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display uppercase tracking-wider text-accent text-sm mb-2">
                Create an Account for Full Order Details
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Sign up to see your complete order history, item details,
                and unlock member-only perks and discount codes.
              </p>
              <Link href="/signup">
                <Button size="sm">Join the Movement</Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* If user is logged in, link to full order history */}
      {user && (
        <div className="text-center">
          <Link href="/account/orders">
            <Button variant="outline">View Full Order History</Button>
          </Link>
        </div>
      )}

      {/* Back to shop */}
      <div className="text-center pt-4">
        <Link
          href="/shop"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

export default function GuestTrackOrderPage() {
  return (
    <div className="container mx-auto px-4 py-20">
      <Suspense
        fallback={
          <div className="animate-pulse space-y-6 max-w-2xl mx-auto">
            <div className="h-8 bg-muted w-48 mx-auto" />
            <div className="h-16 bg-muted" />
            <div className="h-40 bg-muted" />
          </div>
        }
      >
        <GuestTrackingContent />
      </Suspense>
    </div>
  );
}
