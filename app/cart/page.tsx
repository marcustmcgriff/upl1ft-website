"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";

export default function CartPage() {
  // TODO: Implement cart state management
  const cartItems: any[] = [];

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto text-center">
          <ShoppingBag className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-3xl font-display uppercase tracking-wider text-accent mb-4">
            Your Cart is Empty
          </h1>
          <p className="text-muted-foreground mb-8">
            Add some armor to your collection.
          </p>
          <Link href="/shop">
            <Button size="lg">Shop Now</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl md:text-5xl font-display uppercase tracking-wider text-accent gold-glow mb-8">
        Your Cart
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Cart items would go here */}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-muted p-6 space-y-4 sticky top-24">
            <h2 className="text-xl font-display uppercase tracking-wider text-accent">
              Order Summary
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">$0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-foreground">Calculated at checkout</span>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span className="text-foreground">Total</span>
                <span className="text-accent">$0.00</span>
              </div>
            </div>

            <Link href="/checkout">
              <Button size="lg" className="w-full">
                Proceed to Checkout
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
