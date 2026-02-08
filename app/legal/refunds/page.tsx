import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy | UPL1FT",
};

export default function RefundsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-display uppercase tracking-wider text-accent gold-glow mb-8">
          Refund Policy
        </h1>

        <div className="prose prose-invert max-w-none space-y-6 text-foreground/90">
          <p className="text-sm text-muted-foreground">
            Last updated: February 7, 2026
          </p>

          <section>
            <h2 className="text-2xl font-display text-accent mb-4">
              30-Day Return Window
            </h2>
            <p>
              We offer a 30-day return policy on all unworn, unwashed items with
              original tags attached. Items must be in their original condition
              to qualify for a refund.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-accent mb-4">
              How to Return
            </h2>
            <p>
              To initiate a return, please contact our customer service team at
              returns@upl1ft.org with your order number and reason for return.
              We'll provide you with a return shipping label.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-accent mb-4">
              Refund Processing
            </h2>
            <p>
              Once we receive your return, we'll inspect the item and process
              your refund within 5-7 business days. The refund will be issued to
              your original payment method.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-accent mb-4">
              Exchanges
            </h2>
            <p>
              We gladly accept exchanges for different sizes or colors. Contact
              us to arrange an exchange, and we'll expedite the process.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-accent mb-4">
              Final Sale Items
            </h2>
            <p>
              Items marked as "Final Sale" are not eligible for returns or
              exchanges. Please choose carefully.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
