"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Background with Saint Michael */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover"
          style={{
            backgroundImage: "url('/images/st-michael.png')",
            backgroundPosition: "center 25%",
          }}
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/60 to-black/75" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display uppercase tracking-wider text-accent gold-glow animate-glow leading-tight whitespace-nowrap">
            Carry Your Cross
          </h1>

          {/* Ornamental Divider */}
          <div
            className="w-48 h-px mx-auto ornamental-divider my-6"
            style={{
              boxShadow: '0 0 15px rgba(200, 162, 74, 0.8), 0 0 30px rgba(200, 162, 74, 0.4)'
            }}
          />

          {/* Prominent Tagline */}
          <div className="relative max-w-3xl mx-auto">
            <div className="text-center space-y-2">
              <p
                className="text-xl md:text-3xl font-display uppercase tracking-[0.25em] text-accent leading-tight"
                style={{
                  textShadow: '0 0 20px rgba(200, 162, 74, 0.9), 0 0 40px rgba(200, 162, 74, 0.6), 0 0 60px rgba(200, 162, 74, 0.4)'
                }}
              >
                Strength
              </p>
              <p
                className="text-xs md:text-sm text-accent"
                style={{
                  textShadow: '0 0 15px rgba(200, 162, 74, 0.8), 0 0 30px rgba(200, 162, 74, 0.5)'
                }}
              >
                •
              </p>
              <p
                className="text-xl md:text-3xl font-display uppercase tracking-[0.25em] text-accent leading-tight"
                style={{
                  textShadow: '0 0 20px rgba(200, 162, 74, 0.9), 0 0 40px rgba(200, 162, 74, 0.6), 0 0 60px rgba(200, 162, 74, 0.4)'
                }}
              >
                Discipline
              </p>
              <p
                className="text-xs md:text-sm text-accent"
                style={{
                  textShadow: '0 0 15px rgba(200, 162, 74, 0.8), 0 0 30px rgba(200, 162, 74, 0.5)'
                }}
              >
                •
              </p>
              <p
                className="text-xl md:text-3xl font-display uppercase tracking-[0.25em] text-accent leading-tight"
                style={{
                  textShadow: '0 0 20px rgba(200, 162, 74, 0.9), 0 0 40px rgba(200, 162, 74, 0.6), 0 0 60px rgba(200, 162, 74, 0.4)'
                }}
              >
                Faith
              </p>
            </div>
          </div>

          {/* Ornamental Divider */}
          <div
            className="w-48 h-px mx-auto ornamental-divider my-6"
            style={{
              boxShadow: '0 0 15px rgba(200, 162, 74, 0.8), 0 0 30px rgba(200, 162, 74, 0.4)'
            }}
          />

          {/* Subheading */}
          <p className="text-lg md:text-xl text-foreground/90 max-w-2xl mx-auto leading-relaxed font-light italic">
            Streetwear forged in faith. Premium quality for those who walk the
            narrow path with strength and discipline.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link href="/shop">
              <Button size="lg">Shop New Arrivals</Button>
            </Link>
            <Link href="/about">
              <Button variant="outline" size="lg">
                Read The Doctrine
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
