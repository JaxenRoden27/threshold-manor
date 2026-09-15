"use client";

import { useGameStore } from "@/store/gameStore";
import { useGameActions } from "@/hooks/useGameActions";
import { DiceRollPanel } from "@/components/DiceRollPanel";
import { Button } from "@/components/ui/button";
import type { Floor } from "@/game/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FLOOR_OPTIONS: { floor: Floor; label: string }[] = [
  { floor: "basement", label: "Basement" },
  { floor: "ground", label: "Ground" },
  { floor: "upper", label: "Upper" },
];

export function MysticElevatorModal() {
  const { pendingElevator } = useGameStore();
  const { completeElevatorTransition, canAct } = useGameActions();

  if (!pendingElevator) return null;

  const picking = pendingElevator.phase === "pick-floor";

  return (
    <Dialog open>
      <DialogContent className="border-violet-800 bg-stone-950 text-stone-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-violet-300">Mystic Elevator</DialogTitle>
          <DialogDescription className="text-stone-400">
            {picking
              ? pendingElevator.total !== undefined
                ? `Roll ${pendingElevator.total} — choose a destination floor. The elevator docks at an open doorway.`
                : "Choose a destination floor. Everyone aboard travels together."
              : "Roll 2 Betrayal dice: 0–1 Basement, 2 Ground, 3 Upper, 4+ you pick."}
          </DialogDescription>
        </DialogHeader>

        {picking ? (
          <div className="flex flex-col gap-2">
            {FLOOR_OPTIONS.map(({ floor, label }) => (
              <Button
                key={floor}
                variant="outline"
                className="border-violet-600 text-violet-200"
                disabled={!canAct()}
                onClick={() => completeElevatorTransition(undefined, floor)}
              >
                Send to {label}
              </Button>
            ))}
          </div>
        ) : (
          <DiceRollPanel
            config={{
              diceCount: 2,
              title: "Elevator Roll",
              description: "Sum 0–1 Basement · 2 Ground · 3 Upper · 4+ pick floor",
              variant: "threat",
            }}
            canRoll={canAct()}
            waitingLabel="Waiting for elevator roll…"
            onComplete={(dice) => completeElevatorTransition(dice)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
