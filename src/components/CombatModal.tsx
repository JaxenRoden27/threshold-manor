"use client";

import { useEffect } from "react";
import { getHauntScenario } from "@/game/hauntMatrix";
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
import { Die } from "@/components/Die";

export function CombatModal() {
  const { combat, players, haunt } = useGameStore();
  const { rollCombat, dismissCombat, canAct } = useGameActions();

  const open = Boolean(combat);

  useEffect(() => {
    if (!combat || combat.phase !== "rolling" || !canAct()) return;
    const timer = setTimeout(() => rollCombat(), 400);
    return () => clearTimeout(timer);
  }, [combat, canAct, rollCombat]);

  if (!combat) return null;

  const attacker = players.find((p) => p.id === combat.attackerId);
  const defender =
    combat.defenderType === "player"
      ? players.find((p) => p.id === combat.defenderId)
      : null;
  const monster =
    combat.defenderType === "monster" && haunt
      ? getHauntScenario(haunt.scenarioId).monster
      : null;

  const defenderLabel =
    defender?.name ?? monster?.name ?? "Unknown";

  return (
    <Dialog open={open} onOpenChange={() => combat.phase === "resolved" && dismissCombat()}>
      <DialogContent className="border-rose-800 bg-stone-950 text-stone-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-rose-300">Combat</DialogTitle>
          <DialogDescription className="text-stone-400">
            {attacker?.name} attacks {defenderLabel} —{" "}
            {combat.attackStat} vs {combat.defenseStat}
          </DialogDescription>
        </DialogHeader>

        {combat.phase === "rolling" && (
          <p className="text-center text-sm text-amber-300">Rolling Betrayal dice…</p>
        )}

        {combat.phase === "resolved" && (
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-xs text-stone-500">Attack ({combat.attackStat})</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {combat.attackerDice?.map((face, i) => (
                  <Die key={`a-${i}`} value={face} size="md" />
                ))}
                <span className="text-sm text-stone-400">
                  = {combat.attackerTotal}
                </span>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs text-stone-500">Defense ({combat.defenseStat})</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {combat.defenderDice?.map((face, i) => (
                  <Die
                    key={`d-${i}`}
                    value={face}
                    size="md"
                    variant={combat.defenderType === "monster" ? "threat" : "default"}
                  />
                ))}
                <span className="text-sm text-stone-400">
                  = {combat.defenderTotal}
                </span>
              </div>
            </div>
            <p className="text-center text-lg font-semibold text-rose-300">
              {combat.damage} damage
            </p>
          </div>
        )}

        <DialogFooter>
          {combat.phase === "resolved" && (
            <Button
              className="w-full bg-amber-700 hover:bg-amber-600"
              onClick={dismissCombat}
            >
              Continue
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
