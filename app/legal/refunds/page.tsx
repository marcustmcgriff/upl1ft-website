import type { Metadata } from "next";
import Link from "next/link";
import { SIZE_TOLERANCE_IN } from "@/lib/data/sizeGuide";

export const metadata: Metadata = {
  title: "Refund Policy | UPL1FT",
  description:
    "Every UPL1FT piece is made to order, so all sales are final. Damaged, misprinted, wrong or lost orders are replaced free.",
};

// The time limits here sit inside the print supplier's own limits (30 days from delivery
// for a faulty item; a lost package is claimed in the week after 30 days in transit), so
// that every claim we accept from a customer can still be passed on. Shorten them freely;
// do not lengthen them past those limits. The tolerances are the supplier's own.
const SUPPORT_EMAIL = "support@upl1ft.org";
const CLAIM_DAYS = 14;
const LOST_REPORT_DAYS = 28;
const LOST_AFTER_DAYS = 30;
const PRINT_TOLERANCE_IN = 0.5;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-display text-accent mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Bullets({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-6 space-y-2">{children}</ul>;
}

export default function RefundsPage() {
  const email = (
    <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent underline">
      {SUPPORT_EMAIL}
    </a>
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-display uppercase tracking-wider text-accent gold-glow mb-8">
          Refund Policy
        </h1>

        <div className="prose prose-invert max-w-none space-y-8 text-foreground/90">
          <p className="text-sm text-muted-foreground">
            Last updated: October 2, 2026
          </p>

          <p className="border border-accent/30 bg-accent/5 p-5 leading-relaxed">
            Every UPL1FT piece is printed for you after you order. Nothing comes
            off a shelf, so all sales are final. If your order arrives damaged,
            misprinted or wrong, or does not arrive at all, we replace it at no
            cost to you.
          </p>

          <Section title="Made to Order, All Sales Final">
            <p>
              We do not accept returns or exchanges, and we do not refund an
              order because:
            </p>
            <Bullets>
              <li>the size or color is not what you wanted</li>
              <li>you changed your mind</li>
              <li>the order was placed by mistake</li>
            </Bullets>
            <p>
              Each product page has a size guide with the garment measurements.
              Please check it before you order.
            </p>
          </Section>

          <Section title="Damaged, Misprinted or Wrong Items">
            <p>
              Email {email} within {CLAIM_DAYS} days of delivery if your order
              arrives damaged, has a print defect, or is not the item, size or
              color you ordered. Include:
            </p>
            <Bullets>
              <li>your order number</li>
              <li>
                a clear photo of the whole garment laid flat, with the problem
                visible
              </li>
              <li>for a wrong item or size, a photo that also shows the size tag</li>
              <li>
                for a print in the wrong position or a garment that measures
                wrong, a photo with a tape measure or ruler in the frame
              </li>
              <li>for damage in transit, a photo of the package as well</li>
            </Bullets>
            <p>
              You do not need to send the item back. Once we confirm the
              problem, we send a replacement free of charge. If we cannot
              replace it, we refund the item in full.
            </p>
            <p>
              We cannot accept claims made more than {CLAIM_DAYS} days after
              delivery.
            </p>
          </Section>

          <Section title="What Is Not a Defect">
            <p>
              Printing each piece to order has normal variations. These are not
              defects:
            </p>
            <Bullets>
              <li>
                a print that sits within {PRINT_TOLERANCE_IN} inches of the
                position shown in the product photos
              </li>
              <li>
                garment measurements within {SIZE_TOLERANCE_IN} inches of the
                size guide
              </li>
              <li>
                small color differences between your screen and the printed
                garment
              </li>
              <li>
                a faint scent or light residue from the printing process on a
                new garment (both wash out the first time)
              </li>
              <li>
                fading, shrinkage or wear from washing or drying against the
                care instructions, and normal wear over time
              </li>
            </Bullets>
            <p>
              Care: machine wash cold, inside out. Tumble dry low or hang dry.
              Iron on low heat, never directly on the print. Do not dry clean.
            </p>
          </Section>

          <Section title="If Your Order Does Not Arrive">
            <p>
              Orders usually arrive 5 to 10 business days after you order. Your
              shipping email has a tracking link, and you can check an order
              any time on the{" "}
              <Link href="/orders/track" className="text-accent underline">
                Track Order
              </Link>{" "}
              page.
            </p>
            <Bullets>
              <li>
                If your order has not arrived 10 business days after your
                shipping email, write to {email}. We trace it with the carrier.
              </li>
              <li>
                We need to hear from you within {LOST_REPORT_DAYS} days of the
                shipping email.
              </li>
              <li>
                If the carrier has not delivered the package {LOST_AFTER_DAYS}{" "}
                days after it shipped, we treat it as lost and send a
                replacement free of charge, or refund you if we cannot replace
                it.
              </li>
              <li>
                If tracking shows the package was delivered to the address on
                the order, we cannot replace or refund it. Check with your
                household, neighbors, building office and local post office
                first. Packages are often held or left nearby.
              </li>
            </Bullets>
          </Section>

          <Section title="Wrong Address, Refused or Unclaimed Packages">
            <p>
              We ship to the address entered at checkout. Please check it
              before you pay.
            </p>
            <p>
              If a package comes back because the address was wrong or
              incomplete, or because it was refused or not collected, the order
              is not refunded. If you still want it, we can make and ship it
              again at your expense.
            </p>
          </Section>

          <Section title="Changes and Cancellations">
            <p>
              Your order goes to print as soon as your payment is confirmed.
              After that we cannot change the size, color or address, and we
              cannot cancel it. Please review your cart before you check out.
            </p>
          </Section>

          <Section title="How Refunds Are Paid">
            <p>
              An approved refund goes back to your original payment method.
              Your bank may take 5 to 10 business days to show it.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about an order: {email}. Please include your order
              number.
            </p>
            <p className="text-sm text-muted-foreground">
              We ship within the United States only. This policy does not limit
              any rights you have under the law of your state that cannot be
              waived.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
