"use client";

import { playerStat } from "@/game/statEngine";
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

export function VaultInteractionModal() {
  const { pendingVaultLockpick, players, activePlayerIndex } = useGameStore();
  const { attemptVaultLockpick, dismissVaultLockpick, canAct } = useGameActions();

  if (!pendingVaultLockpick) return null;

  const active = players[activePlayerIndex];
  const knowledge = active ? playerStat(active, "knowledge") : 0;
  const canPick = knowledge >= 6;

  return (
    <Dialog open onOpenChange={() => dismissVaultLockpick()}>
      <DialogContent className="border-amber-800 bg-stone-950 text-stone-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-amber-300">The Vault</DialogTitle>
          <DialogDescription className="text-stone-400">
            A heavy iron door blocks the way. Knowledge 6+ is required to
            lockpick and claim the treasures within (2 items).
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-stone-300">
          {active?.name}&apos;s Knowledge: {knowledge}
          {!canPick && (
            <span className="mt-1 block text-rose-400">
              You lack the skill to pick this lock.
            </span>
          )}
        </p>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {canPick && (
            <Button
              className="w-full bg-amber-700 hover:bg-amber-600"
              disabled={!canAct()}
              onClick={attemptVaultLockpick}
            >
              Attempt Lockpick
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full border-stone-600"
            onClick={dismissVaultLockpick}
          >
            Leave Vault
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
