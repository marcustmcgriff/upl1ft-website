"use client";

import Link from "next/link";
import Image from "next/image";
import { Instagram } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export function Footer() {
  const [email, setEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const { session } = useAuth();

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterStatus("loading");
    setNewsletterMessage("");

    try {
      const response = await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setNewsletterStatus("success");
        setNewsletterMessage(data.message || "Subscribed!");
        setEmail("");
        setTimeout(() => setNewsletterStatus("idle"), 4000);
      } else {
        setNewsletterStatus("error");
        setNewsletterMessage(data.error || "Something went wrong.");
        setTimeout(() => setNewsletterStatus("idle"), 3000);
      }
    } catch {
      setNewsletterStatus("error");
      setNewsletterMessage("Failed to subscribe.");
      setTimeout(() => setNewsletterStatus("idle"), 3000);
    }
  };

  return (
    <footer className="border-t border-border bg-muted">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-1">
            <Link
              href="/"
              className="block gold-glow mb-4"
            >
              <Image
                src="/images/upl1ft-logo.png"
                alt="UPL1FT"
                width={120}
                height={120}
                className="h-12 w-auto"
              />
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Strength. Discipline. Faith. Streetwear for the battle-hardened believer.
            </p>
          </div>

          {/* Shop Links */}
          <div>
            <h3 className="font-display text-accent uppercase tracking-wider mb-4">
              Shop
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/shop"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?category=tees"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Tees
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-display text-accent uppercase tracking-wider mb-4">
              Company
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  About / The Doctrine
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/terms"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/refunds"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-display text-accent uppercase tracking-wider mb-4">
              Stay Connected
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Join the movement. Get updates on new drops and exclusive content.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={newsletterStatus === "loading"}
                className="w-full"
              />
              <Button
                type="submit"
                className="w-full"
                size="sm"
                disabled={newsletterStatus === "loading"}
              >
                {newsletterStatus === "loading"
                  ? "Subscribing..."
                  : newsletterStatus === "success"
                  ? "Subscribed!"
                  : "Subscribe"}
              </Button>
              {newsletterStatus === "success" && (
                <p className="text-accent text-xs">{newsletterMessage}</p>
              )}
              {newsletterStatus === "error" && (
                <p className="text-red-500 text-xs">{newsletterMessage}</p>
              )}
            </form>

            {/* Social Links — update URLs when accounts are created */}
            <div className="flex gap-4 mt-6">
              <a
                href="https://instagram.com/upl1ft.co"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-accent transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} UPL1FT. All rights reserved. Made with purpose.
          </p>
        </div>
      </div>
    </footer>
  );
}
