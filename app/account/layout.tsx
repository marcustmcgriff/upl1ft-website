"use client";

import { ReactNode } from "react";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { AccountSidebar } from "@/components/account/AccountSidebar";

export default function AccountLayout({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated } = useRequireAuth();

  if (loading || !isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          {/* Loading skeleton */}
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted w-48" />
            <div className="grid md:grid-cols-4 gap-8">
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-muted" />
                ))}
              </div>
              <div className="md:col-span-3 space-y-4">
                <div className="h-40 bg-muted" />
                <div className="h-40 bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-display uppercase tracking-wider text-accent gold-glow mb-8">
          My Account
        </h1>

        <div className="grid md:grid-cols-4 gap-8">
          {/* Sidebar - hidden on mobile, shown as horizontal tabs */}
          <div className="hidden md:block">
            <AccountSidebar />
          </div>

          {/* Mobile tabs */}
          <div className="md:hidden overflow-x-auto">
            <AccountSidebar />
          </div>

          {/* Main content */}
          <div className="md:col-span-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
