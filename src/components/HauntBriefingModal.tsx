"use client";

import { useState } from "react";
import { getHauntScenario } from "@/game/hauntMatrix";
import { useGameStore } from "@/store/gameStore";
import { useGameActions } from "@/hooks/useGameActions";
import { useMultiplayerStore } from "@/store/multiplayerStore";
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

export function HauntBriefingModal() {
  const { haunt, phase, players } = useGameStore();
  const { dismissHauntBriefing } = useGameActions();
  const { mode, localPeerId } = useMultiplayerStore();
  const [secretView, setSecretView] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (phase !== "HAUNT_ACTIVE" || !haunt || haunt.briefingDismissed) return null;

  const scenario = getHauntScenario(haunt.scenarioId);
  const localPlayer = players.find((p) => p.id === localPeerId);
  const isTraitor =
    mode === "multiplayer"
      ? localPlayer?.isTraitor ?? false
      : players.some((p) => p.isTraitor) && secretView;

  const traitorName =
    players.find((p) => p.id === haunt.traitorPlayerId)?.name ?? "Unknown";

  const handleToggleSecret = () => {
    if (secretView) {
      setSecretView(false);
      return;
    }
    setConfirmOpen(true);
  };

  const confirmSecretView = () => {
    setSecretView(true);
    setConfirmOpen(false);
  };

  return (
    <>
      <Dialog open onOpenChange={() => {}}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-rose-800 bg-stone-950 text-stone-100 sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">Haunt</Badge>
              <DialogTitle className="text-rose-300">{scenario.name}</DialogTitle>
            </div>
            <DialogDescription className="text-stone-400">
              {mode === "multiplayer"
                ? "Each player sees only their role's manual on this device."
                : "Hot-seat: survivors read aloud. Traitor uses Secret View privately."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="rounded border border-stone-700 bg-stone-900/60 p-3">
              <p className="mb-1 font-medium text-amber-200">Your Goal</p>
              <p className="text-stone-300">
                {isTraitor ? scenario.traitorGoal : scenario.survivorGoal}
              </p>
              <p className="mt-2 text-xs text-stone-500">
                Win: {isTraitor
                  ? scenario.traitorWinCondition
                  : scenario.survivorWinCondition}
              </p>
            </div>

            {isTraitor ? (
              <div className="rounded border border-rose-800 bg-rose-950/30 p-3">
                <p className="mb-2 font-semibold text-rose-300">
                  Traitor&apos;s Tome
                </p>
                <ul className="list-disc space-y-1 pl-4 text-stone-300">
                  {scenario.traitorsTome.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded border border-emerald-800 bg-emerald-950/20 p-3">
                <p className="mb-2 font-semibold text-emerald-300">
                  Secrets of Survival
                </p>
                <ul className="list-disc space-y-1 pl-4 text-stone-300">
                  {scenario.secretsOfSurvival.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            )}

            {mode === "local" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-rose-700 text-rose-200"
                onClick={handleToggleSecret}
              >
                {secretView
                  ? "Hide Secret View (Survivor Manual)"
                  : "Toggle Secret View (Traitor Only)"}
              </Button>
            )}

            {mode === "multiplayer" && isTraitor && (
              <p className="text-xs text-rose-400/80">
                You are the traitor. Other players cannot see this tome.
              </p>
            )}

            {scenario.monster && (
              <p className="text-xs text-stone-500">
                Monster: {scenario.monster.name} (Might {scenario.monster.might},
                Sanity {scenario.monster.sanity}, HP {haunt.monsterHp ?? scenario.monster.hp})
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              className="bg-amber-700 hover:bg-amber-600"
              onClick={dismissHauntBriefing}
            >
              Begin the Haunt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="border-rose-800 bg-stone-900 text-stone-100 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-rose-300">Privacy Check</DialogTitle>
            <DialogDescription className="text-stone-400">
              Make sure other players cannot see your screen. The Traitor&apos;s
              Tome reveals hidden objectives for{" "}
              <span className="text-rose-300">{traitorName}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-rose-800 hover:bg-rose-700"
              onClick={confirmSecretView}
            >
              I&apos;m alone — show Traitor&apos;s Tome
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
