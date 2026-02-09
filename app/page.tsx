import { Hero } from "@/components/sections/Hero";
import { FeaturedDrops } from "@/components/sections/FeaturedDrops";
import { Testimonials } from "@/components/sections/Testimonials";
import { Newsletter } from "@/components/sections/Newsletter";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UPL1FT | Faith-Based Streetwear - Carry Your Cross",
  description:
    "Premium heavyweight streetwear for those who walk the narrow path. Shop tees, hoodies, and accessories built with purpose. Strength. Discipline. Faith.",
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
        logo: "https://upl1ft.org/images/logo.png",
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
      <Hero />
      <FeaturedDrops />
      <Testimonials />
      <Newsletter />
    </>
  );
}
