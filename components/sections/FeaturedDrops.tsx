import { products } from "@/lib/data/products";
import { ProductGrid } from "@/components/product/ProductGrid";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OrnamentalDivider } from "@/components/ui/ornamental-divider";

export function FeaturedDrops() {
  const featuredProducts = products.filter((p) => p.featured).slice(0, 4);

  return (
    <section className="relative py-20 overflow-hidden">
      {/* Saint Michael Background - Lower Portion */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/images/st-michael.png')",
            backgroundSize: "cover",
            backgroundPosition: "center 80%",
          }}
        />
        {/* Dark overlay for text readability with smooth blend */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/70" />
      </div>

      <div className="relative z-10 container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-display uppercase tracking-wider text-accent gold-glow mb-4">
            Featured Drops
          </h2>
          <OrnamentalDivider className="my-6" />
          <p className="text-foreground/90 max-w-2xl mx-auto">
            New releases and exclusive pieces. Armor for the modern warrior.
          </p>
        </div>

        {/* Product Grid */}
        <ProductGrid products={featuredProducts} priority />

        {/* View All Button */}
        <div className="text-center mt-12">
          <Link href="/shop">
            <Button variant="outline" size="lg">
              View All Products
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
