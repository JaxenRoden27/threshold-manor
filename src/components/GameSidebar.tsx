"use client";

import { useGameStore } from "@/store/gameStore";
import { useGameActions } from "@/hooks/useGameActions";
import { useMultiplayerStore } from "@/store/multiplayerStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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

      {active && (
        <Card className="border-stone-700 bg-stone-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-100">
              {active.name}
            </CardTitle>
            <p className="text-xs text-stone-400">{active.title}</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between font-medium text-amber-200">
              <span>Action Points</span>
              <span>{active.ap} / {active.speed}</span>
            </div>
            <Separator className="bg-stone-700" />
            <div className="grid grid-cols-2 gap-2 text-stone-300">
              <span>Might {active.might}</span>
              <span>Speed {active.speed}</span>
              <span>Sanity {active.sanity}</span>
              <span>Knowledge {active.knowledge}</span>
            </div>
            {active.inventory.length > 0 && (
              <>
                <Separator className="bg-stone-700" />
                <div>
                  <p className="mb-1 text-xs text-stone-500">Inventory</p>
                  <ul className="space-y-1 text-xs text-stone-300">
                    {active.inventory.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="flex min-h-0 flex-1 flex-col border-stone-700 bg-stone-900/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-amber-100">Party</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {players.map((p, i) => (
            <div
              key={p.id}
              className={`rounded px-2 py-1 ${
                i === activePlayerIndex
                  ? "bg-amber-900/40 text-amber-100"
                  : "text-stone-400"
              }`}
            >
              {p.name} — AP {p.ap} · {p.floor}
            </div>
          ))}
        </CardContent>
      </Card>

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

      {(phase === "exploration" || phase === "HAUNT_ACTIVE") &&
        !pendingCard &&
        !combat && (
        <Button
          variant="outline"
          onClick={endTurn}
          className="w-full"
          disabled={!canAct()}
        >
          End Turn
          {active?.ap === 0 ? " (Space)" : ""}
        </Button>
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
