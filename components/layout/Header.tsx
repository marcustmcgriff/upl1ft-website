"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileNav } from "./MobileNav";
import { useCart } from "@/components/cart/CartProvider";
import { useAuth } from "@/components/auth/AuthProvider";

export function Header() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { cartCount: cartItemCount, openDrawer } = useCart();
  const { user } = useAuth();

  const navLinks = [
    { href: "/shop", label: "Shop" },
    { href: "/lookbook", label: "Lookbook" },
    { href: "/about", label: "The Doctrine" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-4">
          <div className="flex h-20 items-center justify-between">
            {/* Mobile Menu Button */}
            <button
              className="md:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open mobile menu"
            >
              <Menu className="h-6 w-6 text-foreground" />
            </button>

            {/* Logo */}
            <Link
              href="/"
              className="gold-glow-hover"
            >
              <Image
                src="/images/upl1ft-logo.png"
                alt="UPL1FT"
                width={120}
                height={120}
                className="h-16 md:h-10 w-auto"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm uppercase tracking-wider text-foreground hover:text-accent transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Account + Cart */}
            <div className="flex items-center gap-1">
              <Link href={user ? "/account" : "/login"}>
                <Button variant="ghost" size="icon" aria-label={user ? "My account" : "Sign in"}>
                  <User className="h-5 w-5" />
                </Button>
              </Link>
              <div className="relative">
                <Button variant="ghost" size="icon" aria-label="Shopping cart" onClick={openDrawer}>
                  <ShoppingBag className="h-5 w-5" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center font-bold">
                      {cartItemCount}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        navLinks={navLinks}
      />
    </>
  );
}
