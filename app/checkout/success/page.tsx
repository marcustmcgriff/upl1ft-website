"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/CartProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { products } from "@/lib/data/products";
import { formatPrice } from "@/lib/utils";
import { CheckCircle, UserPlus, Truck } from "lucide-react";

export default function CheckoutSuccessPage() {
  const { clearCart } = useCart();
  const { user } = useAuth();

  // Clear cart on mount (successful payment)
  useEffect(() => {
    clearCart();
  }, [clearCart]);

  // Pick 2 random products for upsell
  const upsellProducts = useMemo(() => {
    const shuffled = [...products].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  }, []);

  // Estimated delivery
  const estimatedDelivery = useMemo(() => {
    const addBusinessDays = (date: Date, days: number) => {
      const result = new Date(date);
      let added = 0;
      while (added < days) {
        result.setDate(result.getDate() + 1);
        const day = result.getDay();
        if (day !== 0 && day !== 6) added++;
      }
      return result;
    };
    const now = new Date();
    const min = addBusinessDays(now, 5);
    const max = addBusinessDays(now, 10);
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(min)} – ${fmt(max)}`;
  }, []);

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-2xl mx-auto">
        {/* Confirmation Header */}
        <div className="text-center mb-10">
          <CheckCircle className="h-20 w-20 text-accent mx-auto mb-6" />

          <h1 className="text-3xl md:text-4xl font-display uppercase tracking-wider text-accent gold-glow mb-4">
            Order Confirmed
          </h1>

          <p className="text-foreground/90 mb-2 text-lg">
            Thank you for your purchase.
          </p>
          <p className="text-muted-foreground">
            You&apos;ll receive a confirmation email with tracking information.
          </p>
        </div>

        {/* Estimated Delivery */}
        <div className="flex items-center gap-3 bg-accent/5 border border-accent/20 p-4 mb-6">
          <Truck className="h-5 w-5 text-accent flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Estimated delivery: {estimatedDelivery}
            </p>
            <p className="text-xs text-muted-foreground">
              Free shipping — tracking will be emailed when your order ships
            </p>
          </div>
        </div>

        {/* What Happens Next */}
        <div className="bg-muted p-6 mb-8 text-left space-y-3">
          <h2 className="font-display uppercase tracking-wider text-accent text-sm">
            What Happens Next
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>1. Your order is sent to our fulfillment center</li>
            <li>2. Your items are printed and quality-checked</li>
            <li>3. Your package is shipped with tracking</li>
            <li>4. You receive your gear and walk in purpose</li>
          </ul>
        </div>

        {/* Guest → Member Prompt */}
        {!user && (
          <div className="bg-accent/5 border border-accent/20 p-6 mb-8">
            <div className="flex items-start gap-4">
              <UserPlus className="h-6 w-6 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display uppercase tracking-wider text-accent text-sm mb-2">
                  Track This Order & Get Member Perks
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a free account to track your order, access exclusive
                  drops, and unlock member-only discount codes.
                </p>
                <Link href="/signup">
                  <Button size="sm">
                    Join the Movement
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link href="/shop">
            <Button size="lg">Continue Shopping</Button>
          </Link>
          {user ? (
            <Link href="/account/orders">
              <Button variant="outline" size="lg">
                View Your Orders
              </Button>
            </Link>
          ) : (
            <Link href="/">
              <Button variant="outline" size="lg">
                Back to Home
              </Button>
            </Link>
          )}
        </div>

        {/* Upsell Section */}
        {upsellProducts.length > 0 && (
          <div>
            <h2 className="text-xl font-display uppercase tracking-wider text-accent text-center mb-6">
              Complete the Look
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {upsellProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/shop/${product.slug}`}
                  className="group"
                >
                  <div className="relative aspect-[3/4] bg-muted overflow-hidden mb-3">
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 50vw, 300px"
                    />
                  </div>
                  <h3 className="font-display uppercase tracking-wider text-accent text-xs mb-1">
                    {product.name}
                  </h3>
                  <p className="text-sm text-foreground">
                    {formatPrice(product.price)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
