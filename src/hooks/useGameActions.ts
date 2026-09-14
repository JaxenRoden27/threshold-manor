"use client";

import type { Direction, Floor } from "@/game/types";
import { useGameStore } from "@/store/gameStore";
import { useMultiplayerStore } from "@/store/multiplayerStore";

export function useGameActions() {
  const { mode, dispatchAction, canLocalAct } = useMultiplayerStore();
  const store = useGameStore();

  const guardDispatch = (
    action: Parameters<typeof dispatchAction>[0],
    requiresTurn = true
  ) => {
    if (mode === "local") {
      switch (action.kind) {
        case "move":
          store.move(action.direction);
          break;
        case "use-floor-transition":
          store.useFloorTransition();
          break;
        case "resolve-item":
          store.resolveItemCard();
          break;
        case "roll-stat":
          store.rollStatCheck(action.dice);
          break;
        case "roll-haunt":
        case "roll-crisis":
          store.rollHauntRoll(action.dice);
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
        case "set-view-floor":
          store.setViewFloor(action.floor);
          break;
        case "dismiss-haunt-briefing":
          store.dismissHauntBriefing();
          break;
        case "haunt-action":
          store.performHauntAction(action.actionId);
          break;
        case "start-combat":
          store.initiateCombat(
            action.defenderId,
            action.defenderType,
            action.mental
          );
          break;
        case "roll-combat":
          store.rollCombat();
          break;
        case "dismiss-combat":
          store.dismissCombat();
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
    useFloorTransition: () =>
      guardDispatch({ kind: "use-floor-transition" }),
    setViewFloor: (floor: Floor) =>
      guardDispatch({ kind: "set-view-floor", floor }, false),
    resolveItemCard: () =>
      guardDispatch({ kind: "resolve-item" }, false),
    rollStatCheck: (dice: number[]) =>
      guardDispatch({ kind: "roll-stat", dice }),
    rollHauntRoll: (dice: number[]) =>
      guardDispatch({ kind: "roll-haunt", dice }),
    rollCrisisRoll: (dice: number[]) =>
      guardDispatch({ kind: "roll-haunt", dice }),
    dismissPendingCard: () =>
      guardDispatch({ kind: "dismiss-card" }),
    endTurn: () => guardDispatch({ kind: "end-turn" }),
    rotatePuzzleSigil: (index: number) =>
      guardDispatch({ kind: "rotate-sigil", index }),
    dismissHauntBriefing: () =>
      guardDispatch({ kind: "dismiss-haunt-briefing" }, false),
    performHauntAction: (actionId: string) =>
      guardDispatch({ kind: "haunt-action", actionId }),
    initiateCombat: (
      defenderId: string,
      defenderType: "player" | "monster",
      mental = false
    ) =>
      guardDispatch({ kind: "start-combat", defenderId, defenderType, mental }),
    rollCombat: () => guardDispatch({ kind: "roll-combat" }),
    dismissCombat: () => guardDispatch({ kind: "dismiss-combat" }, false),
    canAct: () => mode === "local" || canLocalAct(),
    inputBlocked: () => Boolean(useGameStore.getState().pendingCard),
    combatBlocked: () => Boolean(useGameStore.getState().combat),
  };
}
