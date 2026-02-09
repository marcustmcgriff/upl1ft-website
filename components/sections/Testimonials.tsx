import { testimonials } from "@/lib/data/products";
import { Card, CardContent } from "@/components/ui/card";

export function Testimonials() {
  return (
    <section className="relative py-20 overflow-hidden">
      {/* Creation of Adam Background */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/testimonials-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center 0%",
            transform: "scaleY(-1)",
          }}
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/85" />
      </div>

      <div className="relative z-10 container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-display uppercase tracking-wider text-accent gold-glow mb-4">
            Testimonies
          </h2>
          <p className="text-foreground/70 max-w-2xl mx-auto">
            From those who carry the message daily.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="border-accent/20">
              <CardContent className="p-6">
                <p className="text-foreground/90 mb-4 italic leading-relaxed">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <p className="text-accent font-display tracking-wider">
                  — {testimonial.name}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
