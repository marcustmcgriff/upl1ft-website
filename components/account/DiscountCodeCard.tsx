"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import type { DiscountCode } from "@/lib/supabase/types";

export function DiscountCodeCard({ discount }: { discount: DiscountCode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(discount.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const valueDisplay =
    discount.discount_type === "percentage"
      ? `${discount.discount_value}% off`
      : `$${(discount.discount_value / 100).toFixed(2)} off`;

  return (
    <div className="bg-muted border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-lg text-accent font-bold tracking-wider">
          {discount.code}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
      </div>

      <p className="text-sm text-foreground font-semibold">{valueDisplay}</p>

      {discount.description && (
        <p className="text-xs text-muted-foreground mt-1">
          {discount.description}
        </p>
      )}

      {discount.min_order_amount > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          Min. order: ${(discount.min_order_amount / 100).toFixed(2)}
        </p>
      )}

      {discount.expires_at && (
        <p className="text-xs text-muted-foreground mt-1">
          Expires: {new Date(discount.expires_at).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
