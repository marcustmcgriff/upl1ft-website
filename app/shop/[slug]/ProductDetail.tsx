"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, calculateDiscount, isPurchasable } from "@/lib/utils";
import { ShoppingBag, ChevronLeft, ChevronRight, Check, Lock } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { trackAddToCart } from "@/lib/analytics";

// Answer of /api/stock: color -> size -> can be ordered. null = stock unknown.
type Stock = Record<string, Record<string, boolean>> | null;

// With a stock answer for the color, only sizes marked true can be ordered.
// Without one (stock unknown) nothing is sold out; checkout does the final check.
function soldOut(stock: Stock, color: string, size: string): boolean {
  const byColor = stock?.[color];
  if (!byColor) return false;
  return byColor[size] !== true;
}

export function ProductDetail({ product }: { product: Product }) {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>(
    product.colors[0] || ""
  );
  const [selectedImage, setSelectedImage] = useState(0);
  const [showStory, setShowStory] = useState(false);
  const [added, setAdded] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const { addItem, openDrawer } = useCart();
  const { user } = useAuth();
  const isMembersOnly = product.membersOnly && !user;
  const purchasable = isPurchasable(product);

  // Images shown for the currently-selected color (falls back to the default set)
  const displayImages = product.colorImages?.[selectedColor] ?? product.images;
  const hasMultipleImages = displayImages.length > 1;

  const discount = product.compareAtPrice
    ? calculateDiscount(product.price, product.compareAtPrice)
    : 0;

  // Live per-color/size availability from Printify (null = unknown, keep everything enabled)
  const [stock, setStock] = useState<Stock>(null);
  useEffect(() => {
    if (!purchasable) return; // nothing to order yet, so nothing to check
    let cancelled = false;
    fetch(`/api/stock?product=${product.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.colors) setStock(data.colors);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [product.id, purchasable]);

  const isSoldOut = (size: string) => soldOut(stock, selectedColor, size);

  // Drop a chosen size that turns out to be sold out (e.g. picked before the
  // stock answer arrived)
  useEffect(() => {
    if (selectedSize && soldOut(stock, selectedColor, selectedSize)) {
      setSelectedSize("");
    }
  }, [stock, selectedColor, selectedSize]);

  const selectColor = (color: string) => {
    setSelectedColor(color);
    setSelectedImage(0); // reset to the first photo of the newly-selected color
    if (selectedSize && soldOut(stock, color, selectedSize)) setSelectedSize("");
  };

  const handleAddToCart = () => {
    if (!purchasable) return;
    if (!selectedSize) {
      alert("Please select a size");
      return;
    }
    if (isSoldOut(selectedSize)) {
      setSelectedSize("");
      return;
    }
    addItem(product, selectedSize, selectedColor);
    trackAddToCart(product.name, product.id, product.price);
    openDrawer();
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <Link
        href="/shop"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Shop
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-4">
          <div
            className="relative aspect-[3/4] bg-muted overflow-hidden"
            onTouchStart={(e) => {
              if (hasMultipleImages) setTouchStart(e.touches[0].clientX);
            }}
            onTouchEnd={(e) => {
              if (touchStart === null || !hasMultipleImages) return;
              const diff = touchStart - e.changedTouches[0].clientX;
              if (Math.abs(diff) > 50) {
                if (diff > 0 && selectedImage < displayImages.length - 1) {
                  setSelectedImage(selectedImage + 1);
                } else if (diff < 0 && selectedImage > 0) {
                  setSelectedImage(selectedImage - 1);
                }
              }
              setTouchStart(null);
            }}
          >
            <Image
              src={displayImages[selectedImage]}
              alt={`${product.name} — ${selectedColor}`}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {product.bestseller && <Badge>Bestseller</Badge>}
              {discount > 0 && <Badge variant="destructive">-{discount}%</Badge>}
            </div>

            {/* Arrow Navigation */}
            {hasMultipleImages && (
              <>
                {selectedImage > 0 && (
                  <button
                    onClick={() => setSelectedImage(selectedImage - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors z-10"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                {selectedImage < displayImages.length - 1 && (
                  <button
                    onClick={() => setSelectedImage(selectedImage + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors z-10"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}

                {/* Dot Indicators */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {displayImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        selectedImage === index
                          ? "bg-accent w-4"
                          : "bg-white/60"
                      }`}
                      aria-label={`View image ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {displayImages.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {displayImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative aspect-square bg-muted overflow-hidden ${
                    selectedImage === index ? "ring-2 ring-accent" : ""
                  }`}
                >
                  <Image
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 25vw, 12vw"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-display uppercase tracking-wider text-accent gold-glow mb-2">
              {product.name}
            </h1>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl font-bold text-accent">
                {formatPrice(product.price)}
              </span>
              {product.compareAtPrice && (
                <span className="text-xl text-muted-foreground line-through">
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
            </div>
            <p className="text-foreground/90 leading-relaxed">
              {product.description}
            </p>
          </div>

          {product.colors.length > 0 && (
            <div>
              <label className="block text-sm uppercase tracking-wider text-foreground mb-2">
                Color: <span className="text-accent">{selectedColor}</span>
              </label>
              <div className="flex gap-2">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => selectColor(color)}
                    className={`px-4 py-2 border ${
                      selectedColor === color
                        ? "border-accent bg-accent/10"
                        : "border-accent/50 hover:border-accent"
                    } transition-colors text-sm`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Coming Soon products have no sizes to pick yet */}
          {!product.comingSoon && (
            <div>
              <label className="block text-sm uppercase tracking-wider text-foreground mb-2">
                Size: {selectedSize && <span className="text-accent">{selectedSize}</span>}
              </label>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => {
                  const sizeSoldOut = isSoldOut(size);
                  return (
                    <button
                      key={size}
                      onClick={() => !sizeSoldOut && setSelectedSize(size)}
                      disabled={sizeSoldOut}
                      aria-disabled={sizeSoldOut}
                      title={sizeSoldOut ? "Sold out in this color" : undefined}
                      className={`px-4 py-2 border transition-colors text-sm ${
                        sizeSoldOut
                          ? "border-border text-muted-foreground line-through opacity-50 cursor-not-allowed"
                          : selectedSize === size
                          ? "border-accent text-accent-foreground bg-accent font-semibold"
                          : "border-accent/50 hover:border-accent"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
              {product.sizes.some((s) => isSoldOut(s)) && (
                <p className="text-xs text-muted-foreground mt-2">
                  Crossed-out sizes are temporarily sold out in {selectedColor}.
                </p>
              )}
            </div>
          )}

          {isMembersOnly ? (
            <div className="space-y-3">
              <div className="bg-accent/10 border border-accent/30 p-4 text-center">
                <Lock className="h-5 w-5 text-accent mx-auto mb-2" />
                <p className="text-sm text-foreground font-display uppercase tracking-wider">
                  Members Only
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sign up for a free account to unlock this product.
                </p>
              </div>
              <Link href="/signup">
                <Button size="lg" className="w-full">
                  Join to Unlock
                </Button>
              </Link>
            </div>
          ) : (
            <Button
              size="lg"
              className="w-full"
              onClick={handleAddToCart}
              disabled={!purchasable || added}
            >
              {added ? (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Added to Cart
                </>
              ) : (
                <>
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  {purchasable
                    ? "Add to Cart"
                    : product.comingSoon
                    ? "Coming Soon"
                    : "Out of Stock"}
                </>
              )}
            </Button>
          )}

          {product.story && (
            <div className="border-t border-border pt-6">
              <button
                onClick={() => setShowStory(!showStory)}
                className="flex items-center justify-between w-full text-left"
              >
                <span className="font-display uppercase tracking-wider text-accent">
                  The Story
                </span>
                <span className="text-accent">{showStory ? "−" : "+"}</span>
              </button>
              {showStory && (
                <div className="mt-4 text-foreground/90 leading-relaxed">
                  <p>{product.story}</p>
                </div>
              )}
            </div>
          )}

          {/* Shipping promises only apply to products that can be ordered */}
          {!product.comingSoon && (
            <div className="border-t border-border pt-6 space-y-4 text-sm text-muted-foreground">
              <p>• Free shipping on all orders</p>
              <p>• Made to order. Arrives in 5-10 business days</p>
              <p>• US shipping only</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
