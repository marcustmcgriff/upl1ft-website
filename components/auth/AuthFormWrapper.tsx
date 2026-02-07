"use client";

import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";

interface AuthFormWrapperProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthFormWrapper({
  children,
  title,
  subtitle,
}: AuthFormWrapperProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block gold-glow-hover">
            <Image
              src="/images/upl1ft-logo.png"
              alt="UPL1FT"
              width={120}
              height={120}
              className="h-16 w-auto mx-auto"
            />
          </Link>
        </div>

        {/* Card */}
        <div className="bg-muted border border-border p-8">
          <h1 className="text-2xl font-display uppercase tracking-wider text-accent gold-glow text-center mb-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground text-center mb-8">
              {subtitle}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
