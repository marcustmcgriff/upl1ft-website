import { cn } from "@/lib/utils";

interface OrnamentalDividerProps {
  className?: string;
  variant?: "simple" | "ornate";
}

export function OrnamentalDivider({
  className,
  variant = "simple",
}: OrnamentalDividerProps) {
  if (variant === "ornate") {
    return (
      <div className={cn("flex items-center justify-center gap-4", className)}>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-accent/30 to-accent/30" />
        <div className="flex items-center gap-2">
          <span className="text-accent text-sm">◆</span>
          <span className="text-accent text-xs">✦</span>
          <span className="text-accent text-sm">◆</span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent via-accent/30 to-accent/30" />
      </div>
    );
  }

  return (
    <div className={cn("ornamental-divider w-32 mx-auto", className)} />
  );
}
