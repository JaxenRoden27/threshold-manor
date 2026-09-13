"use client";

import { useState } from "react";
import { CHARACTER_TEMPLATES } from "@/game/gameEngine";
import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function CharacterSelect() {
  const { selectedPlayerCount, setPlayerCount, startGame } = useGameStore();
  const [selected, setSelected] = useState<string[]>([
    CHARACTER_TEMPLATES[0].id,
    CHARACTER_TEMPLATES[1].id,
  ]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev;
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const canStart =
    selected.length >= 2 &&
    selected.length <= 4 &&
    selected.length === selectedPlayerCount;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-amber-100 md:text-4xl">
          Threshold Manor
        </h1>
        <p className="mt-2 text-sm text-stone-400 md:text-base">
          A cooperative survival puzzle. Explore the house, survive the cards,
          and align the sigils before the Crisis consumes you.
        </p>
      </header>

      <Card className="border-stone-700 bg-stone-900/80">
        <CardHeader>
          <CardTitle className="text-amber-100">Party Size</CardTitle>
          <CardDescription>
            Choose 2–4 investigators. Each brings unique stats.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {[2, 3, 4].map((n) => (
            <Button
              key={n}
              variant={selectedPlayerCount === n ? "default" : "outline"}
              onClick={() => {
                setPlayerCount(n);
                setSelected(CHARACTER_TEMPLATES.slice(0, n).map((c) => c.id));
              }}
            >
              {n} Players
            </Button>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {CHARACTER_TEMPLATES.map((char) => {
          const isSelected = selected.includes(char.id);
          return (
            <Card
              key={char.id}
              className={`cursor-pointer border-stone-700 bg-stone-900/60 transition hover:border-amber-600/50 ${
                isSelected ? "ring-2 ring-amber-500" : ""
              }`}
              onClick={() => toggle(char.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg text-amber-50">
                      {char.name}
                    </CardTitle>
                    <CardDescription>{char.title}</CardDescription>
                  </div>
                  {isSelected && <Badge variant="secondary">Selected</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm text-stone-300">
                  <span>Might {char.might}</span>
                  <span>Speed {char.speed}</span>
                  <span>Sanity {char.sanity}</span>
                  <span>Knowledge {char.knowledge}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2">
        <Button
          size="lg"
          className="w-full max-w-sm bg-amber-700 hover:bg-amber-600"
          disabled={!canStart}
          onClick={() => startGame(selected)}
        >
          Enter the Manor
        </Button>
        <p className="text-xs text-stone-500">
          Select exactly {selectedPlayerCount} characters to begin.
        </p>
      </div>
    </div>
  );
}
