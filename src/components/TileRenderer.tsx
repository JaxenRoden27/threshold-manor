"use client";

import { useCallback, useState } from "react";
import type { Direction, Floor, Player, Tile, TileSymbol } from "@/game/types";
import { DIRECTION_DELTA } from "@/game/tileData";
import {
  getFloorLightingClass,
  getProceduralFallbackUrl,
  getRoomAssetPath,
  markAssetFailed,
  shouldUseFallback,
} from "@/rendering/roomAssetManager";

export const TILE_RENDER_SIZE = 88;

const WALL_THICKNESS = 6;

const SYMBOL_ICONS: Record<Exclude<TileSymbol, "none">, { icon: string; color: string }> = {
  event: { icon: "⚡", color: "text-amber-300" },
  item: { icon: "◆", color: "text-sky-300" },
  omen: { icon: "☽", color: "text-rose-300" },
};

const PLAYER_COLORS = ["#fbbf24", "#38bdf8", "#a78bfa", "#34d399"];

interface TileRendererProps {
  tile: Tile;
  players: Player[];
  activePlayerId: string | undefined;
  allTiles: Tile[];
  showUnexploredFog?: boolean;
  isActiveTile?: boolean;
}

export function TileRenderer({
  tile,
  players,
  activePlayerId,
  allTiles,
  showUnexploredFog = false,
  isActiveTile = false,
}: TileRendererProps) {
  const roomId = tile.templateId;
  const assetPath = getRoomAssetPath(roomId, tile.floor);
  const useFallback = shouldUseFallback(roomId, tile.floor);
  const [imgFailed, setImgFailed] = useState(useFallback);

  const onImgError = useCallback(() => {
    markAssetFailed(roomId, tile.floor);
    setImgFailed(true);
  }, [roomId, tile.floor]);

  const bgSrc = imgFailed
    ? getProceduralFallbackUrl(roomId, tile.floor)
    : assetPath;

  const playersHere = players.filter(
    (p) => p.floor === tile.floor && p.x === tile.x && p.y === tile.y
  );

  const showSymbol =
    tile.symbol !== "none" &&
    tile.visited &&
    !tile.cardResolved &&
    tile.symbol in SYMBOL_ICONS;

  return (
    <div
      className={`tile-renderer relative overflow-hidden rounded-md ${isActiveTile ? "tile-active-pulse" : ""}`}
      style={{ width: TILE_RENDER_SIZE - 8, height: TILE_RENDER_SIZE - 8 }}
    >
      {/* Layer 1: background image or procedural fallback */}
      <div className="absolute inset-0">
        <img
          src={bgSrc}
          alt=""
          className="h-full w-full object-cover"
          onError={onImgError}
          draggable={false}
        />
      </div>

      {/* Layer 2: floor lighting */}
      <div
        className={`pointer-events-none absolute inset-0 ${getFloorLightingClass(tile.floor)}`}
      />

      {/* Layer 3: walls and door arches */}
      <DoorWalls doors={tile.doors} />

      {/* Unexplored doorway fog from active player perspective */}
      {showUnexploredFog && (
        <UnexploredDoorFog tile={tile} allTiles={allTiles} />
      )}

      {/* Layer 4: room label */}
      <div className="pointer-events-none absolute inset-x-0 top-1 z-10 px-1 text-center">
        <span className="text-[9px] font-semibold leading-tight text-stone-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          {tile.name}
        </span>
        {tile.special && (
          <span className="ml-0.5 text-[7px] text-amber-300/90">★</span>
        )}
      </div>

      {/* Symbol overlay */}
      {showSymbol && (
        <div
          className={`pointer-events-none absolute left-1 top-1 z-10 text-sm ${SYMBOL_ICONS[tile.symbol as Exclude<TileSymbol, "none">].color} drop-shadow-md`}
          title={tile.symbol}
        >
          {SYMBOL_ICONS[tile.symbol as Exclude<TileSymbol, "none">].icon}
        </div>
      )}

      {tile.isLocked && (
        <div className="pointer-events-none absolute right-1 top-1 z-10 text-[10px] text-amber-400" title="Locked">
          🔒
        </div>
      )}

      {tile.barrierStat && (
        <div
          className="pointer-events-none absolute bottom-1 left-1 z-10 rounded bg-stone-950/70 px-1 text-[7px] text-rose-300"
          title={`Barrier: ${tile.barrierStat.stat} ${tile.barrierStat.min}+`}
        >
          ⛨ {tile.barrierStat.stat.slice(0, 1).toUpperCase()}
          {tile.barrierStat.min}
        </div>
      )}

      {/* Player tokens */}
      <div className="pointer-events-none absolute inset-x-0 bottom-1 z-10 flex justify-center gap-0.5">
        {playersHere.map((p, i) => {
          const isActive = p.id === activePlayerId;
          const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
          return (
            <div
              key={p.id}
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 text-[8px] font-bold text-stone-900 shadow-md ${
                isActive ? "border-amber-200 ring-1 ring-amber-400/60" : "border-stone-600"
              }`}
              style={{ backgroundColor: color }}
              title={p.name}
            >
              {p.name.charAt(0)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DoorWalls({ doors }: { doors: Tile["doors"] }) {
  const wall = "absolute bg-stone-950/85";
  const arch = "absolute bg-stone-800/40 border border-amber-900/50";

  return (
    <>
      {!doors.north && (
        <div className={`${wall} inset-x-0 top-0 h-[${WALL_THICKNESS}px]`} style={{ height: WALL_THICKNESS }} />
      )}
      {doors.north && (
        <div
          className={`${arch} left-1/2 top-0 -translate-x-1/2 rounded-b-md`}
          style={{ width: 22, height: WALL_THICKNESS + 2 }}
        />
      )}
      {!doors.south && (
        <div className={`${wall} inset-x-0 bottom-0`} style={{ height: WALL_THICKNESS }} />
      )}
      {doors.south && (
        <div
          className={`${arch} bottom-0 left-1/2 -translate-x-1/2 rounded-t-md`}
          style={{ width: 22, height: WALL_THICKNESS + 2 }}
        />
      )}
      {!doors.west && (
        <div className={`${wall} left-0 top-0 bottom-0`} style={{ width: WALL_THICKNESS }} />
      )}
      {doors.west && (
        <div
          className={`${arch} left-0 top-1/2 -translate-y-1/2 rounded-r-md`}
          style={{ width: WALL_THICKNESS + 2, height: 22 }}
        />
      )}
      {!doors.east && (
        <div className={`${wall} right-0 top-0 bottom-0`} style={{ width: WALL_THICKNESS }} />
      )}
      {doors.east && (
        <div
          className={`${arch} right-0 top-1/2 -translate-y-1/2 rounded-l-md`}
          style={{ width: WALL_THICKNESS + 2, height: 22 }}
        />
      )}
    </>
  );
}

function UnexploredDoorFog({
  tile,
  allTiles,
}: {
  tile: Tile;
  allTiles: Tile[];
}) {
  const fogDirs: Direction[] = [];

  for (const dir of ["north", "south", "east", "west"] as Direction[]) {
    if (!tile.doors[dir]) continue;
    const { dx, dy } = DIRECTION_DELTA[dir];
    const adjacent = allTiles.some(
      (t) =>
        t.floor === tile.floor &&
        t.x === tile.x + dx &&
        t.y === tile.y + dy
    );
    if (!adjacent) fogDirs.push(dir);
  }

  if (fogDirs.length === 0) return null;

  const fogPos: Record<Direction, string> = {
    north: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/3",
    south: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/3",
    east: "right-0 top-1/2 translate-x-1/3 -translate-y-1/2",
    west: "left-0 top-1/2 -translate-x-1/3 -translate-y-1/2",
  };

  return (
    <>
      {fogDirs.map((dir) => (
        <div
          key={dir}
          className={`pointer-events-none absolute z-20 h-8 w-8 rounded-full ${fogPos[dir]} unexplored-door-fog`}
        />
      ))}
    </>
  );
}

export function getUnexploredFogTileIds(
  activeTile: Tile | undefined,
  allTiles: Tile[],
  floor: Floor
): Set<string> {
  const ids = new Set<string>();
  if (!activeTile || activeTile.floor !== floor) return ids;

  for (const dir of ["north", "south", "east", "west"] as Direction[]) {
    if (!activeTile.doors[dir]) continue;
    const { dx, dy } = DIRECTION_DELTA[dir];
    const nx = activeTile.x + dx;
    const ny = activeTile.y + dy;
    const adjacent = allTiles.find(
      (t) => t.floor === floor && t.x === nx && t.y === ny
    );
    if (adjacent) ids.add(adjacent.id);
  }
  return ids;
}
