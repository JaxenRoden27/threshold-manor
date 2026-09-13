"use client";

import { useEffect, useState } from "react";
import { Die } from "@/components/Die";
import { Button } from "@/components/ui/button";
import { rollDice } from "@/game/diceEngine";

export interface DiceRollConfig {
  diceCount: number;
  modifier?: number;
  modifierLabel?: string;
  target?: number;
  targetLabel?: string;
  title: string;
  description: string;
  variant?: "default" | "threat";
  crisisBelow?: number;
}

interface DiceRollPanelProps {
  config: DiceRollConfig;
  canRoll: boolean;
  waitingLabel?: string;
  onComplete: (dice: number[]) => void;
}

type Phase = "idle" | "rolling" | "revealed";

export function DiceRollPanel({
  config,
  canRoll,
  waitingLabel,
  onComplete,
}: DiceRollPanelProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [faces, setFaces] = useState<number[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (phase !== "rolling") return;
    const interval = setInterval(() => setTick((t) => t + 1), 90);
    return () => clearInterval(interval);
  }, [phase]);

  const handleRoll = () => {
    if (!canRoll || phase !== "idle") return;
    setPhase("rolling");
    const result = rollDice(config.diceCount);
    setTimeout(() => {
      setFaces(result);
      setPhase("revealed");
      onComplete(result);
    }, 1200);
  };

  const total =
    faces.length > 0
      ? faces.reduce((sum, d) => sum + d, 0) + (config.modifier ?? 0)
      : 0;

  const displayFace =
    phase === "rolling" ? ((tick % 6) + 1) : faces[0] ?? 1;

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-950/60 p-4">
      <p className="text-center text-sm font-semibold text-amber-100">
        {config.title}
      </p>
      <p className="mt-1 text-center text-xs text-stone-400">
        {config.description}
      </p>

      <p className="mt-3 text-center text-xs font-medium uppercase tracking-wide text-stone-500">
        {config.diceCount} {config.diceCount === 1 ? "die" : "dice"}
        {config.modifier
          ? ` + ${config.modifier} ${config.modifierLabel ?? ""}`
          : ""}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {phase === "idle" ? (
          <div className="flex gap-2 opacity-40">
            {Array.from({ length: config.diceCount }).map((_, i) => (
              <Die key={i} value={1} size="lg" variant={config.variant} />
            ))}
          </div>
        ) : (
          <>
            {phase === "rolling"
              ? Array.from({ length: config.diceCount }).map((_, i) => (
                  <Die
                    key={i}
                    value={displayFace}
                    size="lg"
                    rolling
                    variant={config.variant}
                  />
                ))
              : faces.map((face, i) => (
                  <Die
                    key={i}
                    value={face}
                    size="lg"
                    variant={config.variant}
                  />
                ))}
            {phase === "revealed" && config.modifier !== undefined && (
              <div className="flex flex-col items-center text-amber-200">
                <span className="text-lg font-bold">+{config.modifier}</span>
                <span className="text-[10px] uppercase text-stone-500">
                  {config.modifierLabel}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {phase === "revealed" && (
        <div className="mt-4 text-center">
          {config.variant === "threat" && config.crisisBelow !== undefined ? (
            <p className="text-sm text-stone-300">
              Rolled{" "}
              <span className="font-bold text-amber-100">{faces[0]}</span>
              {faces[0]! < config.crisisBelow ? (
                <span className="text-rose-400">
                  {" "}
                  — below Clue count ({config.crisisBelow}). Crisis risk!
                </span>
              ) : (
                <span className="text-emerald-400">
                  {" "}
                  — safe for now (need &lt; {config.crisisBelow}).
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-stone-300">
              Total: <span className="font-bold text-amber-100">{total}</span>
              {config.target !== undefined && (
                <>
                  {" "}
                  vs {config.targetLabel ?? "target"}{" "}
                  <span className="font-bold text-amber-100">
                    {config.target}
                  </span>
                </>
              )}
            </p>
          )}
        </div>
      )}

      {phase === "idle" && (
        <div className="mt-4 flex justify-center">
          {canRoll ? (
            <Button
              className="bg-amber-700 hover:bg-amber-600"
              onClick={handleRoll}
            >
              Roll {config.diceCount === 1 ? "Die" : "Dice"}
            </Button>
          ) : (
            <p className="text-xs text-stone-500">
              {waitingLabel ?? "Waiting for the active player to roll…"}
            </p>
          )}
        </div>
      )}

      {phase === "rolling" && (
        <p className="mt-4 text-center text-xs text-amber-300 animate-pulse">
          Rolling…
        </p>
      )}
    </div>
  );
}
