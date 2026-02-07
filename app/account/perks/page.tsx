"use client";

import { useState, useEffect } from "react";
import { Gift, Sparkles, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { DiscountCodeCard } from "@/components/account/DiscountCodeCard";
import type { DiscountCode } from "@/lib/supabase/types";
import { products } from "@/lib/data/products";

export default function PerksPage() {
  const { profile } = useAuth();
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPerks() {
      const { data } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("members_only", true);

      if (data) setDiscounts(data as DiscountCode[]);
      setLoading(false);
    }
    loadPerks();
  }, []);

  // Find early access products (future public date)
  const now = new Date();
  const earlyAccessProducts = products.filter(
    (p) => p.earlyAccessUntil && new Date(p.earlyAccessUntil) > now
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted w-48" />
        <div className="h-32 bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-display uppercase tracking-wider text-accent mb-2">
          Member Perks
        </h2>
        <p className="text-sm text-muted-foreground">
          Exclusive benefits for UPL1FT members.
          {profile?.member_since && (
            <> Member since {new Date(profile.member_since).toLocaleDateString("en-US", { month: "long", year: "numeric" })}.</>
          )}
        </p>
      </div>

      {/* Discount Codes */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Gift className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-display uppercase tracking-wider text-accent">
            Your Discount Codes
          </h3>
        </div>

        {discounts.length === 0 ? (
          <div className="bg-muted border border-border p-8 text-center">
            <p className="text-muted-foreground">
              No exclusive codes available right now. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {discounts.map((discount) => (
              <DiscountCodeCard key={discount.id} discount={discount} />
            ))}
          </div>
        )}
      </div>

      {/* Early Access Products */}
      {earlyAccessProducts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-accent" />
            <h3 className="text-lg font-display uppercase tracking-wider text-accent">
              Early Access
            </h3>
          </div>

          <div className="space-y-3">
            {earlyAccessProducts.map((product) => (
              <div
                key={product.id}
                className="bg-muted border border-accent/30 p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-display uppercase tracking-wider text-foreground">
                    {product.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Public release:{" "}
                    {new Date(product.earlyAccessUntil!).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs text-accent bg-accent/10 px-2 py-1">
                  Early Access
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member Benefits List */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-display uppercase tracking-wider text-accent">
            Your Benefits
          </h3>
        </div>

        <div className="space-y-3">
          {[
            "Exclusive member-only discount codes",
            "Early access to new drops before public release",
            "Access to members-only products",
            "Order history and shipment tracking",
            "Saved shipping addresses for faster checkout",
          ].map((benefit) => (
            <div
              key={benefit}
              className="flex items-center gap-3 text-sm text-muted-foreground"
            >
              <div className="w-1.5 h-1.5 bg-accent flex-shrink-0" />
              {benefit}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
