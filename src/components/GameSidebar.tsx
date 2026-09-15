"use client";

import { useGameStore } from "@/store/gameStore";
import { useGameActions } from "@/hooks/useGameActions";
import { useMultiplayerStore } from "@/store/multiplayerStore";
import { PlayerCharacterCard } from "@/components/CharacterCardUI";
import { TurnTrackerHUD } from "@/components/TurnTrackerHUD";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

export function GameSidebar() {
  const {
    players,
    activePlayerIndex,
    phase,
    omensDrawn,
    cluesDiscovered,
    threatLevel,
    log,
    pendingCard,
    combat,
    haunt,
    phase: gamePhase,
  } = useGameStore();
  const { endTurn, canAct } = useGameActions();
  const { mode, localPeerId, isMyTurn } = useMultiplayerStore();

  const active = players[activePlayerIndex];
  const isMyActiveTurn = mode === "local" || isMyTurn();
  const canPassTurn =
    (phase === "exploration" || phase === "HAUNT_ACTIVE") &&
    !pendingCard &&
    !combat &&
    canAct();

  return (
    <aside className="flex h-full flex-col gap-3">
      <Card className="border-stone-700 bg-stone-900/80">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-amber-100">Status</CardTitle>
            <Badge
              variant={
                phase === "crisis" || phase === "HAUNT_ACTIVE"
                  ? "destructive"
                  : "secondary"
              }
              className="capitalize"
            >
              {phase === "HAUNT_ACTIVE" ? "Haunt" : phase}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <div className="mb-1 flex justify-between text-stone-400">
              <span>Omens</span>
              <span>{omensDrawn || cluesDiscovered}</span>
            </div>
            <Progress
              value={Math.min(100, (omensDrawn || cluesDiscovered) * 20)}
              className="h-2"
            />
          </div>
          <div className="flex justify-between text-stone-300">
            <span>Threat Level</span>
            <span className="font-semibold text-rose-400">{threatLevel}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-stone-700 bg-stone-900/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-amber-100">Turn Order</CardTitle>
        </CardHeader>
        <CardContent>
          <TurnTrackerHUD
            players={players}
            activePlayerIndex={activePlayerIndex}
            onPassTurn={endTurn}
            canPassTurn={canPassTurn}
          />
        </CardContent>
      </Card>

      {active && <PlayerCharacterCard player={active} compact />}

      {mode === "multiplayer" && localPeerId && (
        <p className="text-center text-xs text-stone-500">
          {isMyActiveTurn
            ? "It's your turn."
            : `Waiting for ${active?.name ?? "active player"}…`}
        </p>
      )}

      {haunt && gamePhase === "HAUNT_ACTIVE" && haunt.briefingDismissed && (
        <Card className="border-rose-800 bg-rose-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-rose-300">Haunt Progress</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-stone-400">
            {haunt.completedActionIds.length} haunt action(s) completed.
          </CardContent>
        </Card>
      )}

      <Card className="min-h-[120px] flex-1 border-stone-700 bg-stone-900/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-amber-100">Journal</CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-0">
          <ScrollArea className="h-36 px-4 pb-4">
            <div className="space-y-1 text-xs text-stone-400">
              {log.length === 0 ? (
                <p className="text-stone-500">No events yet.</p>
              ) : (
                log.map((entry, i) => <p key={i}>{entry}</p>)
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </aside>
  );
}
