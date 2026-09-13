export type Stat = "might" | "speed" | "sanity" | "knowledge";
export type Phase = "setup" | "exploration" | "crisis" | "victory" | "defeat";
export type TilePool = "ground" | "upper" | "basement";
export type Direction = "north" | "south" | "east" | "west";
export type CardType = "event" | "item" | "clue";

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
  x: number;
  y: number;
}

export interface Doors {
  north: boolean;
  south: boolean;
  east: boolean;
  west: boolean;
}

export interface Tile {
  id: string;
  name: string;
  pool: TilePool;
  x: number;
  y: number;
  doors: Doors;
  visited: boolean;
  cardResolved: boolean;
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
  | "complete";

export interface PendingCard {
  card: Card;
  tileId: string;
  resolved: boolean;
  rollPhase: CardRollPhase;
  statDice?: number[];
  threatDice?: number[];
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
  clueCount: number;
  threatLevel: number;
  pendingCard: PendingCard | null;
  log: string[];
  puzzle: PuzzleState | null;
  selectedPlayerCount: number;
}
