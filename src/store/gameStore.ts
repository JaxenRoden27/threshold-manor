import { create } from "zustand";
import {
  activateElevator,
  applyHauntRoll,
  applyStatRoll,
  attemptVaultLockpick,
  completeElevatorTransition,
  createInitialState,
  dismissCard,
  dismissVaultLockpick,
  endTurn,
  movePlayer,
  resolveItemCard,
  setPlayerCount,
  setViewFloor,
  startGame,
  useFloorTransition,
} from "@/game/gameEngine";
import {
  completeHauntAction,
  dismissHauntBriefing,
} from "@/game/hauntEngine";
import {
  applyDamageAllocation,
  dismissCombat,
  resolveCombatRoll,
  rollCombatDice,
  startCombat,
} from "@/game/combatEngine";
import { rotateSigil, isPuzzleFailed } from "@/game/puzzleEngine";
import type { DamageAllocation, Direction, Floor, GameState, Phase } from "@/game/types";

interface GameStore extends GameState {
  setPlayerCount: (count: number) => void;
  startGame: (selectedIds: string[]) => void;
  setViewFloor: (floor: Floor) => void;
  move: (direction: Direction) => void;
  useFloorTransition: () => void;
  activateElevator: () => void;
  completeElevatorTransition: (dice?: number[], floorPick?: Floor) => void;
  resolveItemCard: () => void;
  rollStatCheck: (dice: number[]) => void;
  rollHauntRoll: (dice: number[]) => void;
  dismissPendingCard: () => void;
  endTurn: () => void;
  attemptVaultLockpick: () => void;
  dismissVaultLockpick: () => void;
  rotatePuzzleSigil: (index: number) => void;
  dismissHauntBriefing: () => void;
  performHauntAction: (actionId: string) => void;
  initiateCombat: (defenderId: string, defenderType: "player" | "monster", mental?: boolean) => void;
  rollCombat: () => void;
  allocateCombatDamage: (allocation: DamageAllocation) => void;
  dismissCombat: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  setPlayerCount: (count) => set((s) => setPlayerCount(s, count)),

  startGame: (selectedIds) => set((s) => startGame(s, selectedIds)),

  setViewFloor: (floor) => set((s) => setViewFloor(s, floor)),

  move: (direction) => set((s) => movePlayer(s, direction)),

  useFloorTransition: () => set((s) => useFloorTransition(s)),

  activateElevator: () => set((s) => activateElevator(s)),

  completeElevatorTransition: (dice, floorPick) =>
    set((s) => completeElevatorTransition(s, dice, floorPick)),

  resolveItemCard: () => {
    const s = get();
    if (!s.pendingCard || s.pendingCard.resolved) return;
    if (s.pendingCard.card.type !== "item") return;
    set(resolveItemCard(s, s.pendingCard));
  },

  rollStatCheck: (dice) => {
    const s = get();
    if (!s.pendingCard || s.pendingCard.rollPhase !== "await-stat") return;
    set(applyStatRoll(s, s.pendingCard, dice));
  },

  rollHauntRoll: (dice) => {
    const s = get();
    if (!s.pendingCard || s.pendingCard.rollPhase !== "await-haunt") return;
    set(applyHauntRoll(s, s.pendingCard, dice));
  },

  dismissPendingCard: () => set((s) => dismissCard(s)),

  endTurn: () => set((s) => endTurn(s)),

  attemptVaultLockpick: () => set((s) => attemptVaultLockpick(s)),

  dismissVaultLockpick: () => set((s) => dismissVaultLockpick(s)),

  dismissHauntBriefing: () => set((s) => dismissHauntBriefing(s)),

  performHauntAction: (actionId) =>
    set((s) => completeHauntAction(s, actionId)),

  initiateCombat: (defenderId, defenderType, mental = false) =>
    set((s) => startCombat(s, defenderId, defenderType, mental)),

  rollCombat: () => {
    const s = get();
    if (!s.combat || s.combat.phase !== "rolling") return;
    const { attackerDice, defenderDice, attackerTotal, defenderTotal } =
      rollCombatDice(s);
    set(resolveCombatRoll(s, attackerDice, defenderDice, attackerTotal, defenderTotal));
  },

  allocateCombatDamage: (allocation) =>
    set((s) => applyDamageAllocation(s, allocation)),

  dismissCombat: () => set((s) => dismissCombat(s)),

  rotatePuzzleSigil: (index) => {
    const s = get();
    if (!s.puzzle || s.phase !== "crisis") return;
    const active = s.players[s.activePlayerIndex];
    if (active.ap <= 0) return;

    const puzzle = rotateSigil(s.puzzle, index);
    const players = s.players.map((p, i) =>
      i === s.activePlayerIndex ? { ...p, ap: p.ap - 1 } : p
    );

    let phase: Phase = s.phase;
    let log = [...s.log, `${active.name} rotates sigil ${index + 1}.`];

    if (puzzle.solved) {
      phase = "victory";
      log.push("The sigils align! Power redirects—the house falls silent. You survive.");
    } else if (isPuzzleFailed(puzzle)) {
      phase = "defeat";
      log.push("The ley lines overload. The house claims you all.");
    } else if (players[s.activePlayerIndex].ap <= 0) {
      const nextIndex = (s.activePlayerIndex + 1) % s.players.length;
      const refreshed = players.map((p, i) =>
        i === nextIndex ? { ...p, ap: p.speed } : p
      );
      log.push(`${refreshed[nextIndex].name} steps up to the sigils.`);
      set({
        ...s,
        puzzle,
        players: refreshed,
        activePlayerIndex: nextIndex,
        viewFloor: refreshed[nextIndex].floor,
        phase,
        log,
      });
      return;
    }

    set({ ...s, puzzle, players, phase, log });
  },

  resetGame: () => set(createInitialState()),
}));
