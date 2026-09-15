import { OPPOSITE } from "./tileData";
import { playerStat } from "./statEngine";
import { registerVerticalDrop } from "./verticalTraversal";
import type { Direction, Floor, GameState, Player, Stat, Tile } from "./types";

const FLOOR_BELOW: Partial<Record<Floor, Floor>> = {
  upper: "ground",
  ground: "basement",
};

const BASEMENT_LANDING = { floor: "basement" as Floor, x: 0, y: 0 };

function tileAt(tiles: Tile[], floor: Floor, x: number, y: number): Tile | undefined {
  return tiles.find((t) => t.floor === floor && t.x === x && t.y === y);
}

function isTileEmpty(
  tiles: Tile[],
  players: Player[],
  floor: Floor,
  x: number,
  y: number,
  excludePlayerId?: string
): boolean {
  const occupied = players.some(
    (p) =>
      p.id !== excludePlayerId &&
      p.floor === floor &&
      p.x === x &&
      p.y === y
  );
  return !occupied;
}

export function handleCoalChuteEnter(
  state: GameState,
  playerIndex: number,
  sourceTile: Tile
): GameState {
  const player = state.players[playerIndex];
  const dest = BASEMENT_LANDING;
  const players = state.players.map((p, i) =>
    i === playerIndex ? { ...p, floor: dest.floor, x: dest.x, y: dest.y } : p
  );
  let next: GameState = {
    ...state,
    players,
    viewFloor: dest.floor,
    log: [
      ...state.log,
      `${player.name} plummets down the Coal Chute to the Basement Landing!`,
    ],
  };
  next = registerVerticalDrop(next, "coal-chute", {
    floor: sourceTile.floor,
    x: sourceTile.x,
    y: sourceTile.y,
  }, dest);
  return next;
}

export function handleGalleryEnter(
  state: GameState,
  playerIndex: number,
  tile: Tile
): GameState {
  const player = state.players[playerIndex];
  const belowFloor = FLOOR_BELOW[tile.floor];
  let dest = BASEMENT_LANDING;

  if (belowFloor) {
    const belowTile = tileAt(state.tiles, belowFloor, tile.x, tile.y);
    if (
      belowTile &&
      isTileEmpty(state.tiles, state.players, belowFloor, tile.x, tile.y, player.id)
    ) {
      dest = { floor: belowFloor, x: tile.x, y: tile.y };
    }
  }

  const players = state.players.map((p, i) =>
    i === playerIndex
      ? { ...p, floor: dest.floor, x: dest.x, y: dest.y }
      : p
  );

  let next: GameState = {
    ...state,
    players,
    viewFloor: dest.floor,
    log: [
      ...state.log,
      `${player.name} crashes through the Portrait Gallery floor!`,
    ],
  };

  return registerVerticalDrop(
    next,
    "gallery",
    { floor: tile.floor, x: tile.x, y: tile.y },
    dest
  );
}

export function handleCollapsedRoomEnter(
  state: GameState,
  playerIndex: number,
  tile: Tile
): GameState {
  const player = state.players[playerIndex];
  if (playerStat(player, "speed") >= 4) {
    return {
      ...state,
      log: [
        ...state.log,
        `${player.name} scrambles through the Collapsed Room with ease (Speed 4+).`,
      ],
    };
  }

  const belowFloor = FLOOR_BELOW[tile.floor];
  let dest = BASEMENT_LANDING;

  if (belowFloor) {
    const belowTile = tileAt(state.tiles, belowFloor, tile.x, tile.y);
    if (
      belowTile &&
      isTileEmpty(state.tiles, state.players, belowFloor, tile.x, tile.y, player.id)
    ) {
      dest = { floor: belowFloor, x: tile.x, y: tile.y };
    }
  } else if (
    isTileEmpty(state.tiles, state.players, dest.floor, dest.x, dest.y, player.id)
  ) {
    dest = BASEMENT_LANDING;
  } else {
    return {
      ...state,
      log: [
        ...state.log,
        `${player.name} is trapped in the Collapsed Room — the way down is blocked.`,
      ],
    };
  }

  const players = state.players.map((p, i) =>
    i === playerIndex
      ? { ...p, floor: dest.floor, x: dest.x, y: dest.y }
      : p
  );

  let next: GameState = {
    ...state,
    players,
    viewFloor: dest.floor,
    log: [
      ...state.log,
      `${player.name} plunges through the Collapsed Room!`,
    ],
  };

  return registerVerticalDrop(
    next,
    "collapsed-room",
    { floor: tile.floor, x: tile.x, y: tile.y },
    dest
  );
}

export function getBarrierExitDirections(tile: Tile): Direction[] {
  if (!tile.barrierStat) return [];
  const dirs = (["north", "south", "east", "west"] as Direction[]).filter(
    (d) => tile.doors[d]
  );
  if (dirs.length !== 2) return dirs;
  if (OPPOSITE[dirs[0]] === dirs[1]) return dirs;
  return dirs;
}

export function isBarrierCrossing(
  tile: Tile,
  enteredFrom: Direction | undefined,
  exitDirection: Direction
): boolean {
  if (!tile.barrierStat || !enteredFrom) return false;
  const exits = getBarrierExitDirections(tile);
  if (exits.length === 2 && OPPOSITE[exits[0]] === exits[1]) {
    return exitDirection !== enteredFrom && tile.doors[exitDirection];
  }
  return (
    exitDirection !== enteredFrom &&
    tile.doors[exitDirection] &&
    OPPOSITE[exitDirection] === enteredFrom
  );
}

export function canCrossBarrier(player: Player, tile: Tile): boolean {
  if (!tile.barrierStat) return true;
  const stat = tile.barrierStat.stat;
  const min = tile.barrierStat.min;
  return playerStat(player, stat) >= min;
}

export function barrierFailMessage(player: Player, tile: Tile): string {
  const { stat, min } = tile.barrierStat!;
  return `${player.name} cannot cross the ${tile.name} (${stat} ${min}+ required, has ${playerStat(player, stat)}).`;
}

export function withEnteredFrom(
  players: Player[],
  playerIndex: number,
  fromDirection: Direction
): Player[] {
  return players.map((p, i) =>
    i === playerIndex ? { ...p, enteredFrom: fromDirection } : p
  );
}
