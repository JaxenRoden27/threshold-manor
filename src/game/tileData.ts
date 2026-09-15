import type { Direction, Doors, Floor, Stat, Tile, TileSymbol } from "./types";

export interface TileTemplate {
  id: string;
  name: string;
  pool: Floor;
  allowedFloors: Floor[];
  doors: Doors;
  weight: number;
  symbol: TileSymbol;
  special?: Tile["special"];
  floorLink?: Tile["floorLink"];
  isLocked?: boolean;
  turnEndBuff?: Stat;
  barrierStat?: Tile["barrierStat"];
}

const makeDoors = (n: boolean, s: boolean, e: boolean, w: boolean): Doors => ({
  north: n,
  south: s,
  east: e,
  west: w,
});

export const STARTER_TEMPLATE_IDS = new Set([
  "entrance-hall",
  "foyer",
  "grand-staircase",
  "upper-landing",
  "basement-landing",
]);

export const STARTER_TILES: TileTemplate[] = [
  {
    id: "entrance-hall",
    name: "Entrance Hall",
    pool: "ground",
    allowedFloors: ["ground"],
    doors: makeDoors(false, true, true, true),
    weight: 0,
    symbol: "none",
    special: "entrance-hall",
  },
  {
    id: "foyer",
    name: "Foyer",
    pool: "ground",
    allowedFloors: ["ground"],
    doors: makeDoors(true, true, true, true),
    weight: 0,
    symbol: "none",
    special: "foyer",
  },
  {
    id: "grand-staircase",
    name: "Grand Staircase",
    pool: "ground",
    allowedFloors: ["ground"],
    doors: makeDoors(true, false, true, true),
    weight: 0,
    symbol: "none",
    special: "grand-staircase",
    floorLink: { floor: "upper", x: 0, y: 2 },
  },
  {
    id: "upper-landing",
    name: "Upper Landing",
    pool: "upper",
    allowedFloors: ["upper"],
    doors: makeDoors(false, true, true, true),
    weight: 0,
    symbol: "none",
    special: "upper-landing",
    floorLink: { floor: "ground", x: 0, y: 2 },
  },
  {
    id: "basement-landing",
    name: "Basement Landing",
    pool: "basement",
    allowedFloors: ["basement"],
    doors: makeDoors(false, true, true, true),
    weight: 0,
    symbol: "none",
    special: "basement-landing",
    floorLink: { floor: "ground", x: 0, y: 1 },
  },
];

export const EXPLORATION_TILES: TileTemplate[] = [
  { id: "dusty-parlor", name: "Dusty Parlor", pool: "ground", allowedFloors: ["ground"], doors: makeDoors(true, false, true, true), weight: 3, symbol: "event" },
  { id: "creaking-hall", name: "Creaking Hall", pool: "ground", allowedFloors: ["ground"], doors: makeDoors(true, true, false, true), weight: 3, symbol: "event" },
  { id: "servants-pantry", name: "Servants' Pantry", pool: "ground", allowedFloors: ["ground"], doors: makeDoors(false, true, true, false), weight: 2, symbol: "item" },
  { id: "coat-room", name: "Coat Room", pool: "ground", allowedFloors: ["ground"], doors: makeDoors(true, false, false, true), weight: 2, symbol: "item" },
  { id: "music-room", name: "Music Room", pool: "ground", allowedFloors: ["ground"], doors: makeDoors(false, true, true, true), weight: 2, symbol: "omen" },
  { id: "larder", name: "Larder", pool: "ground", allowedFloors: ["ground"], doors: makeDoors(true, false, true, false), weight: 1, symbol: "none", turnEndBuff: "might" },
  { id: "chapel", name: "Chapel", pool: "ground", allowedFloors: ["ground"], doors: makeDoors(false, true, false, true), weight: 1, symbol: "none", turnEndBuff: "sanity" },
  { id: "coal-chute", name: "Coal Chute", pool: "ground", allowedFloors: ["ground"], doors: makeDoors(true, false, false, true), weight: 1, symbol: "none", special: "coal-chute" },
  { id: "mystic-elevator", name: "Mystic Elevator", pool: "ground", allowedFloors: ["ground", "upper", "basement"], doors: makeDoors(true, false, false, false), weight: 1, symbol: "none", special: "mystic-elevator" },
  { id: "chasm", name: "Chasm", pool: "ground", allowedFloors: ["ground"], doors: makeDoors(true, true, false, false), weight: 1, symbol: "event", special: "chasm", barrierStat: { stat: "might", min: 4 } },
  { id: "collapsed-room", name: "Collapsed Room", pool: "upper", allowedFloors: ["upper"], doors: makeDoors(true, true, true, false), weight: 1, symbol: "none", special: "collapsed-room" },
  { id: "moonlit-balcony", name: "Moonlit Balcony", pool: "upper", allowedFloors: ["upper"], doors: makeDoors(true, true, false, false), weight: 2, symbol: "omen" },
  { id: "guest-bedroom", name: "Guest Bedroom", pool: "upper", allowedFloors: ["upper"], doors: makeDoors(true, false, true, true), weight: 3, symbol: "event" },
  { id: "nursery", name: "Nursery", pool: "upper", allowedFloors: ["upper"], doors: makeDoors(false, true, true, false), weight: 2, symbol: "omen" },
  { id: "attic-landing", name: "Attic Landing", pool: "upper", allowedFloors: ["upper"], doors: makeDoors(true, true, true, false), weight: 2, symbol: "none" },
  { id: "portrait-gallery", name: "Portrait Gallery", pool: "upper", allowedFloors: ["upper"], doors: makeDoors(false, false, true, true), weight: 2, symbol: "event" },
  { id: "spiral-stairwell", name: "Spiral Stairwell", pool: "upper", allowedFloors: ["upper"], doors: makeDoors(true, true, true, true), weight: 1, symbol: "none" },
  { id: "gymnasium", name: "Gymnasium", pool: "upper", allowedFloors: ["upper"], doors: makeDoors(true, false, true, true), weight: 1, symbol: "none", turnEndBuff: "speed" },
  { id: "library", name: "Library", pool: "upper", allowedFloors: ["upper"], doors: makeDoors(false, true, true, true), weight: 1, symbol: "none", turnEndBuff: "knowledge" },
  { id: "wine-cellar", name: "Wine Cellar", pool: "basement", allowedFloors: ["basement"], doors: makeDoors(true, false, true, true), weight: 3, symbol: "item" },
  { id: "boiler-room", name: "Boiler Room", pool: "basement", allowedFloors: ["basement"], doors: makeDoors(true, true, false, false), weight: 2, symbol: "event" },
  { id: "vault", name: "Vault", pool: "basement", allowedFloors: ["basement"], doors: makeDoors(false, true, true, false), weight: 2, symbol: "none", isLocked: true },
  { id: "flooded-tunnels", name: "Flooded Tunnels", pool: "basement", allowedFloors: ["basement"], doors: makeDoors(true, false, false, true), weight: 2, symbol: "event" },
  { id: "ritual-chamber", name: "Ritual Chamber", pool: "basement", allowedFloors: ["basement"], doors: makeDoors(false, true, false, true), weight: 1, symbol: "omen" },
  { id: "catacombs", name: "Catacombs", pool: "basement", allowedFloors: ["basement"], doors: makeDoors(false, false, true, true), weight: 1, symbol: "event", special: "catacombs", barrierStat: { stat: "might", min: 4 } },
  { id: "collapsed-passage", name: "Collapsed Passage", pool: "basement", allowedFloors: ["basement"], doors: makeDoors(true, true, false, true), weight: 2, symbol: "item" },
];

