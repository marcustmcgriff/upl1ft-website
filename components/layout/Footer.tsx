"use client";

import Link from "next/link";
import { Instagram, Twitter, Facebook } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function Footer() {
  const [email, setEmail] = useState("");

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement newsletter signup
    console.log("Newsletter signup:", email);
    setEmail("");
  };

  return (
    <footer className="border-t border-border bg-muted">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-1">
            <Link
              href="/"
              className="block text-3xl font-display tracking-wider text-accent gold-glow mb-4"
            >
              UPL1FT
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
                  href="/shop?category=tees"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Tees
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?category=hoodies"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Hoodies
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?category=bottoms"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Bottoms
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?category=accessories"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Accessories
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
                  href="/lookbook"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Lookbook
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
                className="w-full"
              />
              <Button type="submit" className="w-full" size="sm">
                Subscribe
              </Button>
            </form>

            {/* Social Links */}
            <div className="flex gap-4 mt-6">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-accent transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-accent transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-accent transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
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
