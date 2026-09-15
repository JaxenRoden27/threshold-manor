"use client";

import { useState } from "react";
import type { Card, PendingCard, Player } from "@/game/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Die } from "@/components/Die";
import { DiceRollPanel } from "@/components/DiceRollPanel";

interface EventCardModalProps {
  card: Card;
  pendingCard: PendingCard;
  active: Player | undefined;
  canRoll: boolean;
  onRoll: (dice: number[]) => void;
}

export function EventCardModal({
  card,
  pendingCard,
  active,
  canRoll,
  onRoll,
}: EventCardModalProps) {
  const [showDice, setShowDice] = useState(false);
  const stat = card.stat!;
  const statDiceCount = active ? active[stat] : 1;
  const resolved = pendingCard.resolved;
  const winningIndex = pendingCard.winningTierIndex;

  if (!card.tiers?.length) return null;

  return (
    <div className="space-y-4">
      {card.flavor && (
        <p className="text-sm italic text-stone-400">{card.flavor}</p>
      )}

      <div className="flex items-center gap-2">
        <Badge className="bg-orange-800 text-orange-100 capitalize">
          {stat}
        </Badge>
        <span className="text-xs text-stone-500">
          Roll {statDiceCount} Betrayal dice
        </span>
      </div>

      <div className="overflow-hidden rounded-md border border-stone-700">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-800/80 text-stone-400">
            <tr>
              <th className="px-3 py-2 font-medium">Roll</th>
              <th className="px-3 py-2 font-medium">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {card.tiers.map((tier, i) => (
              <tr
                key={tier.range}
                className={`border-t border-stone-700/80 ${
                  resolved && winningIndex === i
                    ? "bg-amber-900/40 text-amber-100"
                    : "text-stone-300"
                }`}
              >
                <td className="px-3 py-2 font-mono whitespace-nowrap">
                  {tier.range}
                </td>
                <td className="px-3 py-2">{tier.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!resolved && !showDice && (
        <Button
          className="w-full bg-amber-700 hover:bg-amber-600"
          disabled={!canRoll}
          onClick={() => setShowDice(true)}
        >
          Roll {stat.charAt(0).toUpperCase() + stat.slice(1)}
        </Button>
      )}

      {!resolved && showDice && (
        <DiceRollPanel
          config={{
            diceCount: statDiceCount,
            title: `${active?.name} tests ${stat}`,
            description: `Roll ${statDiceCount} Betrayal dice. The tier matching your total applies.`,
          }}
          canRoll={canRoll}
          waitingLabel={`Waiting for ${active?.name} to roll…`}
          onComplete={(dice) => onRoll(dice)}
        />
      )}

      {resolved && pendingCard.statDice && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {pendingCard.statDice.map((face, i) => (
              <Die key={i} value={face} size="md" />
            ))}
            <span className="text-sm text-stone-400">= {pendingCard.roll}</span>
          </div>
          {winningIndex !== undefined && card.tiers[winningIndex] && (
            <p className="text-center text-sm text-amber-200">
              {card.tiers[winningIndex].text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
