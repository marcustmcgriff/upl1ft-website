import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | UPL1FT",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-display uppercase tracking-wider text-accent gold-glow mb-8">
          Terms of Service
        </h1>

        <div className="prose prose-invert max-w-none space-y-6 text-foreground/90">
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section>
            <h2 className="text-2xl font-display text-accent mb-4">
              Agreement to Terms
            </h2>
            <p>
              By accessing and using this website, you accept and agree to be
              bound by the terms and provision of this agreement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-accent mb-4">
              Use License
            </h2>
            <p>
              Permission is granted to temporarily download one copy of the
              materials on UPL1FT's website for personal, non-commercial
              transitory viewing only.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-accent mb-4">
              Product Information
            </h2>
            <p>
              We strive to provide accurate product descriptions and images.
              However, we do not warrant that product descriptions or other
              content is accurate, complete, reliable, current, or error-free.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-accent mb-4">
              Limitation of Liability
            </h2>
            <p>
              In no event shall UPL1FT or its suppliers be liable for any damages
              arising out of the use or inability to use the materials on our
              website.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
