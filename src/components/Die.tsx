"use client";

interface DieProps {
  value: number;
  size?: "sm" | "md" | "lg";
  rolling?: boolean;
  variant?: "default" | "threat";
}

const SIZE_CLASSES = {
  sm: "h-12 w-12 text-lg",
  md: "h-16 w-16 text-xl",
  lg: "h-20 w-20 text-2xl",
};

export function Die({
  value,
  size = "md",
  rolling = false,
  variant = "default",
}: DieProps) {
  const face = rolling ? value : Math.min(2, Math.max(0, value));

  return (
    <div
      className={`flex items-center justify-center rounded-xl border-2 font-bold shadow-md ${SIZE_CLASSES[size]} ${
        variant === "threat"
          ? "border-rose-500 bg-rose-950 text-rose-100"
          : "border-amber-600/80 bg-stone-100 text-stone-900"
      } ${rolling ? "animate-dice-tumble" : ""}`}
      aria-label={`Betrayal die showing ${face}`}
    >
      {face}
    </div>
  );
}
