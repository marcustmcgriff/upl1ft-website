"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, User, Package, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth/AuthProvider";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  navLinks: { href: string; label: string }[];
}

export function MobileNav({ isOpen, onClose, navLinks }: MobileNavProps) {
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Menu Panel */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 z-50 h-full w-4/5 max-w-sm bg-muted border-r border-border p-6"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6"
              aria-label="Close menu"
            >
              <X className="h-6 w-6 text-foreground" />
            </button>

            {/* Logo */}
            <Link
              href="/"
              onClick={onClose}
              className="block gold-glow mb-12"
            >
              <Image
                src="/images/upl1ft-logo.png"
                alt="UPL1FT"
                width={120}
                height={120}
                className="h-12 w-auto"
              />
            </Link>

            {/* Navigation Links */}
            <nav className="flex flex-col gap-6">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className="block text-xl font-display uppercase tracking-wider text-foreground hover:text-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </nav>

            {/* Account Section */}
            <div className="mt-12 pt-6 border-t border-border">
              {user ? (
                <div className="flex flex-col gap-4">
                  <Link
                    href="/account"
                    onClick={onClose}
                    className="flex items-center gap-3 text-foreground hover:text-accent transition-colors"
                  >
                    <User className="h-5 w-5" />
                    <span className="text-sm uppercase tracking-wider">My Account</span>
                  </Link>
                  <Link
                    href="/account/orders"
                    onClick={onClose}
                    className="flex items-center gap-3 text-foreground hover:text-accent transition-colors"
                  >
                    <Package className="h-5 w-5" />
                    <span className="text-sm uppercase tracking-wider">Orders</span>
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      onClose();
                    }}
                    className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="text-sm uppercase tracking-wider">Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <Link
                    href="/login"
                    onClick={onClose}
                    className="flex items-center gap-3 text-foreground hover:text-accent transition-colors"
                  >
                    <User className="h-5 w-5" />
                    <span className="text-sm uppercase tracking-wider">Sign In</span>
                  </Link>
                  <Link
                    href="/signup"
                    onClick={onClose}
                    className="text-sm uppercase tracking-wider text-accent hover:underline"
                  >
                    Join the Movement
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
