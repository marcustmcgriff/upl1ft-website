"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  User,
  MapPin,
  Gift,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

const navItems = [
  { href: "/account", label: "Dashboard", icon: LayoutDashboard },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/profile", label: "Profile", icon: User },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/perks", label: "Member Perks", icon: Gift },
];

export function AccountSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/account" && pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
              isActive
                ? "text-accent bg-accent/10 border-l-2 border-accent"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}

      <button
        onClick={signOut}
        className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full cursor-pointer"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </nav>
  );
}
