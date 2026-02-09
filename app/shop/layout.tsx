import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop All | UPL1FT",
  description:
    "Browse our collection of faith-based streetwear. Premium heavyweight tees, hoodies, and accessories built with purpose. Free shipping on all orders.",
};

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
