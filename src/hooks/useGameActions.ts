"use client";

import type { DamageAllocation, Direction, Floor } from "@/game/types";
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
        case "activate-elevator":
          store.activateElevator();
          break;
        case "complete-elevator":
          store.completeElevatorTransition(action.dice, action.floorPick);
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
        case "attempt-vault-lockpick":
          store.attemptVaultLockpick();
          break;
        case "dismiss-vault":
          store.dismissVaultLockpick();
          break;
        case "vertical-move":
          store.performVerticalMove(action.optionId);
          break;
        case "portal-teleport":
          store.performPortalTeleport(action.toTokenId);
          break;
        case "attempt-hidden-latch":
          store.performHiddenLatch();
          break;
        case "dismiss-vertical":
          store.dismissVerticalModal();
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
        case "allocate-combat-damage":
          store.allocateCombatDamage(action.allocation);
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

  const state = () => useGameStore.getState();

  return {
    move: (direction: Direction) =>
      guardDispatch({ kind: "move", direction }),
    useFloorTransition: () =>
      guardDispatch({ kind: "use-floor-transition" }),
    activateElevator: () => guardDispatch({ kind: "activate-elevator" }),
    completeElevatorTransition: (dice?: number[], floorPick?: Floor) =>
      guardDispatch({ kind: "complete-elevator", dice, floorPick }),
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
    attemptVaultLockpick: () =>
      guardDispatch({ kind: "attempt-vault-lockpick" }),
    dismissVaultLockpick: () =>
      guardDispatch({ kind: "dismiss-vault" }, false),
    performVerticalMove: (optionId: string) =>
      guardDispatch({ kind: "vertical-move", optionId }),
    performPortalTeleport: (toTokenId: string) =>
      guardDispatch({ kind: "portal-teleport", toTokenId }),
    performHiddenLatch: () =>
      guardDispatch({ kind: "attempt-hidden-latch" }),
    dismissVerticalModal: () =>
      guardDispatch({ kind: "dismiss-vertical" }, false),
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
    allocateCombatDamage: (allocation: DamageAllocation) =>
      guardDispatch({ kind: "allocate-combat-damage", allocation }),
    dismissCombat: () => guardDispatch({ kind: "dismiss-combat" }, false),
    canAct: () => mode === "local" || canLocalAct(),
    inputBlocked: () => Boolean(state().pendingCard),
    combatBlocked: () => Boolean(state().combat),
    modalBlocked: () =>
      Boolean(
        state().pendingCard ||
          state().combat ||
          state().pendingTransition ||
          state().pendingVaultLockpick ||
          state().pendingElevator ||
          state().pendingVertical
      ),
  };
}
