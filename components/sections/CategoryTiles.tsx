import Link from "next/link";
import Image from "next/image";
import { collections } from "@/lib/data/products";

export function CategoryTiles() {
  return (
    <section className="relative py-20 overflow-hidden">
      {/* Concrete Wall Background */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/category-bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center 0%",
          }}
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/55 to-black/70" />
      </div>

      <div className="relative z-10 container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-display uppercase tracking-wider text-accent gold-glow mb-4">
            Shop By Category
          </h2>
          <p className="text-muted-foreground">
            Find your armor. Every piece built with purpose.
          </p>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/shop?category=${collection.slug}`}
              className="group relative aspect-square overflow-hidden bg-background"
            >
              {/* Background Image */}
              <Image
                src={collection.image}
                alt={collection.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <h3 className="text-2xl font-display uppercase tracking-wider text-accent gold-glow-hover mb-2">
                  {collection.name}
                </h3>
                <p className="text-sm text-foreground/80 mb-4">
                  {collection.description}
                </p>
                <span className="text-xs uppercase tracking-widest text-accent">
                  Explore →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
