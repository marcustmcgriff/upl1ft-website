"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import type { Order } from "@/lib/supabase/types";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) setOrders(data as Order[]);
      setLoading(false);
    }
    loadOrders();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-display uppercase tracking-wider text-accent">
          Order History
        </h2>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display uppercase tracking-wider text-accent">
        Order History
      </h2>

      {orders.length === 0 ? (
        <div className="bg-muted border border-border p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            You haven&apos;t placed any orders yet.
          </p>
          <Link
            href="/shop"
            className="text-accent hover:underline font-semibold"
          >
            Browse the Collection
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const items = order.items as any[];
            return (
              <Link
                key={order.id}
                href={`/account/orders/detail?id=${order.id}`}
                className="block bg-muted border border-border p-4 hover:border-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={order.status} />
                    <span className="text-sm font-bold text-accent">
                      ${(order.total / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  {items.map((item, i) => (
                    <span key={i}>
                      {item.name} ({item.size})
                      {i < items.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </div>

                {order.tracking_number && (
                  <p className="text-xs text-accent mt-2">
                    Tracking: {order.tracking_number}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
