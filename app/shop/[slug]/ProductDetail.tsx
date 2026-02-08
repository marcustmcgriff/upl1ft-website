"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, calculateDiscount } from "@/lib/utils";
import { ShoppingBag, ChevronLeft, ChevronRight, Check, Lock } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useAuth } from "@/components/auth/AuthProvider";

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
  const hasMultipleImages = product.images.length > 1;

  const discount = product.compareAtPrice
    ? calculateDiscount(product.price, product.compareAtPrice)
    : 0;

  const handleAddToCart = () => {
    if (!selectedSize) {
      alert("Please select a size");
      return;
    }
    addItem(product, selectedSize, selectedColor);
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
                if (diff > 0 && selectedImage < product.images.length - 1) {
                  setSelectedImage(selectedImage + 1);
                } else if (diff < 0 && selectedImage > 0) {
                  setSelectedImage(selectedImage - 1);
                }
              }
              setTouchStart(null);
            }}
          >
            <Image
              src={product.images[selectedImage]}
              alt={product.name}
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
                {selectedImage < product.images.length - 1 && (
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
                  {product.images.map((_, index) => (
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

          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((image, index) => (
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
                    onClick={() => setSelectedColor(color)}
                    className={`px-4 py-2 border ${
                      selectedColor === color
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent/50"
                    } transition-colors text-sm`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm uppercase tracking-wider text-foreground mb-2">
              Size: {selectedSize && <span className="text-accent">{selectedSize}</span>}
            </label>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-4 py-2 border ${
                    selectedSize === size
                      ? "border-accent bg-accent/10"
                      : "border-border hover:border-accent/50"
                  } transition-colors text-sm`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

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
              disabled={!product.inStock || added}
            >
              {added ? (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Added to Cart
                </>
              ) : (
                <>
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  {product.inStock ? "Add to Cart" : "Out of Stock"}
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

          <div className="border-t border-border pt-6 space-y-4 text-sm text-muted-foreground">
            <p>• Free shipping on all orders</p>
            <p>• Ships within 5-10 business days</p>
            <p>• US shipping only</p>
          </div>
        </div>
      </div>
    </div>
  );
}
