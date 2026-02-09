"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { RefreshCw, ExternalLink, Package, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      if (!token) {
        setError("No tracking token provided.");
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
          <Link href="/shop">
            <Button>Continue Shopping</Button>
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
