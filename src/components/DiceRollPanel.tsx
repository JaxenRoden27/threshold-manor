"use client";

import { useEffect, useState } from "react";
import { Die } from "@/components/Die";
import { Button } from "@/components/ui/button";
import { rollBetrayalDice } from "@/game/diceEngine";

export interface DiceRollConfig {
  diceCount: number;
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

const BETRAYAL_CYCLE = [0, 1, 2, 0, 1, 2];

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
    const result = rollBetrayalDice(config.diceCount);
    setTimeout(() => {
      setFaces(result.dice);
      setPhase("revealed");
      onComplete(result.dice);
    }, 1200);
  };

  const total = faces.reduce((sum, d) => sum + d, 0);

  const rollingFaces = Array.from({ length: config.diceCount }, (_, i) =>
    BETRAYAL_CYCLE[(tick + i) % BETRAYAL_CYCLE.length]
  );

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-950/60 p-4">
      <p className="text-center text-sm font-semibold text-amber-100">
        {config.title}
      </p>
      <p className="mt-1 text-center text-xs text-stone-400">
        {config.description}
      </p>

      <p className="mt-3 text-center text-xs font-medium uppercase tracking-wide text-stone-500">
        {config.diceCount} Betrayal {config.diceCount === 1 ? "die" : "dice"}{" "}
        <span className="normal-case text-stone-600">(faces 0–2)</span>
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {phase === "idle" ? (
          <div className="flex gap-2 opacity-40">
            {Array.from({ length: config.diceCount }).map((_, i) => (
              <Die key={i} value={0} size="lg" variant={config.variant} />
            ))}
          </div>
        ) : phase === "rolling" ? (
          rollingFaces.map((face, i) => (
            <Die
              key={i}
              value={face}
              size="lg"
              rolling
              variant={config.variant}
            />
          ))
        ) : (
          faces.map((face, i) => (
            <Die key={i} value={face} size="lg" variant={config.variant} />
          ))
        )}
      </div>

      {phase === "revealed" && (
        <div className="mt-4 text-center">
          <p className="text-sm text-stone-300">
            Sum: <span className="font-bold text-amber-100">{total}</span>
            {config.crisisBelow !== undefined ? (
              total < config.crisisBelow ? (
                <span className="text-rose-400">
                  {" "}
                  — below {config.crisisBelow} Clue(s). Crisis risk!
                </span>
              ) : (
                <span className="text-emerald-400">
                  {" "}
                  — safe (need &lt; {config.crisisBelow}).
                </span>
              )
            ) : config.target !== undefined ? (
              <>
                {" "}
                vs {config.targetLabel ?? "target"}{" "}
                <span className="font-bold text-amber-100">{config.target}</span>
                {total >= config.target ? (
                  <span className="text-emerald-400"> — success!</span>
                ) : (
                  <span className="text-rose-400"> — failure.</span>
                )}
              </>
            ) : null}
          </p>
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
