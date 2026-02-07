"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, calculateDiscount } from "@/lib/utils";
import { ShoppingBag, ChevronLeft } from "lucide-react";

export function ProductDetail({ product }: { product: Product }) {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>(
    product.colors[0] || ""
  );
  const [selectedImage, setSelectedImage] = useState(0);
  const [showStory, setShowStory] = useState(false);

  const discount = product.compareAtPrice
    ? calculateDiscount(product.price, product.compareAtPrice)
    : 0;

  const handleAddToCart = () => {
    if (!selectedSize) {
      alert("Please select a size");
      return;
    }
    console.log("Adding to cart:", { product, selectedSize, selectedColor });
    alert("Added to cart!");
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
          <div className="relative aspect-[3/4] bg-muted overflow-hidden">
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

          <Button
            size="lg"
            className="w-full"
            onClick={handleAddToCart}
            disabled={!product.inStock}
          >
            <ShoppingBag className="mr-2 h-5 w-5" />
            {product.inStock ? "Add to Cart" : "Out of Stock"}
          </Button>

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
            <p>• Free shipping on orders over $100</p>
            <p>• Ships within 2-3 business days</p>
            <p>• 30-day returns on unworn items</p>
          </div>
        </div>
      </div>
    </div>
  );
}
