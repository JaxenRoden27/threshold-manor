"use client";

import { useMemo } from "react";
import { useGameStore } from "@/store/gameStore";
import type { Direction, Tile } from "@/game/types";
import { DIRECTION_DELTA } from "@/game/tileData";
import { Button } from "@/components/ui/button";

const TILE_SIZE = 88;
const POOL_COLORS: Record<string, string> = {
  ground: "bg-emerald-900/80 border-emerald-600",
  upper: "bg-violet-900/80 border-violet-600",
  basement: "bg-rose-950/80 border-rose-700",
};

const DOOR_OFFSETS: Record<Direction, string> = {
  north: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
  south: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
  east: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2",
  west: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2",
};

export function GameBoard() {
  const { tiles, players, activePlayerIndex, move, phase, pendingCard } =
    useGameStore();

  const bounds = useMemo(() => {
    const xs = tiles.map((t) => t.x);
    const ys = tiles.map((t) => t.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }, [tiles]);

  const active = players[activePlayerIndex];
  const canMove = phase === "exploration" && !pendingCard && active?.ap > 0;

  const unexploredDoors = useMemo(() => {
    const doors: { tile: Tile; direction: Direction }[] = [];
    for (const tile of tiles) {
      for (const dir of ["north", "south", "east", "west"] as Direction[]) {
        if (!tile.doors[dir]) continue;
        const { dx, dy } = DIRECTION_DELTA[dir];
        const neighbor = tiles.find((t) => t.x === tile.x + dx && t.y === tile.y + dy);
        if (!neighbor) doors.push({ tile, direction: dir });
      }
    }
    return doors;
  }, [tiles]);

  const width = (bounds.maxX - bounds.minX + 1) * TILE_SIZE;
  const height = (bounds.maxY - bounds.minY + 1) * TILE_SIZE;

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-auto rounded-lg border border-stone-700 bg-stone-950/90 p-4">
        <div
          className="relative mx-auto"
          style={{ width, height, minWidth: width, minHeight: height }}
        >
          {tiles.map((tile) => {
            const left = (tile.x - bounds.minX) * TILE_SIZE;
            const top = (tile.y - bounds.minY) * TILE_SIZE;
            const playersHere = players.filter(
              (p) => p.x === tile.x && p.y === tile.y
            );
            return (
              <div
                key={tile.id}
                className={`absolute flex flex-col items-center justify-center rounded-md border-2 p-1 text-center ${POOL_COLORS[tile.pool]}`}
                style={{
                  left,
                  top,
                  width: TILE_SIZE - 8,
                  height: TILE_SIZE - 8,
                }}
              >
                <span className="text-[10px] font-semibold leading-tight text-stone-100">
                  {tile.name}
                </span>
                {!tile.cardResolved && tile.visited && (
                  <span className="mt-0.5 text-[9px] text-amber-300">!</span>
                )}
                {playersHere.map((p, i) => (
                  <span
                    key={p.id}
                    className={`absolute text-lg ${
                      players[activePlayerIndex]?.id === p.id
                        ? "text-amber-300"
                        : "text-sky-300"
                    }`}
                    style={{
                      bottom: 4 + i * 14,
                      right: 4,
                    }}
                    title={p.name}
                  >
                    ●
                  </span>
                ))}
                {(["north", "south", "east", "west"] as Direction[]).map(
                  (dir) =>
                    tile.doors[dir] && (
                      <div
                        key={dir}
                        className={`absolute h-2 w-2 rounded-full bg-amber-500/80 ${DOOR_OFFSETS[dir]}`}
                      />
                    )
                )}
              </div>
            );
          })}

          {canMove &&
            active &&
            (["north", "south", "east", "west"] as Direction[]).map((dir) => {
              const currentTile = tiles.find(
                (t) => t.x === active.x && t.y === active.y
              );
              if (!currentTile?.doors[dir]) return null;
              const { dx, dy } = DIRECTION_DELTA[dir];
              const targetExists = tiles.some(
                (t) => t.x === active.x + dx && t.y === active.y + dy
              );
              const label = dir.charAt(0).toUpperCase();

              const tileLeft =
                (active.x - bounds.minX) * TILE_SIZE + TILE_SIZE / 2 - 14;
              const tileTop =
                (active.y - bounds.minY) * TILE_SIZE + TILE_SIZE / 2 - 14;

              const pos =
                dir === "north"
                  ? { left: tileLeft, top: tileTop - 44 }
                  : dir === "south"
                    ? { left: tileLeft, top: tileTop + 44 }
                    : dir === "east"
                      ? { left: tileLeft + 44, top: tileTop }
                      : { left: tileLeft - 44, top: tileTop };

              return (
                <Button
                  key={dir}
                  size="sm"
                  variant="outline"
                  className="absolute z-10 h-7 w-7 border-amber-500/60 bg-stone-900/90 p-0 text-xs text-amber-200"
                  style={pos}
                  onClick={() => move(dir)}
                  title={
                    targetExists
                      ? `Move ${dir} (1 AP)`
                      : `Explore ${dir} (1 AP)`
                  }
                >
                  {label}
                  {!targetExists && "?"}
                </Button>
              );
            })}
        </div>
      </div>

      {unexploredDoors.length > 0 && (
        <p className="text-xs text-stone-500">
          {unexploredDoors.length} unexplored doorway
          {unexploredDoors.length !== 1 ? "s" : ""} on the map.
        </p>
      )}
    </div>
  );
}
