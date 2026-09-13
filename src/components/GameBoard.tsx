"use client";

import { useMemo } from "react";
import { useGameStore } from "@/store/gameStore";
import type { Direction, Player, Tile } from "@/game/types";
import { DIRECTION_DELTA } from "@/game/tileData";
import { Button } from "@/components/ui/button";

const TILE_SIZE = 88;
const MAP_PADDING = 40;
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

  const width = (bounds.maxX - bounds.minX + 1) * TILE_SIZE + MAP_PADDING * 2;
  const height = (bounds.maxY - bounds.minY + 1) * TILE_SIZE + MAP_PADDING * 2;

  const currentTile = active
    ? tiles.find((t) => t.x === active.x && t.y === active.y)
    : undefined;

  const availableDirections = (["north", "south", "east", "west"] as Direction[]).filter(
    (dir) => currentTile?.doors[dir]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-auto rounded-lg border border-stone-700 bg-stone-950/90 p-4">
        <div
          className="relative mx-auto"
          style={{ width, height, minWidth: width, minHeight: height }}
        >
          {tiles.map((tile) => {
            const left = (tile.x - bounds.minX) * TILE_SIZE + MAP_PADDING;
            const top = (tile.y - bounds.minY) * TILE_SIZE + MAP_PADDING;
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

        </div>
      </div>

      {canMove && availableDirections.length > 0 && (
        <div className="rounded-lg border border-amber-700/40 bg-stone-900/80 p-3">
          <p className="mb-2 text-center text-xs font-medium text-amber-200">
            Choose a doorway · costs 1 AP
          </p>
          <div className="mx-auto grid w-fit grid-cols-3 gap-2">
            <div />
            {currentTile?.doors.north ? (
              <DirectionButton
                direction="north"
                active={active!}
                tiles={tiles}
                onMove={move}
              />
            ) : (
              <div />
            )}
            <div />
            {currentTile?.doors.west ? (
              <DirectionButton
                direction="west"
                active={active!}
                tiles={tiles}
                onMove={move}
              />
            ) : (
              <div />
            )}
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-stone-700 text-[10px] text-stone-500">
              You
            </div>
            {currentTile?.doors.east ? (
              <DirectionButton
                direction="east"
                active={active!}
                tiles={tiles}
                onMove={move}
              />
            ) : (
              <div />
            )}
            <div />
            {currentTile?.doors.south ? (
              <DirectionButton
                direction="south"
                active={active!}
                tiles={tiles}
                onMove={move}
              />
            ) : (
              <div />
            )}
            <div />
          </div>
        </div>
      )}

      {unexploredDoors.length > 0 && (
        <p className="text-xs text-stone-500">
          {unexploredDoors.length} unexplored doorway
          {unexploredDoors.length !== 1 ? "s" : ""} on the map.
        </p>
      )}
    </div>
  );
}

function DirectionButton({
  direction,
  active,
  tiles,
  onMove,
}: {
  direction: Direction;
  active: Player;
  tiles: Tile[];
  onMove: (dir: Direction) => void;
}) {
  const { dx, dy } = DIRECTION_DELTA[direction];
  const unexplored = !tiles.some(
    (t) => t.x === active.x + dx && t.y === active.y + dy
  );
  const label = direction.charAt(0).toUpperCase();

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-10 w-10 border-amber-500 bg-amber-950/60 p-0 text-sm font-bold text-amber-100 shadow-sm hover:bg-amber-900/80"
      onClick={() => onMove(direction)}
      title={
        unexplored ? `Explore ${direction} (1 AP)` : `Move ${direction} (1 AP)`
      }
    >
      {label}
      {unexplored ? "?" : ""}
    </Button>
  );
}