export const TILE_BY_ID: Record<string, TileTemplate> = Object.fromEntries(
  [...STARTER_TILES, ...EXPLORATION_TILES].map((t) => [t.id, t])
);

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

export function createTileId(floor: Floor, x: number, y: number): string {
  return `tile-${floor}-${x}-${y}`;
}

export function createStarterTiles(): Tile[] {
  const placements: { templateId: string; floor: Floor; x: number; y: number }[] = [
    { templateId: "entrance-hall", floor: "ground", x: 0, y: 0 },
    { templateId: "foyer", floor: "ground", x: 0, y: 1 },
    { templateId: "grand-staircase", floor: "ground", x: 0, y: 2 },
    { templateId: "upper-landing", floor: "upper", x: 0, y: 2 },
    { templateId: "basement-landing", floor: "basement", x: 0, y: 0 },
  ];

  return placements.map(({ templateId, floor, x, y }) =>
    templateToTile(TILE_BY_ID[templateId], floor, x, y, true)
  );
}

export function createShuffledDeck(): string[] {
  const weighted: string[] = [];
  for (const tile of EXPLORATION_TILES) {
    for (let i = 0; i < tile.weight; i++) weighted.push(tile.id);
  }
  for (let i = weighted.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [weighted[i], weighted[j]] = [weighted[j], weighted[i]];
  }
  return weighted;
}

export function drawTileForFloor(
  deck: string[],
  floor: Floor,
  requiredDoor: Direction
): { template: TileTemplate | null; deck: string[] } {
  const nextDeck = [...deck];
  const valid: string[] = [];
  const invalid: string[] = [];

  while (nextDeck.length > 0) {
    const id = nextDeck.shift()!;
    const template = TILE_BY_ID[id];
    if (!template) continue;
    if (template.allowedFloors.includes(floor) && template.doors[requiredDoor]) {
      valid.push(id);
      break;
    }
    invalid.push(id);
  }

  nextDeck.push(...invalid);

  if (valid.length === 0) {
    return { template: null, deck: nextDeck };
  }

  return { template: TILE_BY_ID[valid[0]], deck: nextDeck };
}

export function templateToTile(
  template: TileTemplate,
  floor: Floor,
  x: number,
  y: number,
  prePlaced = false
): Tile {
  return {
    id: createTileId(floor, x, y),
    templateId: template.id,
    name: template.name,
    pool: template.pool,
    floor,
    x,
    y,
    doors: { ...template.doors },
    visited: prePlaced,
    cardResolved: prePlaced,
    symbol: template.symbol,
    isLocked: template.isLocked,
    turnEndBuff: template.turnEndBuff,
    special: template.special,
    floorLink: template.floorLink,
    barrierStat: template.barrierStat,
  };
}

export const FLOOR_LABELS: Record<Floor, string> = {
  ground: "Ground",
  upper: "Upper",
  basement: "Basement",
};
