"use client";

import type { Direction } from "@/game/types";
import { useGameStore } from "@/store/gameStore";
import { useMultiplayerStore } from "@/store/multiplayerStore";

export function useGameActions() {
  const { mode, dispatchAction, canLocalAct } = useMultiplayerStore();
  const store = useGameStore();

  const guard = (action: () => void, requiresTurn = true) => {
    if (mode === "local") {
      action();
      return;
    }
    if (requiresTurn && !canLocalAct()) return;
    action();
  };

  const guardDispatch = (
    action: Parameters<typeof dispatchAction>[0],
    requiresTurn = true
  ) => {
    if (mode === "local") {
      switch (action.kind) {
        case "move":
          store.move(action.direction);
          break;
        case "resolve-item":
          store.resolveItemCard();
          break;
        case "roll-stat":
          store.rollStatCheck(action.dice);
          break;
        case "roll-threat":
          store.rollThreatDie(action.dice);
          break;
        case "dismiss-card":
          store.dismissPendingCard();
          break;
        case "end-turn":
          store.endTurn();
          break;
        case "rotate-sigil":
          store.rotatePuzzleSigil(action.index);
          break;
      }
      return;
    }
    if (requiresTurn && !canLocalAct()) return;
    dispatchAction(action);
  };

  return {
    move: (direction: Direction) =>
      guardDispatch({ kind: "move", direction }),
    resolveItemCard: () =>
      guardDispatch({ kind: "resolve-item" }, false),
    rollStatCheck: (dice: number[]) =>
      guardDispatch({ kind: "roll-stat", dice }),
    rollThreatDie: (dice: number[]) =>
      guardDispatch({ kind: "roll-threat", dice }),
    dismissPendingCard: () =>
      guardDispatch({ kind: "dismiss-card" }),
    endTurn: () => guardDispatch({ kind: "end-turn" }),
    rotatePuzzleSigil: (index: number) =>
      guardDispatch({ kind: "rotate-sigil", index }),
    canAct: () => mode === "local" || canLocalAct(),
  };
}
