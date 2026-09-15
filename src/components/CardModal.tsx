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
import { EventCardModal } from "@/components/EventCardModal";

export function CardModal() {
  const { pendingCard, players, activePlayerIndex, omensDrawn } =
    useGameStore();
  const {
    rollStatCheck,
    rollHauntRoll,
    dismissPendingCard,
    resolveItemCard,
    canAct,
  } = useGameActions();
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
    omen: "bg-rose-900 text-rose-200",
    clue: "bg-rose-900 text-rose-200",
  };

  const statDiceCount =
    card.stat && active ? active[card.stat] : 1;

  const nextOmenCount = omensDrawn + 1;
  const hasTiers = card.type === "event" && card.tiers && card.tiers.length > 0;

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

        {hasTiers && pendingCard && (
          <EventCardModal
            card={card}
            pendingCard={pendingCard}
            active={active}
            canRoll={canRoll}
            onRoll={rollStatCheck}
          />
        )}

        {card.type === "event" && !hasTiers && pendingCard?.rollPhase === "await-stat" && (
          <DiceRollPanel
            config={{
              diceCount: statDiceCount,
              title: `${active?.name} tests ${card.stat}`,
              description: `Roll ${statDiceCount} Betrayal dice (${card.stat}).`,
            }}
            canRoll={canRoll}
            waitingLabel={`Waiting for ${active?.name} to roll…`}
            onComplete={(dice) => rollStatCheck(dice)}
          />
        )}

        {card.type === "event" && !hasTiers && resolved && pendingCard?.statDice && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {pendingCard.statDice.map((face, i) => (
                <Die key={i} value={face} size="md" />
              ))}
              <span className="text-sm text-stone-400">
                = {pendingCard.roll}
              </span>
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

        {card.type === "omen" && pendingCard?.rollPhase === "await-haunt" && (
          <DiceRollPanel
            config={{
              diceCount: 6,
              crisisBelow: nextOmenCount,
              title: "Haunt Roll",
              description:
                "Roll 6 Betrayal dice immediately. If the sum is below your new Omen count, the Haunt begins.",
              variant: "threat",
            }}
            canRoll={canRoll}
            waitingLabel={`Waiting for ${active?.name} to roll the Haunt dice…`}
            onComplete={(dice) => rollHauntRoll(dice)}
          />
        )}

        {card.type === "omen" && resolved && pendingCard?.hauntDice && (
          <div className="space-y-3">
            <div className="flex flex-wrap justify-center gap-2">
              {pendingCard.hauntDice.map((face, i) => (
                <Die key={i} value={face} size="md" variant="threat" />
              ))}
            </div>
            <p className="text-center text-sm text-amber-300">
              Haunt Roll total: {pendingCard.roll}
              {pendingCard.success
                ? " — the house holds."
                : " — the Haunt begins!"}
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
