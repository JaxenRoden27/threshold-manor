"use client";

import { useGameStore } from "@/store/gameStore";
import { useGameActions } from "@/hooks/useGameActions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function VerticalMoveModal() {
  const { pendingVertical, passageTokens } = useGameStore();
  const {
    performHiddenLatch,
    dismissVerticalModal,
    performPortalTeleport,
    canAct,
  } = useGameActions();

  if (!pendingVertical) return null;

  if (pendingVertical.mode === "hidden-latch") {
    return (
      <Dialog open>
        <DialogContent className="border-amber-800 bg-stone-950 text-stone-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-300">Hidden Latch</DialogTitle>
            <DialogDescription className="text-stone-400">
              The basement deck is empty and no stairs reach the Foyer. A concealed
              latch may reveal a way up — Knowledge 4+ required.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              className="bg-amber-800 text-amber-50 hover:bg-amber-700"
              disabled={!canAct()}
              onClick={performHiddenLatch}
            >
              Trip the latch (Knowledge 4+)
            </Button>
            <Button
              variant="ghost"
              className="text-stone-400"
              disabled={!canAct()}
              onClick={dismissVerticalModal}
            >
              Leave it alone
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const fromToken = passageTokens.find((t) => t.id === pendingVertical.fromTokenId);
  const destinations = passageTokens.filter((t) => t.id !== pendingVertical.fromTokenId);

  return (
    <Dialog open>
      <DialogContent className="border-emerald-800 bg-stone-950 text-stone-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-emerald-300">Secret Passage</DialogTitle>
          <DialogDescription className="text-stone-400">
            {fromToken
              ? `Slip from ${fromToken.roomName} to another tokened room (1 AP).`
              : "Choose a destination passage token (1 AP)."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {destinations.map((token) => (
            <Button
              key={token.id}
              variant="outline"
              className="border-emerald-700 text-emerald-200"
              disabled={!canAct()}
              onClick={() => performPortalTeleport(token.id)}
            >
              {token.roomName} ({token.floor})
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          className="text-stone-400"
          disabled={!canAct()}
          onClick={dismissVerticalModal}
        >
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
