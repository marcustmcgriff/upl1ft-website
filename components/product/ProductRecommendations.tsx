"use client";

import { products } from "@/lib/data/products";
import { ProductCard } from "./ProductCard";

interface ProductRecommendationsProps {
  purchasedProductIds: string[];
}

export function ProductRecommendations({ purchasedProductIds }: ProductRecommendationsProps) {
  // Filter out products the customer already purchased
  let recommended = products.filter(
    (p) => !purchasedProductIds.includes(p.id) && p.inStock
  );

  // Fallback: if they bought everything, show bestsellers
  if (recommended.length === 0) {
    recommended = products.filter((p) => p.bestseller && p.inStock);
  }

  if (recommended.length === 0) return null;

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="font-display uppercase tracking-[0.15em] text-accent text-xl mb-2">
          Continue Your Journey
        </h2>
        <p className="text-muted-foreground text-sm">
          More designs to fuel your faith
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommended.slice(0, 3).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
