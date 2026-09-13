import type { PuzzleState } from "./types";

const SIGIL_COUNT = 4;
const ROTATIONS = 4;

export function createPuzzleState(): PuzzleState {
  const sigils = Array.from({ length: SIGIL_COUNT }, () =>
    Math.floor(Math.random() * ROTATIONS)
  );
  const target = Array.from({ length: SIGIL_COUNT }, () =>
    Math.floor(Math.random() * ROTATIONS)
  );
  return {
    sigils,
    target,
    moves: 0,
    maxMoves: 12,
    solved: false,
  };
}

export function rotateSigil(puzzle: PuzzleState, index: number): PuzzleState {
  if (puzzle.solved || index < 0 || index >= puzzle.sigils.length) return puzzle;
  const sigils = [...puzzle.sigils];
  sigils[index] = (sigils[index] + 1) % ROTATIONS;
  const solved = sigils.every((s, i) => s === puzzle.target[i]);
  return {
    ...puzzle,
    sigils,
    moves: puzzle.moves + 1,
    solved,
  };
}

export function isPuzzleFailed(puzzle: PuzzleState): boolean {
  return !puzzle.solved && puzzle.moves >= puzzle.maxMoves;
}

export const SIGIL_SYMBOLS = ["◇", "△", "○", "□"];
