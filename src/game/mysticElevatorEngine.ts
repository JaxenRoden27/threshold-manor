import { betrayalFaceLabel } from "./diceEngine";
import { DIRECTION_DELTA, OPPOSITE, createTileId } from "./tileData";
import type { Direction, Floor, GameState, Player, Tile, TileSymbol } from "./types";

const ELEVATOR_DOOR_DIRS: Direction[] = ["north", "south", "east", "west"];

export interface OpenDoorway {
  placeX: number;
  placeY: number;
  elevatorDoor: Direction;
  anchorName: string;
}

export interface ElevatorPlacement {
  floor: Floor;
  x: number;
  y: number;
  door: Direction;
}

export function isMysticElevatorTile(tile: Tile): boolean {
  return (
    tile.special === "mystic-elevator" || tile.templateId === "mystic-elevator"
  );
}

export function elevatorFloorFromRoll(total: number): Floor | "pick" {
  if (total <= 1) return "basement";
  if (total === 2) return "ground";
  if (total === 3) return "upper";
  return "pick";
}

export function buildElevatorTile(
  floor: Floor,
  x: number,
  y: number,
  door: Direction
): Tile {
  const doors = { north: false, south: false, east: false, west: false };
  doors[door] = true;
  return {
    id: createTileId(floor, x, y),
    templateId: "mystic-elevator",
    name: "Mystic Elevator",
    pool: floor,
    floor,
    x,
    y,
    doors,
    visited: true,
    cardResolved: true,
    symbol: "none" as TileSymbol,
    special: "mystic-elevator",
  };
}

/** Open doorways = room door facing an empty cell on the given floor. */
export function findOpenDoorways(tiles: Tile[], floor: Floor): OpenDoorway[] {
  const floorTiles = tiles.filter((t) => t.floor === floor);
  const open: OpenDoorway[] = [];

  for (const tile of floorTiles) {
    if (isMysticElevatorTile(tile)) continue;
    for (const dir of ELEVATOR_DOOR_DIRS) {
      if (!tile.doors[dir]) continue;
      const { dx, dy } = DIRECTION_DELTA[dir];
      const nx = tile.x + dx;
      const ny = tile.y + dy;
      const blocked = floorTiles.some((t) => t.x === nx && t.y === ny);
      if (!blocked) {
        open.push({
          placeX: nx,
          placeY: ny,
          elevatorDoor: OPPOSITE[dir],
          anchorName: tile.name,
        });
      }
    }
  }
  return open;
}

export function pickElevatorPlacement(
  tiles: Tile[],
  targetFloor: Floor
): ElevatorPlacement | null {
  const doorways = findOpenDoorways(tiles, targetFloor);
  if (doorways.length === 0) return null;
  const pick = doorways[Math.floor(Math.random() * doorways.length)];
  return {
    floor: targetFloor,
    x: pick.placeX,
    y: pick.placeY,
    door: pick.elevatorDoor,
  };
}

export function playersOnTile(
  players: Player[],
  floor: Floor,
  x: number,
  y: number
): Player[] {
  return players.filter((p) => p.floor === floor && p.x === x && p.y === y);
}

function resolveSourceElevator(
  state: GameState
): Tile | undefined {
  const pending = state.pendingElevator;
  if (!pending) return undefined;

  const byId = state.tiles.find((t) => t.id === pending.sourceTileId);
  if (byId && isMysticElevatorTile(byId)) return byId;

  return state.tiles.find(
    (t) =>
      isMysticElevatorTile(t) &&
      t.floor === pending.sourceFloor &&
      t.x === pending.sourceX &&
      t.y === pending.sourceY
  );
}

function removeElevatorAt(
  tiles: Tile[],
  source: Tile
): Tile[] {
  return tiles.filter(
    (t) =>
      !(
        isMysticElevatorTile(t) &&
        t.floor === source.floor &&
        t.x === source.x &&
        t.y === source.y
      )
  );
}

export function beginElevatorSequence(
  state: GameState,
  elevatorTile: Tile,
  isTraitor: boolean
): GameState {
  const pending = {
    sourceTileId: elevatorTile.id,
    sourceFloor: elevatorTile.floor,
    sourceX: elevatorTile.x,
    sourceY: elevatorTile.y,
    phase: isTraitor ? ("pick-floor" as const) : ("roll" as const),
  };

  return {
    ...state,
    pendingElevator: pending,
    log: [
      ...state.log,
      isTraitor
        ? "The Mystic Elevator hums — the Traitor chooses a destination."
        : "The Mystic Elevator shudders — roll 2 dice to choose a floor.",
    ],
  };
}

