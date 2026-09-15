"use client";

import {
  COLOR_PAIR_LABELS,
  COLOR_STYLES,
  type ExplorerTemplate,
} from "@/game/characterData";
import { statValue } from "@/game/statEngine";
import type { Player, Stat, StatTrack } from "@/game/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STAT_LABELS: Record<Stat, string> = {
  speed: "Speed",
  might: "Might",
  sanity: "Sanity",
  knowledge: "Knowledge",
};

const STAT_ORDER: Stat[] = ["speed", "might", "sanity", "knowledge"];

function StatTrackRow({
  stat,
  track,
  compact = false,
}: {
  stat: Stat;
  track: StatTrack;
  compact?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-stone-400">{STAT_LABELS[stat]}</span>
        <span className="font-semibold text-amber-200">{statValue(track)}</span>
      </div>
      <div className={`grid grid-cols-8 gap-0.5 ${compact ? "text-[10px]" : "text-xs"}`}>
        {track.values.map((value, index) => {
          const isStart = index === track.startIndex;
          const isCurrent = index === track.currentIndex;
          return (
            <div
              key={index}
              className={`flex h-7 items-center justify-center rounded border font-mono tabular-nums ${
                isCurrent
                  ? "border-amber-400 bg-amber-500/30 text-amber-50 ring-1 ring-amber-400"
                  : isStart
                    ? "border-emerald-600/60 bg-emerald-950/40 text-emerald-200"
                    : "border-stone-700 bg-stone-900/60 text-stone-500"
              }`}
              title={
                isStart
                  ? `${STAT_LABELS[stat]} start (${value})`
                  : isCurrent
                    ? `${STAT_LABELS[stat]} current (${value})`
                    : `${STAT_LABELS[stat]} stage ${index} (${value})`
              }
            >
              {value}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ExplorerCard({
  explorer,
  selected = false,
  taken = false,
  onSelect,
  compact = false,
}: {
  explorer: ExplorerTemplate;
  selected?: boolean;
  taken?: boolean;
  onSelect?: () => void;
  compact?: boolean;
}) {
  const styles = COLOR_STYLES[explorer.color];
  return (
    <Card
      className={`border-stone-700 bg-stone-900/60 transition ${
        taken
          ? "cursor-not-allowed opacity-40"
          : onSelect
            ? "cursor-pointer hover:border-amber-600/50"
            : ""
      } ${selected ? `ring-2 ${styles.ring}` : ""}`}
      onClick={() => !taken && onSelect?.()}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className={`text-amber-50 ${compact ? "text-base" : "text-lg"}`}>
              {explorer.name}
            </CardTitle>
            <CardDescription>
              Age {explorer.age} · {COLOR_PAIR_LABELS[explorer.color]} pair
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={styles.badge}>{COLOR_PAIR_LABELS[explorer.color]}</Badge>
            {selected && <Badge variant="secondary">Selected</Badge>}
            {taken && <Badge variant="outline">Locked</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {STAT_ORDER.map((stat) => (
          <StatTrackRow
            key={stat}
            stat={stat}
            track={explorer[stat]}
            compact={compact}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export function PlayerCharacterCard({
  player,
  compact = false,
}: {
  player: Player;
  compact?: boolean;
}) {
  const styles = COLOR_STYLES[player.color];
  return (
    <Card className="border-stone-700 bg-stone-900/80">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base text-amber-100">{player.name}</CardTitle>
          <Badge className={styles.badge}>{COLOR_PAIR_LABELS[player.color]}</Badge>
        </div>
        <p className="text-xs text-stone-400">
          Age {player.age}
          {!player.isAlive ? " · Unconscious" : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm font-medium text-amber-200">
          <span>Action Points</span>
          <span>{player.ap} / {playerStat(player, "speed")}</span>
        </div>
        {STAT_ORDER.map((stat) => (
          <StatTrackRow
            key={stat}
            stat={stat}
            track={player.statTracks[stat]}
            compact={compact}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function playerStat(player: Player, stat: Stat): number {
  return statValue(player.statTracks[stat]);
}
