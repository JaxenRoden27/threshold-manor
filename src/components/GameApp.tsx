"use client";

import { useEffect } from "react";
import { createPuzzleState } from "@/game/puzzleEngine";
import { useGameStore } from "@/store/gameStore";
import { useMultiplayerStore } from "@/store/multiplayerStore";
import { LobbyScreen } from "./LobbyScreen";
import { GameBoard } from "./GameBoard";
import { GameSidebar } from "./GameSidebar";
import { CardModal } from "./CardModal";
import { CombatModal } from "./CombatModal";
import { TransitionModal } from "./TransitionModal";
import { VaultInteractionModal } from "./VaultInteractionModal";
import { CrisisOverlay } from "./CrisisOverlay";
import { HauntBriefingModal } from "./HauntBriefingModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function GameApp() {
  const { phase, resetGame } = useGameStore();
  const { mode, roomCode, leaveRoom, ensureHostAvailable } = useMultiplayerStore();

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      (window as Window & { __triggerCrisis?: () => void }).__triggerCrisis =
        () => {
          const s = useGameStore.getState();
          useGameStore.setState({
            phase: "crisis",
            puzzle: createPuzzleState(),
            cluesDiscovered: Math.max(s.cluesDiscovered, 3),
            threatLevel: Math.max(s.threatLevel, 4),
            log: [...s.log, "The Crisis erupts—the sigils must be aligned!"],
          });
        };
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        ensureHostAvailable();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ensureHostAvailable]);

  const handleExit = () => {
    if (mode === "multiplayer") leaveRoom();
    else resetGame();
  };

  if (phase === "setup") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-black">
        <LobbyScreen />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-stone-950 via-stone-900 to-black">
      <header className="flex items-center justify-between border-b border-stone-800 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-amber-100 md:text-xl">
              Threshold Manor
            </h1>
            {mode === "multiplayer" && roomCode && (
              <Badge variant="outline" className="font-mono tracking-widest">
                {roomCode}
              </Badge>
            )}
          </div>
          <p className="text-xs text-stone-500">
            {mode === "multiplayer"
              ? "Online co-op · shared mansion"
              : "Explore • Draw cards • Survive the Crisis"}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleExit}>
          Leave Game
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
      <HauntBriefingModal />
      <CombatModal />
      <TransitionModal />
      <VaultInteractionModal />
      <CrisisOverlay />
    </main>
  );
}