export function completeElevatorRoll(
  state: GameState,
  dice: number[]
): GameState {
  const pending = state.pendingElevator;
  if (!pending || pending.phase !== "roll") return state;

  const total = dice.reduce((s, d) => s + d, 0);
  const floorResult = elevatorFloorFromRoll(total);
  const active = state.players[state.activePlayerIndex];

  if (floorResult === "pick") {
    return {
      ...state,
      pendingElevator: {
        ...pending,
        phase: "pick-floor",
        dice,
        total,
      },
      log: [
        ...state.log,
        `${active.name} rolls ${dice.map(betrayalFaceLabel).join(", ")} = ${total} — choose a floor.`,
      ],
    };
  }

  return executeElevatorMove(state, floorResult, dice, total);
}

export function completeElevatorFloorPick(
  state: GameState,
  floor: Floor
): GameState {
  const pending = state.pendingElevator;
  if (!pending || pending.phase !== "pick-floor") return state;
  return executeElevatorMove(state, floor, pending.dice, pending.total);
}

export function executeElevatorMove(
  state: GameState,
  targetFloor: Floor,
  dice?: number[],
  total?: number
): GameState {
  const pending = state.pendingElevator;
  if (!pending) return state;

  const sourceTile = resolveSourceElevator(state);
  if (!sourceTile) {
    return {
      ...state,
      pendingElevator: null,
      log: [
        ...state.log,
        "The Mystic Elevator vanishes from the map before it can relocate.",
      ],
    };
  }

  const occupants = playersOnTile(
    state.players,
    sourceTile.floor,
    sourceTile.x,
    sourceTile.y
  );

  const tilesWithoutElevator = removeElevatorAt(state.tiles, sourceTile);
  const placement = pickElevatorPlacement(tilesWithoutElevator, targetFloor);

  if (!placement) {
    const restored = [...tilesWithoutElevator, sourceTile];
    return {
      ...state,
      tiles: restored,
      pendingElevator: null,
      log: [
        ...state.log,
        `The Mystic Elevator groans — no open doorways on the ${targetFloor} floor. It stays put.`,
      ],
    };
  }

  const stillBlocked = tilesWithoutElevator.some(
    (t) =>
      t.floor === placement.floor &&
      t.x === placement.x &&
      t.y === placement.y
  );
  if (stillBlocked) {
    const restored = [...tilesWithoutElevator, sourceTile];
    return {
      ...state,
      tiles: restored,
      pendingElevator: null,
      log: [
        ...state.log,
        "The Mystic Elevator cannot dock — the chosen doorway is blocked.",
      ],
    };
  }

  const newElevator = buildElevatorTile(
    placement.floor,
    placement.x,
    placement.y,
    placement.door
  );

  const tiles = [...tilesWithoutElevator, newElevator];
  const occupantIds = new Set(occupants.map((p) => p.id));
  const players = state.players.map((p) =>
    occupantIds.has(p.id)
      ? { ...p, floor: placement.floor, x: placement.x, y: placement.y }
      : p
  );

  const activeAfter = players[state.activePlayerIndex];
  const floorLabel =
    targetFloor === "basement"
      ? "Basement"
      : targetFloor === "upper"
        ? "Upper"
        : "Ground";

  const rollLine =
    dice && total !== undefined
      ? ` (${dice.map(betrayalFaceLabel).join(", ")} = ${total})`
      : "";

  return {
    ...state,
    tiles,
    players,
    viewFloor: activeAfter.floor,
    pendingElevator: null,
    log: [
      ...state.log,
      `The Mystic Elevator${rollLine} docks on the ${floorLabel} floor (${placement.door} door) — ${occupants.length} traveler(s) aboard.`,
    ],
  };
}

/** Re-trigger while standing inside the elevator without leaving first. */
export function activateElevatorFromRoom(state: GameState): GameState {
  if (state.pendingElevator) return state;
  const active = state.players[state.activePlayerIndex];
  const tile = state.tiles.find(
    (t) =>
      t.floor === active.floor &&
      t.x === active.x &&
      t.y === active.y &&
      isMysticElevatorTile(t)
  );
  if (!tile) return state;
  return beginElevatorSequence(state, tile, active.isTraitor);
}
