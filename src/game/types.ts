export type Stat = "might" | "speed" | "sanity" | "knowledge";
export type Phase = "setup" | "exploration" | "crisis" | "victory" | "defeat";
export type Floor = "ground" | "upper" | "basement";
export type TilePool = Floor;
export type Direction = "north" | "south" | "east" | "west";
export type CardType = "event" | "item" | "clue";

export type TileSpecial =
  | "entrance-hall"
  | "foyer"
  | "grand-staircase"
  | "upper-landing"
  | "coal-chute"
  | "basement-landing";

export interface CharacterTemplate {
  id: string;
  name: string;
  title: string;
  might: number;
  speed: number;
  sanity: number;
  knowledge: number;
}

export interface Player {
  id: string;
  templateId: string;
  name: string;
  title: string;
  might: number;
  speed: number;
  sanity: number;
  knowledge: number;
  inventory: string[];
  ap: number;
  floor: Floor;
  x: number;
  y: number;
}

export interface Doors {
  north: boolean;
  south: boolean;
  east: boolean;
  west: boolean;
}

export interface FloorLink {
  floor: Floor;
  x: number;
  y: number;
}

export interface Tile {
  id: string;
  name: string;
  pool: TilePool;
  floor: Floor;
  x: number;
  y: number;
  doors: Doors;
  visited: boolean;
  cardResolved: boolean;
  special?: TileSpecial;
  floorLink?: FloorLink;
}

export interface Card {
  id: string;
  type: CardType;
  title: string;
  description: string;
  stat?: Stat;
  difficulty?: number;
  successText: string;
  failureText: string;
  successEffect?: { stat: Stat; delta: number };
  failureEffect?: { stat: Stat; delta: number };
  itemReward?: string;
}

export type CardRollPhase =
  | "none"
  | "await-stat"
  | "await-threat"
  | "await-crisis"
  | "complete";

export interface PendingCard {
  card: Card;
  tileId: string;
  resolved: boolean;
  rollPhase: CardRollPhase;
  statDice?: number[];
  threatDice?: number[];
  crisisDice?: number[];
  roll?: number;
  success?: boolean;
}

export interface PuzzleState {
  sigils: number[];
  target: number[];
  moves: number;
  maxMoves: number;
  solved: boolean;
}

export interface GameState {
  phase: Phase;
  players: Player[];
  activePlayerIndex: number;
  tiles: Tile[];
  viewFloor: Floor;
  cluesDiscovered: number;
  threatLevel: number;
  pendingCard: PendingCard | null;
  log: string[];
  puzzle: PuzzleState | null;
  selectedPlayerCount: number;
  tileDeck: string[];
}
