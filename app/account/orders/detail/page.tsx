"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  RefreshCw,
  Copy,
  Check,
  Truck,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { OrderTimeline } from "@/components/account/OrderTimeline";
import { ProductRecommendations } from "@/components/product/ProductRecommendations";
import type { Order } from "@/lib/supabase/types";
import { useAuth } from "@/components/auth/AuthProvider";

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

function OrderDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { user, session } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shipDate, setShipDate] = useState<string | null>(null);
  const [estimatedDelivery, setEstimatedDelivery] = useState<string | null>(
    null
  );

  useEffect(() => {
    async function loadOrder() {
      if (!id || !user?.id) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (data) setOrder(data as Order);
      setLoading(false);
    }
    loadOrder();
  }, [id, user?.id]);

  // Auto-fetch tracking details from Printful on mount
  useEffect(() => {
    if (!order || !order.printful_order_id || !session?.access_token) return;

    const fetchTracking = async () => {
      try {
        const response = await fetch("/api/order-tracking", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ orderId: order.id }),
        });

        if (response.ok) {
          const data = await response.json();
          setOrder((prev) =>
            prev
              ? {
                  ...prev,
                  status: data.status || prev.status,
                  tracking_number: data.tracking_number || prev.tracking_number,
                  tracking_url: data.tracking_url || prev.tracking_url,
                  carrier: data.carrier || prev.carrier,
                }
              : null
          );
          if (data.ship_date) setShipDate(data.ship_date);
          if (data.estimated_delivery)
            setEstimatedDelivery(data.estimated_delivery);
        }
      } catch {
        // Silently fail
      }
    };

    fetchTracking();
  }, [order?.id, order?.printful_order_id, session?.access_token]);

  const handleRefreshTracking = async () => {
    if (!order) return;
    setRefreshing(true);

    try {
      const response = await fetch("/api/order-tracking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ orderId: order.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                status: data.status || prev.status,
                tracking_number: data.tracking_number || prev.tracking_number,
                tracking_url: data.tracking_url || prev.tracking_url,
                carrier: data.carrier || prev.carrier,
              }
            : null
        );
        if (data.ship_date) setShipDate(data.ship_date);
        if (data.estimated_delivery)
          setEstimatedDelivery(data.estimated_delivery);
      }
    } catch {
      // Silently fail
    }

    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-6 bg-muted/50 w-32" />
        <div className="space-y-4 text-center">
          <div className="h-8 bg-muted/30 w-56 mx-auto" />
          <div className="h-4 bg-muted/20 w-40 mx-auto" />
        </div>
        <div className="h-48 bg-muted/10 glass-card" />
        <div className="h-32 bg-muted/10 glass-card" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Order not found.</p>
        <Link
          href="/account/orders"
          className="text-accent hover:underline text-sm"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  const items = order.items as any[];
  const address = order.shipping_address as any;
  const purchasedIds = items.map((item: any) => item.productId);
  const hero = statusHero[order.status] || statusHero.confirmed;

  return (
    <div className="space-y-10">
      {/* Back link */}
      <Link
        href="/account/orders"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Orders
      </Link>

      {/* ── Status Hero ── */}
      <div className="text-center fade-in-up">
        <h2 className="font-display uppercase tracking-[0.2em] text-accent text-xl md:text-2xl mb-2">
          {hero.title}
        </h2>
        <p className="text-muted-foreground text-sm mb-3">{hero.subtitle}</p>
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <span>{formatDate(order.created_at)}</span>
          <span className="text-border">·</span>
          <span className="font-mono">
            #{order.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
        {order.shipping_name && (
          <p className="text-muted-foreground text-sm mt-2">
            Shipping to{" "}
            <span className="text-foreground">{order.shipping_name}</span>
          </p>
        )}
        <div className="ornamental-divider mt-6 mx-auto max-w-xs" />
      </div>

      {/* ── Vertical Timeline ── */}
      <div
        className="glass-card-accent p-6 md:p-8 fade-in-up"
        style={{ animationDelay: "0.1s" }}
      >
        <OrderTimeline
          status={order.status}
          createdAt={order.created_at}
          shipDate={shipDate}
          estimatedDelivery={estimatedDelivery}
        />
      </div>

      {/* ── Tracking Card ── */}
      {order.printful_order_id && (
        <div
          className="glass-card p-6 md:p-8 fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display uppercase tracking-[0.15em] text-accent text-xs">
              Shipment Details
            </h3>
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
              <div className="grid grid-cols-2 gap-4">
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

              {(shipDate || estimatedDelivery) && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.04]">
                  {shipDate && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-1.5 uppercase tracking-wider">
                        Ship Date
                      </p>
                      <div className="flex items-center gap-2">
                        <Truck className="h-3.5 w-3.5 text-accent" />
                        <p className="text-foreground text-sm">
                          {formatDate(shipDate)}
                        </p>
                      </div>
                    </div>
                  )}
                  {estimatedDelivery && (
                    <div className="text-right">
                      <p className="text-muted-foreground text-xs mb-1.5 uppercase tracking-wider">
                        Estimated Delivery
                      </p>
                      <div className="flex items-center justify-end gap-2">
                        <Clock className="h-3.5 w-3.5 text-accent" />
                        <p className="text-foreground text-sm">
                          {formatDate(estimatedDelivery)}
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
      )}

      {/* ── Order Items ── */}
      {items.length > 0 && (
        <div
          className="glass-card p-6 md:p-8 fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <h3 className="font-display uppercase tracking-[0.15em] text-accent text-xs mb-6">
            Order Items
          </h3>
          <div className="space-y-5">
            {items.map((item: any, i: number) => (
              <div
                key={`${item.productId}-${item.size}-${i}`}
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
                      sizes="64px"
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
        className="glass-card p-6 md:p-8 fade-in-up"
        style={{ animationDelay: "0.4s" }}
      >
        <h3 className="font-display uppercase tracking-[0.15em] text-accent text-xs mb-6">
          Order Summary
        </h3>
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
              {order.shipping === 0
                ? "Free"
                : formatPrice(order.shipping)}
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

      {/* ── Shipping Address ── */}
      {address && (
        <div
          className="glass-card p-6 md:p-8 fade-in-up"
          style={{ animationDelay: "0.45s" }}
        >
          <h3 className="font-display uppercase tracking-[0.15em] text-accent text-xs mb-4">
            Shipping Address
          </h3>
          <div className="text-sm text-muted-foreground space-y-0.5">
            <p className="text-foreground">{order.shipping_name}</p>
            <p>{address.line1}</p>
            {address.line2 && <p>{address.line2}</p>}
            <p>
              {address.city}, {address.state} {address.postal_code}
            </p>
          </div>
        </div>
      )}

      {/* ── Ornamental Divider ── */}
      <div className="ornamental-divider mx-auto max-w-xs" />

      {/* ── Product Recommendations ── */}
      <div className="fade-in-up" style={{ animationDelay: "0.5s" }}>
        <ProductRecommendations purchasedProductIds={purchasedIds} />
      </div>

      {/* ── Footer Actions ── */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2 pb-4">
        <Link href="/shop">
          <Button variant="ghost" size="sm">
            Continue Shopping
          </Button>
        </Link>
        <Link href="/account/orders">
          <Button variant="outline" size="sm">
            View All Orders
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-8">
          <div className="h-6 bg-muted/50 w-32" />
          <div className="space-y-4 text-center">
            <div className="h-8 bg-muted/30 w-56 mx-auto" />
            <div className="h-4 bg-muted/20 w-40 mx-auto" />
          </div>
          <div className="h-48 bg-muted/10 glass-card" />
          <div className="h-32 bg-muted/10 glass-card" />
        </div>
      }
    >
      <OrderDetailContent />
    </Suspense>
  );
}
