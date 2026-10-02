import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Product } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Photo for a cart line: the first picture of the color that was chosen.
export function cartItemImage(product: Product, color: string): string {
  return product.colorImages?.[color]?.[0] ?? product.images[0];
}

// Can be bought right now (not "Coming Soon", not out of stock).
export function isPurchasable(product: Product): boolean {
  return product.inStock && !product.comingSoon;
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

export function calculateDiscount(price: number, compareAtPrice: number): number {
  if (!compareAtPrice || compareAtPrice <= price) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

// Approximate delivery window (5–10 business days from order date), shown to
// customers before Printify provides an exact post-ship estimate. The checkout
// success page shows the same range.
export function estimatedDeliveryRange(createdAt: string | Date): string | null {
  if (!createdAt) return null;
  const start = new Date(createdAt);
  if (isNaN(start.getTime())) return null;
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(addBusinessDays(start, 5))} – ${fmt(addBusinessDays(start, 10))}`;
}
