import type { Metadata } from "next";
import { OrnamentalDivider } from "@/components/ui/ornamental-divider";

export const metadata: Metadata = {
  title: "The Doctrine | UPL1FT",
  description:
    "Our mission: to create streetwear that embodies strength, discipline, and unwavering faith.",
};

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center mb-16">
        <h1 className="text-5xl md:text-7xl font-display uppercase tracking-wider text-accent gold-glow mb-6">
          The Doctrine
        </h1>
        <p className="text-xl text-foreground/90 leading-relaxed">
          We are not clothing. We are a declaration.
        </p>
      </div>

      {/* Mission Statement */}
      <div className="max-w-3xl mx-auto space-y-8 mb-20">
        <div className="border-l-2 border-accent pl-6">
          <h2 className="text-2xl font-display uppercase tracking-wider text-accent mb-4">
            Our Mission
          </h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            UPL1FT exists to remind the faithful that strength is not
            comfortable, discipline is not casual, and faith is not passive.
          </p>
          <p className="text-foreground/90 leading-relaxed mb-4">
            We create premium streetwear for those who understand that the
            battle is real, the cross is heavy, and the path is narrow. Every
            piece is designed with intention—combining sacred symbolism with
            urban grit, baroque beauty with battle-worn resilience.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            This is armor for the modern warrior. Wear it with purpose.
          </p>
        </div>

        {/* Core Values - Featured */}
        <div className="relative py-16 my-12">
          <OrnamentalDivider variant="ornate" className="mb-16" />

          <div className="max-w-5xl mx-auto">
            {/* Title Section */}
            <div className="text-center mb-16 space-y-3">
              <h2 className="text-2xl md:text-4xl font-display uppercase tracking-[0.25em] text-accent gold-glow-strong">
                Strength
              </h2>
              <p className="text-accent/40 text-sm">•</p>
              <h2 className="text-2xl md:text-4xl font-display uppercase tracking-[0.25em] text-accent gold-glow-strong">
                Discipline
              </h2>
              <p className="text-accent/40 text-sm">•</p>
              <h2 className="text-2xl md:text-4xl font-display uppercase tracking-[0.25em] text-accent gold-glow-strong">
                Faith
              </h2>
            </div>

            {/* Values Grid */}
            <div className="grid md:grid-cols-3 gap-12 md:gap-16">
              <div className="text-center relative group">
                <div className="inline-block mb-6 transform group-hover:scale-110 transition-transform">
                  <span className="text-5xl text-accent drop-shadow-[0_0_20px_rgba(200,162,74,0.5)]">✦</span>
                </div>
                <h3 className="text-xl font-display uppercase tracking-wider text-accent mb-4 gold-glow">
                  Strength
                </h3>
                <OrnamentalDivider className="mb-6" />
                <p className="text-foreground/80 leading-relaxed text-sm">
                  Built to endure. Every stitch carries weight. Wear what you can
                  carry. The armor of the faithful is tested by fire and proven in battle.
                </p>
              </div>

              <div className="text-center relative group">
                <div className="inline-block mb-6 transform group-hover:scale-110 transition-transform">
                  <span className="text-5xl text-accent drop-shadow-[0_0_20px_rgba(200,162,74,0.5)]">✦</span>
                </div>
                <h3 className="text-xl font-display uppercase tracking-wider text-accent mb-4 gold-glow">
                  Discipline
                </h3>
                <OrnamentalDivider className="mb-6" />
                <p className="text-foreground/80 leading-relaxed text-sm">
                  The narrow path requires focus. Daily commitment. No compromise.
                  Walk with purpose, train with intention, rise with conviction.
                </p>
              </div>

              <div className="text-center relative group">
                <div className="inline-block mb-6 transform group-hover:scale-110 transition-transform">
                  <span className="text-5xl text-accent drop-shadow-[0_0_20px_rgba(200,162,74,0.5)]">✦</span>
                </div>
                <h3 className="text-xl font-display uppercase tracking-wider text-accent mb-4 gold-glow">
                  Faith
                </h3>
                <OrnamentalDivider className="mb-6" />
                <p className="text-foreground/80 leading-relaxed text-sm">
                  Heaven stands undisturbed. Rooted in what is eternal, unshaken by
                  the storm. The foundation that cannot be moved.
                </p>
              </div>
            </div>
          </div>

          <OrnamentalDivider variant="ornate" className="mt-16" />
        </div>

        {/* Scripture Reference */}
        <div className="relative bg-muted/50 p-10 md:p-12 border-t border-b baroque-border">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <span className="text-2xl text-accent">◆</span>
          </div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
            <span className="text-2xl text-accent">◆</span>
          </div>
          <p className="text-xl md:text-2xl italic text-foreground/90 mb-4 leading-relaxed">
            "Put on the full armor of God, so that you can take your stand
            against the devil's schemes."
          </p>
          <OrnamentalDivider className="my-4" />
          <p className="text-base text-accent font-display tracking-wider">— Ephesians 6:11</p>
        </div>
      </div>

      {/* Visual Section */}
      <div className="relative h-[50vh] mb-12 bg-gradient-to-b from-background via-muted to-background overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,162,74,0.3)_0%,transparent_70%)]" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-3xl md:text-5xl font-display uppercase tracking-wider text-accent gold-glow text-center px-4">
            Carry Your Cross
          </p>
        </div>
      </div>
    </div>
  );
}
