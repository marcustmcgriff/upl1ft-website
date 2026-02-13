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
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isActive = isCompleted || isCurrent;
        const isLast = index === steps.length - 1;

        return (
          <div
            key={step}
            className={`flex items-center ${isLast ? "" : "flex-1"}`}
          >
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div className="relative">
                {/* Pulsing ring on current step */}
                {isCurrent && (
                  <div className="absolute inset-[-4px] rounded-full border border-accent/50 animate-[pulse-ring_2s_ease-out_infinite]" />
                )}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? "bg-accent border-accent text-background border"
                      : isCurrent
                        ? "bg-accent/20 border-accent text-accent border"
                        : "border border-border text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <span className="text-[10px]">{index + 1}</span>
                  )}
                </div>
              </div>
              <span
                className={`text-[10px] mt-1.5 transition-colors duration-300 ${
                  isActive ? "text-accent" : "text-muted-foreground"
                }`}
              >
                {stepLabels[step]}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className="flex-1 mx-2 relative h-px">
                <div className="absolute inset-0 bg-border" />
                <div
                  className="absolute inset-y-0 left-0 bg-accent transition-all duration-500"
                  style={{
                    width: isCompleted
                      ? "100%"
                      : isCurrent
                        ? "50%"
                        : "0%",
                    backgroundImage: isCurrent
                      ? "linear-gradient(90deg, rgb(200, 162, 74), transparent)"
                      : undefined,
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
