import { create } from "zustand";
import {
  createInitialState,
  dismissCard,
  endTurn,
  movePlayer,
  resolveCard,
  setPlayerCount,
  startGame,
} from "@/game/gameEngine";
import { rotateSigil, isPuzzleFailed } from "@/game/puzzleEngine";
import type { Direction, GameState, Phase } from "@/game/types";

interface GameStore extends GameState {
  setPlayerCount: (count: number) => void;
  startGame: (selectedIds: string[]) => void;
  move: (direction: Direction) => void;
  resolvePendingCard: () => void;
  dismissPendingCard: () => void;
  endTurn: () => void;
  rotatePuzzleSigil: (index: number) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  setPlayerCount: (count) => set((s) => setPlayerCount(s, count)),

  startGame: (selectedIds) => set((s) => startGame(s, selectedIds)),

  move: (direction) => set((s) => movePlayer(s, direction)),

  resolvePendingCard: () => {
    const s = get();
    if (!s.pendingCard || s.pendingCard.resolved) return;
    set(resolveCard(s, s.pendingCard));
  },

  dismissPendingCard: () => set((s) => dismissCard(s)),

  endTurn: () => set((s) => endTurn(s)),

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
      players[nextIndex] = { ...players[nextIndex], ap: players[nextIndex].speed };
      log.push(`${players[nextIndex].name} steps up to the sigils.`);
      set({
        ...s,
        puzzle,
        players,
        activePlayerIndex: nextIndex,
        phase,
        log,
      });
      return;
    }

    set({ ...s, puzzle, players, phase, log });
  },

  resetGame: () => set(createInitialState()),
}));
