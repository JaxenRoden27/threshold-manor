"use client";

import { useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
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

export function CardModal() {
  const { pendingCard, resolvePendingCard, dismissPendingCard, players, activePlayerIndex } =
    useGameStore();

  const open = Boolean(pendingCard);
  const card = pendingCard?.card;
  const resolved = pendingCard?.resolved ?? false;
  const active = players[activePlayerIndex];

  useEffect(() => {
    if (pendingCard && !pendingCard.resolved) {
      resolvePendingCard();
    }
  }, [pendingCard, resolvePendingCard]);

  if (!card) return null;

  const typeColors: Record<string, string> = {
    event: "bg-orange-900 text-orange-200",
    item: "bg-sky-900 text-sky-200",
    clue: "bg-rose-900 text-rose-200",
  };

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

        {resolved && (
          <div className="space-y-2 text-sm">
            {card.type === "event" && card.stat && (
              <p className="text-stone-300">
                {active?.name} tests <strong>{card.stat}</strong>
                {pendingCard?.roll !== undefined && (
                  <> — rolled <strong>{pendingCard.roll}</strong> vs {card.difficulty}</>
                )}
              </p>
            )}
            <p
              className={
                pendingCard?.success ? "text-emerald-400" : "text-rose-400"
              }
            >
              {pendingCard?.success ? card.successText : card.failureText}
            </p>
            {card.type === "clue" && (
              <p className="text-amber-300 text-xs">
                After each Clue, a threat die is rolled. If it falls below the
                Clue count—or you uncover 3 Clues—the Crisis begins.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            className="bg-amber-700 hover:bg-amber-600"
            disabled={!resolved}
            onClick={dismissPendingCard}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
