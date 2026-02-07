"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, Gift, Calendar } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import type { Order } from "@/lib/supabase/types";

export default function AccountDashboard() {
  const { profile } = useAuth();
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    async function loadData() {
      // Get recent orders
      const { data: orders, count } = await supabase
        .from("orders")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(3);

      if (orders) setRecentOrders(orders as Order[]);
      if (count !== null) setOrderCount(count);
    }
    loadData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-xl font-display uppercase tracking-wider text-accent">
          Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your faith, your gear, your journey.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-muted border border-border p-4">
          <Package className="h-5 w-5 text-accent mb-2" />
          <p className="text-2xl font-bold text-foreground">{orderCount}</p>
          <p className="text-xs text-muted-foreground">Total Orders</p>
        </div>
        <div className="bg-muted border border-border p-4">
          <Calendar className="h-5 w-5 text-accent mb-2" />
          <p className="text-sm font-bold text-foreground">
            {profile?.member_since
              ? new Date(profile.member_since).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })
              : "—"}
          </p>
          <p className="text-xs text-muted-foreground">Member Since</p>
        </div>
        <div className="bg-muted border border-border p-4">
          <Gift className="h-5 w-5 text-accent mb-2" />
          <Link
            href="/account/perks"
            className="text-sm font-bold text-accent hover:underline"
          >
            View Perks
          </Link>
          <p className="text-xs text-muted-foreground">Member Benefits</p>
        </div>
      </div>

      {/* Recent Orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display uppercase tracking-wider text-accent">
            Recent Orders
          </h3>
          {orderCount > 3 && (
            <Link
              href="/account/orders"
              className="text-sm text-muted-foreground hover:text-accent transition-colors"
            >
              View All
            </Link>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <div className="bg-muted border border-border p-8 text-center">
            <p className="text-muted-foreground">No orders yet.</p>
            <Link
              href="/shop"
              className="text-accent hover:underline text-sm mt-2 inline-block"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/account/orders/detail?id=${order.id}`}
                className="flex items-center justify-between bg-muted border border-border p-4 hover:border-accent/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {(order.items as any[]).length} item
                    {(order.items as any[]).length !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <OrderStatusBadge status={order.status} />
                  <span className="text-sm font-semibold text-accent">
                    ${(order.total / 100).toFixed(2)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
