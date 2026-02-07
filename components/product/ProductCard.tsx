import Link from "next/link";
import Image from "next/image";
import { Product } from "@/lib/types";
import { formatPrice, calculateDiscount } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const discount = product.compareAtPrice
    ? calculateDiscount(product.price, product.compareAtPrice)
    : 0;

  return (
    <div className="group relative">
      <Link href={`/shop/${product.slug}`} className="block">
        {/* Image Container */}
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

          {/* Quick Add Button - Shown on Hover */}
          <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button className="w-full" size="sm">
              Quick Add
            </Button>
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-2">
          <h3 className="font-display text-sm uppercase tracking-wider text-foreground group-hover:text-accent transition-colors">
            {product.name}
          </h3>

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

          {/* Available Sizes */}
          <div className="flex gap-1 flex-wrap">
            {product.sizes.slice(0, 5).map((size) => (
              <span
                key={size}
                className="text-xs text-muted-foreground border border-border px-2 py-0.5"
              >
                {size}
              </span>
            ))}
          </div>
        </div>
      </Link>
    </div>
  );
}
