"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Product } from "@/lib/types";
import { formatPrice, calculateDiscount } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/CartProvider";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const { addItem, setToast } = useCart();
  const discount = product.compareAtPrice
    ? calculateDiscount(product.price, product.compareAtPrice)
    : 0;

  const handleQuickAdd = () => {
    const size = selectedSize || product.sizes[0];
    addItem(product, size, product.colors[0]);
    setToast({ product, size });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <div className="group relative">
      {/* Image Container - Links to product page */}
      <Link href={`/shop/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] bg-muted overflow-hidden mb-4">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={priority}
          />

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {product.bestseller && (
              <Badge variant="default">Bestseller</Badge>
            )}
            {discount > 0 && (
              <Badge variant="destructive">-{discount}%</Badge>
            )}
            {product.featured && !product.bestseller && (
              <Badge variant="outline">Featured</Badge>
            )}
          </div>

          {/* Quick Add Button - Shown on Hover (desktop) */}
          <div
            className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            onClick={(e) => e.preventDefault()}
          >
            <Button
              className="w-full"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                handleQuickAdd();
              }}
              disabled={justAdded}
            >
              {justAdded ? "Added!" : selectedSize ? `Quick Add — ${selectedSize}` : "Quick Add"}
            </Button>
          </div>
        </div>

        {/* Product Name - Links to product page */}
        <h3 className="font-display text-sm uppercase tracking-wider text-foreground group-hover:text-accent transition-colors">
          {product.name}
        </h3>
      </Link>

      {/* Price + Sizes - Outside the link for interactivity */}
      <div className="space-y-2 mt-2">
        <div className="flex items-center gap-2">
          <span className="text-accent font-semibold">
            {formatPrice(product.price)}
          </span>
          {product.compareAtPrice && (
            <span className="text-muted-foreground text-sm line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </div>

        {/* Selectable Sizes */}
        <div className="flex gap-1 flex-wrap">
          {product.sizes.slice(0, 5).map((size) => (
            <button
              key={size}
              onClick={() => setSelectedSize(size)}
              className={`text-xs border px-2 py-0.5 transition-colors cursor-pointer ${
                selectedSize === size
                  ? "border-accent text-accent bg-accent/10"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {size}
            </button>
          ))}
        </div>

        {/* Mobile Quick Add - Always visible on mobile */}
        <Button
          className="w-full md:hidden"
          size="sm"
          onClick={handleQuickAdd}
          disabled={justAdded}
        >
          {justAdded ? "Added!" : selectedSize ? `Add to Cart — ${selectedSize}` : "Add to Cart"}
        </Button>
      </div>
    </div>
  );
}
