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
  return (
    <>
      <Hero />
      <FeaturedDrops />
      <Testimonials />
      <Newsletter />
    </>
  );
}
