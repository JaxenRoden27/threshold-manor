"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { useMultiplayerStore } from "@/store/multiplayerStore";
import { useGameActions } from "@/hooks/useGameActions";
import type { Direction, Floor, Player, Tile } from "@/game/types";
import { DIRECTION_DELTA, FLOOR_LABELS } from "@/game/tileData";
import { getVerticalMoveOptions } from "@/game/verticalTraversal";
import {
  TILE_RENDER_SIZE,
  TileRenderer,
} from "@/components/TileRenderer";
import { Button } from "@/components/ui/button";
import { HauntActionsPanel } from "@/components/HauntActionsPanel";

const MAP_PADDING = 40;

const FLOORS: Floor[] = ["ground", "upper", "basement"];

const DIRECTION_KEY_LABEL: Record<Direction, string> = {
  north: "W",
  west: "A",
  south: "S",
  east: "D",
};

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement;
  return (
    el?.tagName === "INPUT" ||
    el?.tagName === "TEXTAREA" ||
    el?.isContentEditable
  );
}

export function GameBoard() {
  const gameState = useGameStore();
  const {
    tiles,
    players,
    activePlayerIndex,
    phase,
    viewFloor,
  } = gameState;
  const {
    move,
    useFloorTransition,
    activateElevator,
    performVerticalMove,
    setViewFloor,
    endTurn,
    canAct,
    inputBlocked,
    modalBlocked,
  } = useGameActions();

  const active = players[activePlayerIndex];

  const [displayFloor, setDisplayFloor] = useState<Floor>(viewFloor);
  const [floorTransitioning, setFloorTransitioning] = useState(false);
  const prevFloorRef = useRef(viewFloor);

  useEffect(() => {
    if (viewFloor === prevFloorRef.current) return;
    setFloorTransitioning(true);
    const swapTimer = setTimeout(() => {
      setDisplayFloor(viewFloor);
      prevFloorRef.current = viewFloor;
      const endTimer = setTimeout(() => setFloorTransitioning(false), 250);
      return () => clearTimeout(endTimer);
    }, 200);
    return () => clearTimeout(swapTimer);
  }, [viewFloor]);

  const floorTiles = useMemo(
    () => tiles.filter((t) => t.floor === displayFloor),
    [tiles, displayFloor]
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
    !modalBlocked() &&
    active?.ap > 0 &&
    active.floor === viewFloor &&
    canAct();

  const canEndTurnWithSpace =
    (phase === "exploration" || phase === "HAUNT_ACTIVE") &&
    !modalBlocked() &&
    active?.ap === 0 &&
    canAct();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      const state = useGameStore.getState();
      const currentActive = state.players[state.activePlayerIndex];
      const { mode, canLocalAct } = useMultiplayerStore.getState();
      const mayAct = mode === "local" || canLocalAct();

      const blocked =
        state.pendingCard ||
        state.combat ||
        state.pendingTransition ||
        state.pendingVaultLockpick ||
        state.pendingElevator ||
        state.pendingVertical;

      if (
        (e.key === " " || e.code === "Space") &&
        !blocked &&
        mayAct &&
        (state.phase === "exploration" || state.phase === "HAUNT_ACTIVE") &&
        currentActive?.ap === 0
      ) {
        e.preventDefault();
        endTurn();
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

      const tile = state.tiles.find(
        (t) =>
          t.floor === currentActive?.floor &&
          t.x === currentActive?.x &&
          t.y === currentActive?.y
      );

      const movementAllowed =
        (state.phase === "exploration" || state.phase === "HAUNT_ACTIVE") &&
        !blocked &&
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
  }, [move, endTurn]);

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

  const onElevator =
    currentTile?.special === "mystic-elevator" ||
    currentTile?.templateId === "mystic-elevator";
  const canActivateElevator =
    (phase === "exploration" || phase === "HAUNT_ACTIVE") &&
    onElevator &&
    !modalBlocked() &&
    active?.floor === viewFloor &&
    canAct();

  const verticalOptions = useMemo(() => {
    if (!active || modalBlocked() || !canAct()) return [];
    return getVerticalMoveOptions(gameState, activePlayerIndex);
  }, [active, activePlayerIndex, gameState, canAct, modalBlocked]);

  const width =
    (bounds.maxX - bounds.minX + 1) * TILE_RENDER_SIZE + MAP_PADDING * 2;
  const height =
    (bounds.maxY - bounds.minY + 1) * TILE_RENDER_SIZE + MAP_PADDING * 2;

  const playersOnFloor = players.filter((p) => p.floor === viewFloor);

  const activeTileOnView =
    active?.floor === displayFloor ? currentTile : undefined;

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

      <div className="relative overflow-auto rounded-lg border border-stone-700 bg-stone-950/90 p-4">
        {floorTransitioning && (
          <div className="absolute inset-0 z-30 floor-transition-overlay" />
        )}
        {floorTiles.length === 0 ? (
          <p className="py-8 text-center text-sm text-stone-500">
            No rooms discovered on {FLOOR_LABELS[displayFloor]} yet.
          </p>
        ) : (
          <div
            className="relative mx-auto transition-opacity duration-300"
            style={{
              width,
              height,
              minWidth: width,
              minHeight: height,
              opacity: floorTransitioning ? 0.7 : 1,
            }}
          >
            {floorTiles.map((tile) => {
              const left =
                (tile.x - bounds.minX) * TILE_RENDER_SIZE + MAP_PADDING;
              const top =
                (tile.y - bounds.minY) * TILE_RENDER_SIZE + MAP_PADDING;
              const isActiveTile = activeTileOnView?.id === tile.id;

              return (
                <div
                  key={tile.id}
                  className="absolute"
                  style={{ left, top }}
                >
                  <TileRenderer
                    tile={tile}
                    players={players}
                    activePlayerId={active?.id}
                    allTiles={tiles}
                    showUnexploredFog={isActiveTile}
                    isActiveTile={isActiveTile}
                  />
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
          {currentTile?.special === "grand-staircase"
            ? "Climb to Upper Landing (1 AP)"
            : currentTile?.special === "upper-landing"
              ? "Descend to Grand Staircase (1 AP)"
              : "Use floor transition (1 AP)"}
        </Button>
      )}

      {canActivateElevator && (
        <Button
          variant="outline"
          className="w-full border-violet-500 text-violet-200"
          onClick={activateElevator}
        >
          Activate Mystic Elevator
        </Button>
      )}

      {verticalOptions.length > 0 && (
        <div className="flex flex-col gap-2">
          {verticalOptions.map((option) => (
            <Button
              key={option.id}
              variant="outline"
              className="w-full border-emerald-700 text-emerald-200"
              onClick={() => performVerticalMove(option.id)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}

      {canMove && availableDirections.length > 0 && (
        <div className="rounded-lg border border-amber-700/40 bg-stone-900/80 p-3">
          <p className="mb-2 text-center text-xs font-medium text-amber-200">
            Choose a doorway · WASD or arrows · 1 AP · symbol rooms stop your move
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

      {canEndTurnWithSpace && (
        <p className="text-center text-xs text-stone-500">
          0 AP — press <kbd className="rounded border border-stone-600 px-1.5 py-0.5 font-mono text-amber-300">Space</kbd> or End Turn
        </p>
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
          ? `${keyLabel} — explore ${direction} (1 AP)`
          : `${keyLabel} — move ${direction} (1 AP)`
      }
    >
      {keyLabel}
    </Button>
  );
}
