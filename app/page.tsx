import { Hero } from "@/components/sections/Hero";
import { FeaturedDrops } from "@/components/sections/FeaturedDrops";
import { Testimonials } from "@/components/sections/Testimonials";
import { Newsletter } from "@/components/sections/Newsletter";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UPL1FT | Faith-Based Streetwear - Carry Your Cross",
  description:
    "Premium heavyweight streetwear for those who walk the narrow path. Shop heavyweight tees built with purpose. Strength. Discipline. Faith.",
};

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://upl1ft.org/#organization",
        name: "UPL1FT",
        url: "https://upl1ft.org",
        logo: "https://upl1ft.org/images/upl1ft-logo.png",
        description:
          "Premium heavyweight streetwear for those who walk the narrow path. Strength. Discipline. Faith.",
        sameAs: ["https://instagram.com/upl1ft.co"],
      },
      {
        "@type": "WebSite",
        "@id": "https://upl1ft.org/#website",
        url: "https://upl1ft.org",
        name: "UPL1FT",
        publisher: { "@id": "https://upl1ft.org/#organization" },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* The hero background is the first thing a visitor sees, so it is fetched before the
          stylesheet is read. The two widths match the md: switch in Hero.tsx. */}
      <link rel="preload" as="image" href="/images/st-michael-1200.webp" media="(max-width: 767px)" fetchPriority="high" />
      <link rel="preload" as="image" href="/images/st-michael.webp" media="(min-width: 768px)" fetchPriority="high" />
      <Hero />
      <FeaturedDrops />
      <Testimonials />
      <Newsletter />
    </>
  );
}
