"use client";

import { useGameStore } from "@/store/gameStore";
import { useGameActions } from "@/hooks/useGameActions";
import { getTransitionLabel } from "@/game/roomTransitions";
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

export function TransitionModal() {
  const { pendingTransition, players, activePlayerIndex, phase } =
    useGameStore();
  const { completeElevatorTransition, canAct } = useGameActions();

  if (!pendingTransition || pendingTransition.kind !== "mystic-elevator") {
    return null;
  }

  const active = players[activePlayerIndex];
  const traitorPicker =
    phase === "HAUNT_ACTIVE" && active?.isTraitor;

  return (
    <Dialog open>
      <DialogContent className="border-violet-800 bg-stone-950 text-stone-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-violet-300">Mystic Elevator</DialogTitle>
          <DialogDescription className="text-stone-400">
            {traitorPicker
              ? "As the Traitor, choose which floor the elevator delivers you to."
              : "Roll 2 Betrayal dice: 0 = Basement, 1–2 = Ground, 3+ = Upper. The elevator travels with you."}
          </DialogDescription>
        </DialogHeader>

        {traitorPicker ? (
          <div className="flex flex-col gap-2">
            {FLOOR_OPTIONS.map(({ floor, label }) => (
              <Button
                key={floor}
                variant="outline"
                className="border-violet-600 text-violet-200"
                disabled={!canAct()}
                onClick={() =>
                  completeElevatorTransition([0, 0], floor)
                }
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
              description: getTransitionLabel("mystic-elevator"),
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
