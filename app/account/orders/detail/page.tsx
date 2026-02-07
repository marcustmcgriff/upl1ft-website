"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { OrderProgressBar } from "@/components/account/OrderProgressBar";
import type { Order } from "@/lib/supabase/types";
import { useAuth } from "@/components/auth/AuthProvider";

function OrderDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { session } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    async function loadOrder() {
      if (!id) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single();

      if (data) setOrder(data as Order);
      setLoading(false);
    }
    loadOrder();
  }, [id]);

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
      }
    } catch {
      // Silently fail — tracking may not be available yet
    }

    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted w-48" />
        <div className="h-16 bg-muted" />
        <div className="h-40 bg-muted" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Order not found.</p>
        <Link href="/account/orders" className="text-accent hover:underline text-sm">
          Back to Orders
        </Link>
      </div>
    );
  }

  const items = order.items as any[];
  const address = order.shipping_address as any;

  return (
    <div className="space-y-6">
      <Link
        href="/account/orders"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Orders
      </Link>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display uppercase tracking-wider text-accent">
          Order #{order.id.slice(0, 8).toUpperCase()}
        </h2>
        <span className="text-sm text-muted-foreground">
          {new Date(order.created_at).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>

      {/* Status Progress */}
      <div className="bg-muted border border-border p-6">
        <OrderProgressBar status={order.status} />
      </div>

      {/* Tracking */}
      {order.printful_order_id && (
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
      )}

      {/* Items */}
      <div className="space-y-3">
        <h3 className="text-sm font-display uppercase tracking-wider text-accent">
          Items
        </h3>
        {items.map((item, i) => (
          <div key={i} className="flex gap-4 bg-muted border border-border p-4">
            {item.image && (
              <div className="relative w-16 h-20 flex-shrink-0 bg-background overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-display uppercase tracking-wider text-foreground">
                {item.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {item.size} / {item.color} &times; {item.quantity}
              </p>
            </div>
            <span className="text-sm font-semibold text-foreground">
              ${((item.price * item.quantity) / 100).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-muted border border-border p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>${(order.subtotal / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Shipping</span>
          <span>{order.shipping === 0 ? "Free" : `$${(order.shipping / 100).toFixed(2)}`}</span>
        </div>
        {order.discount_amount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Discount{order.discount_code ? ` (${order.discount_code})` : ""}
            </span>
            <span className="text-green-500">
              -${(order.discount_amount / 100).toFixed(2)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
          <span>Total</span>
          <span className="text-accent">${(order.total / 100).toFixed(2)}</span>
        </div>
      </div>

      {/* Shipping Address */}
      {address && (
        <div className="bg-muted border border-border p-4">
          <h3 className="text-sm font-display uppercase tracking-wider text-accent mb-2">
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
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted w-48" />
          <div className="h-16 bg-muted" />
          <div className="h-40 bg-muted" />
        </div>
      }
    >
      <OrderDetailContent />
    </Suspense>
  );
}
