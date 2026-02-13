import { Check, Package, Settings, Truck, Home } from "lucide-react";

const steps = [
  { key: "confirmed", label: "Order Confirmed", icon: Package },
  { key: "processing", label: "Processing", icon: Settings },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
];

function formatTimelineDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface OrderTimelineProps {
  status: string;
  createdAt?: string;
  shipDate?: string | null;
  estimatedDelivery?: string | null;
}

export function OrderTimeline({
  status,
  createdAt,
  shipDate,
  estimatedDelivery,
}: OrderTimelineProps) {
  const currentIndex = steps.findIndex((s) => s.key === status);

  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 py-4">
        <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
          <span className="text-red-400 text-xs font-bold">✕</span>
        </div>
        <div>
          <p className="text-red-400 text-sm font-medium">Order Cancelled</p>
          <p className="text-muted-foreground text-xs">
            This order has been cancelled.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === steps.length - 1;
        const StepIcon = step.icon;

        // Contextual description for each step
        let description = "";
        if (step.key === "confirmed" && createdAt) {
          description = formatTimelineDate(createdAt);
        } else if (step.key === "processing" && (isCompleted || isCurrent)) {
          description = "Your items are being crafted with care";
        } else if (step.key === "shipped") {
          if (shipDate) {
            description = `Shipped ${formatTimelineDate(shipDate)}`;
          } else if (isCurrent) {
            description = "Your package is on its way";
          }
        } else if (step.key === "delivered") {
          if (isCompleted) {
            description = "Your order has arrived";
          } else if (estimatedDelivery) {
            description = `Est. ${formatTimelineDate(estimatedDelivery)}`;
          }
        }

        return (
          <div key={step.key} className="relative flex gap-4">
            {/* Vertical line + circle column */}
            <div className="flex flex-col items-center">
              {/* Circle */}
              <div className="relative z-10">
                {isCurrent && (
                  <div className="absolute inset-[-5px] rounded-full border border-accent/40 animate-[pulse-ring_2s_ease-out_infinite]" />
                )}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isCompleted
                      ? "bg-accent text-background"
                      : isCurrent
                        ? "border-2 border-accent bg-accent/10"
                        : "border border-border bg-background"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : isCurrent ? (
                    <StepIcon className="h-3.5 w-3.5 text-accent" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-border" />
                  )}
                </div>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="relative w-px flex-1 min-h-[40px]">
                  <div className="absolute inset-0 bg-border" />
                  <div
                    className="absolute inset-x-0 top-0 bg-accent transition-all duration-500"
                    style={{
                      height: isCompleted
                        ? "100%"
                        : isCurrent
                          ? "50%"
                          : "0%",
                      backgroundImage: isCurrent
                        ? "linear-gradient(180deg, rgb(200, 162, 74), transparent)"
                        : undefined,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Content */}
            <div className={`pt-1 ${isLast ? "pb-0" : "pb-8"}`}>
              <p
                className={`text-sm font-medium transition-colors duration-300 ${
                  isCompleted || isCurrent
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {step.label}
              </p>
              {description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
