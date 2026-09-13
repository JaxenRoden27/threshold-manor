"use client";

const PIP_LAYOUT: Record<number, number[]> = {
  1: [5],
  2: [2, 8],
  3: [2, 5, 8],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

interface DieProps {
  value: number;
  size?: "sm" | "md" | "lg";
  rolling?: boolean;
  variant?: "default" | "threat";
}

const SIZE_CLASSES = {
  sm: "h-12 w-12",
  md: "h-16 w-16",
  lg: "h-20 w-20",
};

const PIP_SIZE = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
};

export function Die({
  value,
  size = "md",
  rolling = false,
  variant = "default",
}: DieProps) {
  const face = rolling ? value : Math.min(6, Math.max(1, value));
  const pips = new Set(PIP_LAYOUT[face] ?? []);

  return (
    <div
      className={`rounded-xl border-2 p-1.5 shadow-md ${SIZE_CLASSES[size]} ${
        variant === "threat"
          ? "border-rose-500 bg-rose-950"
          : "border-amber-600/80 bg-stone-100"
      } ${rolling ? "animate-dice-tumble" : ""}`}
      aria-label={`Die showing ${face}`}
    >
      <div className="grid h-full w-full grid-cols-3 grid-rows-3">
        {Array.from({ length: 9 }, (_, i) => {
          const cell = i + 1;
          return (
            <div key={cell} className="flex items-center justify-center">
              {pips.has(cell) && (
                <span
                  className={`rounded-full ${PIP_SIZE[size]} ${
                    variant === "threat" ? "bg-rose-300" : "bg-stone-900"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
