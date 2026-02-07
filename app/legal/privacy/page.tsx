import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | UPL1FT",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-display uppercase tracking-wider text-accent gold-glow mb-8">
          Privacy Policy
        </h1>

        <div className="prose prose-invert max-w-none space-y-6 text-foreground/90">
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section>
            <h2 className="text-2xl font-display text-accent mb-4">
              Information We Collect
            </h2>
            <p>
              We collect information you provide directly to us when you create
              an account, make a purchase, or communicate with us. This may
              include your name, email address, shipping address, and payment
              information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-accent mb-4">
              How We Use Your Information
            </h2>
            <p>
              We use the information we collect to process your orders, send you
              updates about your orders, respond to your inquiries, and improve
              our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-accent mb-4">
              Data Security
            </h2>
            <p>
              We implement appropriate security measures to protect your personal
              information. However, no method of transmission over the internet
              is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-accent mb-4">
              Contact Us
            </h2>
            <p>
              If you have questions about this Privacy Policy, please contact us
              at privacy@uplift.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
