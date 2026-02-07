"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/CartProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { CheckCircle } from "lucide-react";

export default function CheckoutSuccessPage() {
  const { clearCart } = useCart();
  const { user } = useAuth();

  // Clear cart on mount (successful payment)
  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-lg mx-auto text-center">
        <CheckCircle className="h-20 w-20 text-accent mx-auto mb-6" />

        <h1 className="text-3xl md:text-4xl font-display uppercase tracking-wider text-accent gold-glow mb-4">
          Order Confirmed
        </h1>

        <p className="text-foreground/90 mb-2 text-lg">
          Thank you for your purchase.
        </p>
        <p className="text-muted-foreground mb-8">
          Your order is being prepared and will ship within 3-7 business days.
          You&apos;ll receive a confirmation email with tracking information.
        </p>

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

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
      </div>
    </div>
  );
}
