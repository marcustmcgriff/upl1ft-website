"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Product } from "@/lib/types";
import { formatPrice, calculateDiscount } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/CartProvider";
import { useAuth } from "@/components/auth/AuthProvider";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [swiping, setSwiping] = useState(false);
  const { addItem, openDrawer } = useCart();
  const { user } = useAuth();
  const isMembersOnly = product.membersOnly && !user;
  const isEarlyAccess = product.earlyAccessUntil && new Date(product.earlyAccessUntil) > new Date();
  const discount = product.compareAtPrice
    ? calculateDiscount(product.price, product.compareAtPrice)
    : 0;
  const hasMultipleImages = product.images.length > 1;

  const handleQuickAdd = () => {
    const size = selectedSize || product.sizes[0];
    addItem(product, size, product.colors[0]);
    openDrawer();
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!hasMultipleImages) return;
    setTouchStart(e.touches[0].clientX);
    setSwiping(false);
  }, [hasMultipleImages]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStart === null || !hasMultipleImages) return;
    const diff = Math.abs(e.touches[0].clientX - touchStart);
    if (diff > 10) setSwiping(true);
  }, [touchStart, hasMultipleImages]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStart === null || !hasMultipleImages) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentImage < product.images.length - 1) {
        setCurrentImage(currentImage + 1);
      } else if (diff < 0 && currentImage > 0) {
        setCurrentImage(currentImage - 1);
      }
    }
    setTouchStart(null);
    setTimeout(() => setSwiping(false), 0);
  }, [touchStart, currentImage, product.images.length, hasMultipleImages]);

  return (
    <div className="group relative">
      {/* Image Container - Links to product page */}
      <Link
        href={`/shop/${product.slug}`}
        className="block"
        onClick={(e) => { if (swiping) e.preventDefault(); }}
      >
        <div
          className="relative aspect-[3/4] bg-muted overflow-hidden mb-4"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Image
            src={product.images[currentImage]}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={priority}
          />

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {product.membersOnly && (
              <Badge variant="default" className="bg-accent text-accent-foreground">Members Only</Badge>
            )}
            {isEarlyAccess && !product.membersOnly && (
              <Badge variant="default" className="bg-accent text-accent-foreground">Early Access</Badge>
            )}
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

          {/* Image Dot Indicators */}
          {hasMultipleImages && (
            <div className="absolute bottom-14 md:bottom-14 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {product.images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentImage(index);
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    currentImage === index
                      ? "bg-accent w-3"
                      : "bg-white/60"
                  }`}
                  aria-label={`View image ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Quick Add Button - Shown on Hover (desktop) */}
          <div
            className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            onClick={(e) => e.preventDefault()}
          >
            {isMembersOnly ? (
              <Link href="/signup" onClick={(e) => e.stopPropagation()}>
                <Button className="w-full" size="sm" variant="outline">
                  Join to Unlock
                </Button>
              </Link>
            ) : (
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
            )}
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
        {isMembersOnly ? (
          <Link href="/signup">
            <Button className="w-full md:hidden" size="sm" variant="outline">
              Join to Unlock
            </Button>
          </Link>
        ) : (
          <Button
            className="w-full md:hidden"
            size="sm"
            onClick={handleQuickAdd}
            disabled={justAdded}
          >
            {justAdded ? "Added!" : selectedSize ? `Add to Cart — ${selectedSize}` : "Add to Cart"}
          </Button>
        )}
      </div>
    </div>
  );
}
