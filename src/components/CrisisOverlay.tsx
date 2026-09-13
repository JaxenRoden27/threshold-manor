"use client";

import { useGameStore } from "@/store/gameStore";
import { SIGIL_SYMBOLS } from "@/game/puzzleEngine";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function CrisisOverlay() {
  const {
    phase,
    puzzle,
    rotatePuzzleSigil,
    players,
    activePlayerIndex,
    resetGame,
  } = useGameStore();

  if (phase === "exploration" || phase === "setup") return null;

  const active = players[activePlayerIndex];

  if (phase === "victory" || phase === "defeat") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <Card className="w-full max-w-md border-stone-600 bg-stone-900 text-center">
          <CardHeader>
            <CardTitle
              className={
                phase === "victory" ? "text-emerald-400" : "text-rose-500"
              }
            >
              {phase === "victory" ? "You Survived" : "The House Claims You"}
            </CardTitle>
            <CardDescription className="text-stone-400">
              {phase === "victory"
                ? "The sigils align and the ley lines calm. Dawn breaks through cracked shutters."
                : "Power overloads the ritual core. The manor seals itself—with you inside."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="bg-amber-700 hover:bg-amber-600"
              onClick={resetGame}
            >
              Play Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!puzzle) return null;

  const movesLeft = puzzle.maxMoves - puzzle.moves;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 md:items-center">
      <Card className="w-full max-w-lg border-rose-800 bg-stone-950/95 shadow-2xl shadow-rose-900/30">
        <CardHeader>
          <CardTitle className="text-rose-400">The Crisis</CardTitle>
          <CardDescription className="text-stone-400">
            Ley lines surge through the manor. Cooperatively rotate each sigil
            to match the target pattern. Each rotation costs 1 AP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm text-stone-300">
            <span>{active?.name}&apos;s turn</span>
            <span>AP: {active?.ap ?? 0}</span>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs text-stone-500">
              <span>Moves used</span>
              <span>{puzzle.moves}/{puzzle.maxMoves}</span>
            </div>
            <Progress
              value={(puzzle.moves / puzzle.maxMoves) * 100}
              className="h-2"
            />
            <p className="mt-1 text-xs text-amber-400">
              {movesLeft} rotations remaining before overload
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-stone-500">Target</p>
            <div className="flex justify-center gap-3">
              {puzzle.target.map((rot, i) => (
                <div
                  key={`t-${i}`}
                  className="flex h-14 w-14 items-center justify-center rounded-lg border border-amber-600/50 bg-stone-900 text-2xl text-amber-200"
                >
                  {SIGIL_SYMBOLS[rot]}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-stone-500">
              Sigils (click to rotate)
            </p>
            <div className="flex justify-center gap-3">
              {puzzle.sigils.map((rot, i) => (
                <button
                  key={`s-${i}`}
                  type="button"
                  disabled={(active?.ap ?? 0) <= 0}
                  onClick={() => rotatePuzzleSigil(i)}
                  className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-rose-600 bg-rose-950/50 text-2xl text-rose-100 transition hover:border-amber-500 hover:bg-rose-900/60 disabled:opacity-40"
                >
                  {SIGIL_SYMBOLS[rot]}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
