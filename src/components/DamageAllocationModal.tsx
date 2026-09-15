"use client";

import { useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { useGameActions } from "@/hooks/useGameActions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DamageAllocationModal() {
  const { combat, players } = useGameStore();
  const { allocateCombatDamage, canAct } = useGameActions();

  const [might, setMight] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [sanity, setSanity] = useState(0);
  const [knowledge, setKnowledge] = useState(0);

  if (!combat || combat.phase !== "allocate-damage" || !combat.loserId) {
    return null;
  }

  const loser = players.find((p) => p.id === combat.loserId);
  const damage = combat.damage ?? 0;
  const pool = combat.damagePool ?? "physical";
  const allocated =
    pool === "physical" ? might + speed : sanity + knowledge;
  const remaining = damage - allocated;

  const apply = () => {
    if (pool === "physical") {
      allocateCombatDamage({ might, speed });
    } else {
      allocateCombatDamage({ sanity, knowledge });
    }
  };

  return (
    <Dialog open>
      <DialogContent className="border-rose-800 bg-stone-950 text-stone-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-rose-300">Assign Damage</DialogTitle>
          <DialogDescription className="text-stone-400">
            {loser?.name} lost the exchange and must assign {damage} damage
            across {pool === "physical" ? "Might and Speed" : "Sanity and Knowledge"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {pool === "physical" ? (
            <>
              <StatAllocator
                label="Might"
                value={might}
                max={loser?.statTracks.might.currentIndex ?? 0}
                onChange={setMight}
                remaining={remaining + might}
                damage={damage}
              />
              <StatAllocator
                label="Speed"
                value={speed}
                max={loser?.statTracks.speed.currentIndex ?? 0}
                onChange={setSpeed}
                remaining={remaining + speed}
                damage={damage}
              />
            </>
          ) : (
            <>
              <StatAllocator
                label="Sanity"
                value={sanity}
                max={loser?.statTracks.sanity.currentIndex ?? 0}
                onChange={setSanity}
                remaining={remaining + sanity}
                damage={damage}
              />
              <StatAllocator
                label="Knowledge"
                value={knowledge}
                max={loser?.statTracks.knowledge.currentIndex ?? 0}
                onChange={setKnowledge}
                remaining={remaining + knowledge}
                damage={damage}
              />
            </>
          )}
          <p className="text-center text-xs text-stone-500">
            {remaining} point{remaining === 1 ? "" : "s"} remaining
          </p>
        </div>

        <DialogFooter>
          <Button
            className="w-full bg-amber-700 hover:bg-amber-600"
            disabled={remaining !== 0 || !canAct()}
            onClick={apply}
          >
            Confirm Assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatAllocator({
  label,
  value,
  max,
  onChange,
  remaining,
  damage,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
  remaining: number;
  damage: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded border border-stone-700 px-3 py-2">
      <span>{label} (max {max})</span>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-7 p-0"
          disabled={value <= 0}
          onClick={() => onChange(value - 1)}
        >
          −
        </Button>
        <span className="w-6 text-center font-mono">{value}</span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-7 p-0"
          disabled={value >= max || remaining <= 0}
          onClick={() => onChange(value + 1)}
        >
          +
        </Button>
      </div>
    </div>
  );
}
