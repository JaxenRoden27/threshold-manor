import type { Direction, Doors, TilePool } from "./types";

export interface TileTemplate {
  name: string;
  pool: TilePool;
  doors: Doors;
  weight: number;
}

const makeDoors = (n: boolean, s: boolean, e: boolean, w: boolean): Doors => ({
  north: n,
  south: s,
  east: e,
  west: w,
});

export const TILE_POOLS: Record<TilePool, TileTemplate[]> = {
  ground: [
    { name: "Grand Foyer", pool: "ground", doors: makeDoors(true, true, true, true), weight: 2 },
    { name: "Dusty Parlor", pool: "ground", doors: makeDoors(true, false, true, true), weight: 3 },
    { name: "Creaking Hall", pool: "ground", doors: makeDoors(true, true, false, true), weight: 3 },
    { name: "Servants' Pantry", pool: "ground", doors: makeDoors(false, true, true, false), weight: 2 },
    { name: "Coat Room", pool: "ground", doors: makeDoors(true, false, false, true), weight: 2 },
    { name: "Music Room", pool: "ground", doors: makeDoors(false, true, true, true), weight: 2 },
  ],
  upper: [
    { name: "Moonlit Balcony", pool: "upper", doors: makeDoors(true, true, false, false), weight: 2 },
    { name: "Guest Bedroom", pool: "upper", doors: makeDoors(true, false, true, true), weight: 3 },
    { name: "Nursery", pool: "upper", doors: makeDoors(false, true, true, false), weight: 2 },
    { name: "Attic Landing", pool: "upper", doors: makeDoors(true, true, true, false), weight: 2 },
    { name: "Portrait Gallery", pool: "upper", doors: makeDoors(false, false, true, true), weight: 2 },
    { name: "Spiral Stairwell", pool: "upper", doors: makeDoors(true, true, true, true), weight: 1 },
  ],
  basement: [
    { name: "Wine Cellar", pool: "basement", doors: makeDoors(true, false, true, true), weight: 3 },
    { name: "Boiler Room", pool: "basement", doors: makeDoors(true, true, false, false), weight: 2 },
    { name: "Root Vault", pool: "basement", doors: makeDoors(false, true, true, false), weight: 2 },
    { name: "Flooded Tunnels", pool: "basement", doors: makeDoors(true, false, false, true), weight: 2 },
    { name: "Ritual Chamber", pool: "basement", doors: makeDoors(false, true, false, true), weight: 1 },
    { name: "Collapsed Passage", pool: "basement", doors: makeDoors(true, true, false, true), weight: 2 },
  ],
};

export const ENTRANCE_TILE = {
  name: "Front Entrance",
  pool: "ground" as TilePool,
  doors: makeDoors(false, true, true, true),
};

export const OPPOSITE: Record<Direction, Direction> = {
  north: "south",
  south: "north",
  east: "west",
  west: "east",
};

export const DIRECTION_DELTA: Record<Direction, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 },
};

export function pickPool(clueCount: number): TilePool {
  const roll = Math.random();
  if (clueCount >= 2 && roll < 0.35) return "basement";
  if (clueCount >= 1 && roll < 0.55) return "upper";
  return "ground";
}

export function pickTileTemplate(pool: TilePool, requiredDoor: Direction): TileTemplate {
  const poolTiles = TILE_POOLS[pool].filter((t) => t.doors[requiredDoor]);
  const fallback = TILE_POOLS.ground.filter((t) => t.doors[requiredDoor]);
  const candidates = poolTiles.length > 0 ? poolTiles : fallback;
  const totalWeight = candidates.reduce((sum, t) => sum + t.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const tile of candidates) {
    roll -= tile.weight;
    if (roll <= 0) return tile;
  }
  return candidates[candidates.length - 1];
}

export function createTileId(x: number, y: number): string {
  return `tile-${x}-${y}`;
}
