"use client";

import { COLOR_STYLES } from "@/game/characterData";
import { playerStat } from "@/game/statEngine";
import type { Player } from "@/game/types";
import { Button } from "@/components/ui/button";

export function TurnTrackerHUD({
  players,
  activePlayerIndex,
  onPassTurn,
  canPassTurn,
  showPassButton = true,
}: {
  players: Player[];
  activePlayerIndex: number;
  onPassTurn: () => void;
  canPassTurn: boolean;
  showPassButton?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {players.map((player, index) => {
          const isActive = index === activePlayerIndex;
          const styles = COLOR_STYLES[player.color];
          return (
            <div
              key={player.id}
              className={`flex min-w-[4.5rem] flex-col items-center gap-1 rounded-lg border px-2 py-1.5 text-center transition ${
                isActive
                  ? "border-amber-500 bg-amber-950/40 ring-1 ring-amber-500/60"
                  : "border-stone-700 bg-stone-900/50"
              } ${!player.isAlive ? "opacity-40" : ""}`}
              title={`${player.name} · AP ${player.ap}`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${styles.dot} ${
                  isActive ? "ring-2 ring-amber-300 ring-offset-1 ring-offset-stone-950" : ""
                }`}
              />
              <span className="max-w-[5rem] truncate text-[10px] font-medium text-stone-200">
                {player.name.split(" ")[0]}
              </span>
              <span className="text-[10px] text-stone-500">
                AP {player.ap}
                {!player.isAlive ? " · ✕" : ""}
              </span>
            </div>
          );
        })}
      </div>

      {showPassButton && (
        <Button
          variant="outline"
          className="w-full border-amber-700/50 text-amber-100"
          onClick={onPassTurn}
          disabled={!canPassTurn}
        >
          Pass Turn
        </Button>
      )}
    </div>
  );
}

export function ActiveTurnSummary({ player }: { player: Player }) {
  return (
    <p className="text-xs text-stone-500">
      {player.name} · Speed {playerStat(player, "speed")} · Might{" "}
      {playerStat(player, "might")}
    </p>
  );
}
