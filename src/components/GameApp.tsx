"use client";

import { useGameStore } from "@/store/gameStore";
import { CharacterSelect } from "./CharacterSelect";
import { GameBoard } from "./GameBoard";
import { GameSidebar } from "./GameSidebar";
import { CardModal } from "./CardModal";
import { CrisisOverlay } from "./CrisisOverlay";
import { Button } from "@/components/ui/button";

export function GameApp() {
  const { phase, resetGame } = useGameStore();

  if (phase === "setup") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-black">
        <CharacterSelect />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-stone-950 via-stone-900 to-black">
      <header className="flex items-center justify-between border-b border-stone-800 px-4 py-3">
        <div>
          <h1 className="text-lg font-bold text-amber-100 md:text-xl">
            Threshold Manor
          </h1>
          <p className="text-xs text-stone-500">
            Explore • Draw cards • Survive the Crisis
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={resetGame}>
          New Game
        </Button>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 lg:flex-row">
        <section className="flex-1 lg:order-1">
          <GameBoard />
        </section>
        <section className="w-full lg:order-2 lg:w-80 lg:shrink-0">
          <GameSidebar />
        </section>
      </div>

      <CardModal />
      <CrisisOverlay />
    </main>
  );
}
