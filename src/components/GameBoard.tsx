"use client";

import { useEffect, useMemo } from "react";
import { useGameStore } from "@/store/gameStore";
import { useMultiplayerStore } from "@/store/multiplayerStore";
import { useGameActions } from "@/hooks/useGameActions";
import type { Direction, Floor, Player, Tile } from "@/game/types";
import { DIRECTION_DELTA, FLOOR_LABELS } from "@/game/tileData";
import { Button } from "@/components/ui/button";
import { HauntActionsPanel } from "@/components/HauntActionsPanel";

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

const FLOORS: Floor[] = ["ground", "upper", "basement"];

const DIRECTION_KEY_LABEL: Record<Direction, string> = {
  north: "W",
  west: "A",
  south: "S",
  east: "D",
};

export function GameBoard() {
  const {
    tiles,
    players,
    activePlayerIndex,
    phase,
    pendingCard,
    viewFloor,
  } = useGameStore();
  const {
    move,
    useFloorTransition,
    setViewFloor,
    canAct,
    inputBlocked,
    combatBlocked,
  } = useGameActions();

  const active = players[activePlayerIndex];

  const floorTiles = useMemo(
    () => tiles.filter((t) => t.floor === viewFloor),
    [tiles, viewFloor]
  );

  const bounds = useMemo(() => {
    if (floorTiles.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }
    const xs = floorTiles.map((t) => t.x);
    const ys = floorTiles.map((t) => t.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }, [floorTiles]);

  const canMove =
    (phase === "exploration" || phase === "HAUNT_ACTIVE") &&
    !inputBlocked() &&
    !combatBlocked() &&
    active?.ap > 0 &&
    active.floor === viewFloor &&
    canAct();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const keyToDirection: Record<string, Direction> = {
        w: "north",
        W: "north",
        ArrowUp: "north",
        s: "south",
        S: "south",
        ArrowDown: "south",
        a: "west",
        A: "west",
        ArrowLeft: "west",
        d: "east",
        D: "east",
        ArrowRight: "east",
      };

      const direction = keyToDirection[e.key];
      if (!direction) return;

      const state = useGameStore.getState();
      const currentActive = state.players[state.activePlayerIndex];
      const tile = state.tiles.find(
        (t) =>
          t.floor === currentActive?.floor &&
          t.x === currentActive?.x &&
          t.y === currentActive?.y
      );

      const { mode, canLocalAct } = useMultiplayerStore.getState();
      const mayAct = mode === "local" || canLocalAct();

      const movementAllowed =
        (state.phase === "exploration" || state.phase === "HAUNT_ACTIVE") &&
        !state.pendingCard &&
        !state.combat &&
        currentActive?.ap > 0 &&
        currentActive.floor === state.viewFloor &&
        mayAct &&
        tile?.doors[direction];

      if (!movementAllowed) return;

      e.preventDefault();
      move(direction);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [move]);

  const currentTile = active
    ? tiles.find(
        (t) =>
          t.floor === active.floor && t.x === active.x && t.y === active.y
      )
    : undefined;

  const availableDirections = (["north", "south", "east", "west"] as Direction[]).filter(
    (dir) => currentTile?.doors[dir]
  );

  const canUseTransition =
    canMove && Boolean(currentTile?.floorLink) && active?.floor === viewFloor;

  const width = (bounds.maxX - bounds.minX + 1) * TILE_SIZE + MAP_PADDING * 2;
  const height = (bounds.maxY - bounds.minY + 1) * TILE_SIZE + MAP_PADDING * 2;

  const playersOnFloor = players.filter((p) => p.floor === viewFloor);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {FLOORS.map((floor) => (
          <Button
            key={floor}
            size="sm"
            variant={viewFloor === floor ? "default" : "outline"}
            className={
              viewFloor === floor
                ? "bg-amber-800 text-amber-50"
                : "border-stone-600 text-stone-300"
            }
            onClick={() => setViewFloor(floor)}
          >
            {FLOOR_LABELS[floor]}
            {playersOnFloor.some((p) => p.floor === floor) && (
              <span className="ml-1 text-[10px] opacity-70">●</span>
            )}
          </Button>
        ))}
      </div>

      {viewFloor !== active?.floor && (
        <p className="text-xs text-stone-500">
          Viewing {FLOOR_LABELS[viewFloor]}. {active?.name} is on{" "}
          {FLOOR_LABELS[active?.floor ?? "ground"]}.
        </p>
      )}

      <div className="overflow-auto rounded-lg border border-stone-700 bg-stone-950/90 p-4">
        {floorTiles.length === 0 ? (
          <p className="py-8 text-center text-sm text-stone-500">
            No rooms discovered on {FLOOR_LABELS[viewFloor]} yet.
          </p>
        ) : (
          <div
            className="relative mx-auto"
            style={{ width, height, minWidth: width, minHeight: height }}
          >
            {floorTiles.map((tile) => {
              const left = (tile.x - bounds.minX) * TILE_SIZE + MAP_PADDING;
              const top = (tile.y - bounds.minY) * TILE_SIZE + MAP_PADDING;
              const playersHere = players.filter(
                (p) =>
                  p.floor === tile.floor && p.x === tile.x && p.y === tile.y
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
                  {tile.special && (
                    <span className="text-[8px] text-amber-300/80">★</span>
                  )}
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
        )}
      </div>

      {canUseTransition && (
        <Button
          variant="outline"
          className="w-full border-violet-600 text-violet-200"
          onClick={useFloorTransition}
        >
          {currentTile?.special === "coal-chute"
            ? "Slide down Coal Chute (1 AP)"
            : currentTile?.special === "grand-staircase"
              ? "Climb to Upper Landing (1 AP)"
              : currentTile?.special === "upper-landing"
                ? "Descend to Grand Staircase (1 AP)"
                : "Use floor transition (1 AP)"}
        </Button>
      )}

      {canMove && availableDirections.length > 0 && (
        <div className="rounded-lg border border-amber-700/40 bg-stone-900/80 p-3">
          <p className="mb-2 text-center text-xs font-medium text-amber-200">
            Choose a doorway · WASD or arrows · 1 AP · new rooms end your move
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

      <HauntActionsPanel />

      {inputBlocked() && (
        <p className="text-center text-xs text-amber-400/80">
          Resolve the card before moving again.
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
    (t) =>
      t.floor === active.floor &&
      t.x === active.x + dx &&
      t.y === active.y + dy
  );
  const keyLabel = DIRECTION_KEY_LABEL[direction];

  return (
    <Button
      size="sm"
      variant="outline"
      className={`h-10 w-10 border-amber-500 bg-amber-950/60 p-0 text-sm font-bold text-amber-100 shadow-sm hover:bg-amber-900/80 ${
        unexplored ? "ring-1 ring-amber-400/50" : ""
      }`}
      onClick={() => onMove(direction)}
      title={
        unexplored
          ? `${keyLabel} — explore ${direction} (1 AP, then stop)`
          : `${keyLabel} — move ${direction} (1 AP)`
      }
    >
      {keyLabel}
    </Button>
  );
}
