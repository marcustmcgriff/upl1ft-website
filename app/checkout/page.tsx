"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // TODO: Implement Stripe checkout
    console.log("Processing checkout...");

    setTimeout(() => {
      setLoading(false);
      alert("Checkout integration coming soon!");
    }, 1000);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl md:text-5xl font-display uppercase tracking-wider text-accent gold-glow mb-8">
        Checkout
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-8">
          {/* Contact Information */}
          <div className="space-y-4">
            <h2 className="text-xl font-display uppercase tracking-wider text-accent">
              Contact Information
            </h2>
            <Input type="email" placeholder="Email" required />
          </div>

          {/* Shipping Address */}
          <div className="space-y-4">
            <h2 className="text-xl font-display uppercase tracking-wider text-accent">
              Shipping Address
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Input placeholder="First Name" required />
              <Input placeholder="Last Name" required />
            </div>
            <Input placeholder="Address" required />
            <Input placeholder="Apartment, suite, etc. (optional)" />
            <div className="grid md:grid-cols-3 gap-4">
              <Input placeholder="City" required />
              <Input placeholder="State" required />
              <Input placeholder="ZIP Code" required />
            </div>
          </div>

          {/* Payment */}
          <div className="space-y-4">
            <h2 className="text-xl font-display uppercase tracking-wider text-accent">
              Payment
            </h2>
            <div className="bg-muted p-6 text-center">
              <p className="text-muted-foreground mb-4">
                Stripe integration placeholder
              </p>
              <p className="text-sm text-muted-foreground">
                TODO: Add Stripe Elements here
              </p>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Processing..." : "Complete Order"}
          </Button>
        </form>

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
                <span className="text-foreground">Free</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="text-foreground">$0.00</span>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span className="text-foreground">Total</span>
                <span className="text-accent">$0.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
