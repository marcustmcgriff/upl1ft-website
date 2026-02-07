import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Lookbook | UPL1FT",
  description: "Editorial imagery showcasing UPL1FT's latest collection.",
};

const lookbookImages = [
  { id: 1, src: "/images/lookbook/look1.jpg", title: "Calm in Chaos" },
  { id: 2, src: "/images/lookbook/look2.jpg", title: "Carry Your Cross" },
  { id: 3, src: "/images/lookbook/look3.jpg", title: "Heaven Stands" },
  { id: 4, src: "/images/lookbook/look4.jpg", title: "Armor of God" },
  { id: 5, src: "/images/lookbook/look5.jpg", title: "Warrior Spirit" },
  { id: 6, src: "/images/lookbook/look6.jpg", title: "Sanctified" },
];

export default function LookbookPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-display uppercase tracking-wider text-accent gold-glow mb-4">
          Lookbook
        </h1>
        <p className="text-muted-foreground">
          The armor in action. Editorial shots from our latest collection.
        </p>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lookbookImages.map((image) => (
          <div
            key={image.id}
            className="group relative aspect-[3/4] bg-muted overflow-hidden cursor-pointer"
          >
            <Image
              src={image.src}
              alt={image.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-6 left-6">
                <p className="text-xl font-display uppercase tracking-wider text-accent">
                  {image.title}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
