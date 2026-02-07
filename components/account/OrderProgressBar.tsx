import { Check } from "lucide-react";

const steps = ["confirmed", "processing", "shipped", "delivered"];
const stepLabels: Record<string, string> = {
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
};

export function OrderProgressBar({ status }: { status: string }) {
  const currentIndex = steps.indexOf(status);

  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 text-red-500">
        <span className="text-sm font-medium">Order Cancelled</span>
      </div>
    );
  }

  return (
    <div className="flex items-center w-full">
      {steps.map((step, index) => {
        const isCompleted = index <= currentIndex;
        const isLast = index === steps.length - 1;

        return (
          <div
            key={step}
            className={`flex items-center ${isLast ? "" : "flex-1"}`}
          >
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isCompleted
                    ? "bg-accent border-accent text-background"
                    : "border-border text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-xs">{index + 1}</span>
                )}
              </div>
              <span
                className={`text-xs mt-1 ${
                  isCompleted ? "text-accent" : "text-muted-foreground"
                }`}
              >
                {stepLabels[step]}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={`flex-1 h-0.5 mx-2 transition-colors ${
                  index < currentIndex ? "bg-accent" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
