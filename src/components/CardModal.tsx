"use client";

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
import { Badge } from "@/components/ui/badge";
import { DiceRollPanel } from "@/components/DiceRollPanel";
import { Die } from "@/components/Die";

export function CardModal() {
  const { pendingCard, players, activePlayerIndex, clueCount } = useGameStore();
  const { rollStatCheck, rollThreatDie, dismissPendingCard, resolveItemCard, canAct } =
    useGameActions();
  const canRoll = canAct();
  const canContinue = canAct();

  const open = Boolean(pendingCard);
  const card = pendingCard?.card;
  const resolved = pendingCard?.resolved ?? false;
  const active = players[activePlayerIndex];

  if (!card) return null;

  const typeColors: Record<string, string> = {
    event: "bg-orange-900 text-orange-200",
    item: "bg-sky-900 text-sky-200",
    clue: "bg-rose-900 text-rose-200",
  };

  const statValue =
    card.stat && active ? active[card.stat] : 0;

  return (
    <Dialog open={open} onOpenChange={() => resolved && dismissPendingCard()}>
      <DialogContent className="border-stone-700 bg-stone-900 text-stone-100 sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge className={typeColors[card.type]}>{card.type}</Badge>
            <DialogTitle>{card.title}</DialogTitle>
          </div>
          <DialogDescription className="text-stone-400">
            {card.description}
          </DialogDescription>
        </DialogHeader>

        {card.type === "item" && !resolved && (
          <div className="text-sm text-stone-300">
            <p>{card.successText}</p>
            <Button
              className="mt-3 w-full bg-amber-700 hover:bg-amber-600"
              disabled={!canContinue}
              onClick={resolveItemCard}
            >
              Take Item
            </Button>
          </div>
        )}

        {card.type === "event" && pendingCard?.rollPhase === "await-stat" && (
          <DiceRollPanel
            config={{
              diceCount: 1,
              modifier: statValue,
              modifierLabel: card.stat ?? undefined,
              target: card.difficulty,
              targetLabel: "difficulty",
              title: `${active?.name} tests ${card.stat}`,
              description: "Roll the die and add your stat to beat the difficulty.",
            }}
            canRoll={canRoll}
            waitingLabel={`Waiting for ${active?.name} to roll…`}
            onComplete={(dice) => rollStatCheck(dice)}
          />
        )}

        {card.type === "event" && resolved && pendingCard?.statDice && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <Die value={pendingCard.statDice[0]} size="md" />
              {card.stat && (
                <span className="text-sm text-stone-400">
                  + {statValue} {card.stat}
                </span>
              )}
            </div>
            <p
              className={
                pendingCard.success ? "text-emerald-400" : "text-rose-400"
              }
            >
              {pendingCard.success ? card.successText : card.failureText}
            </p>
          </div>
        )}

        {card.type === "clue" && pendingCard?.rollPhase === "await-threat" && (
          <DiceRollPanel
            config={{
              diceCount: 1,
              crisisBelow: clueCount + 1,
              title: "Threat Die",
              description:
                "Roll the threat die. If the result is below the new Clue count—or you reach 3 Clues—the Crisis begins.",
              variant: "threat",
            }}
            canRoll={canRoll}
            waitingLabel={`Waiting for ${active?.name} to roll the threat die…`}
            onComplete={(dice) => rollThreatDie(dice)}
          />
        )}

        {card.type === "clue" && resolved && pendingCard?.threatDice && (
          <div className="space-y-3">
            <div className="flex justify-center">
              <Die value={pendingCard.threatDice[0]} size="md" variant="threat" />
            </div>
            <p className="text-amber-300 text-xs">
              Threat roll complete. Check the journal for whether the Crisis
              awakened.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            className="bg-amber-700 hover:bg-amber-600"
            disabled={!resolved || !canContinue}
            onClick={dismissPendingCard}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
