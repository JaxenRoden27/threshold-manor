export type Stat = "might" | "speed" | "sanity" | "knowledge";
export type ExplorerColor =
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "purple"
  | "white";

export interface StatTrack {
  values: readonly [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  startIndex: number;
  currentIndex: number;
}
export type Phase =
  | "setup"
  | "exploration"
  | "HAUNT_ACTIVE"
  | "crisis"
  | "victory"
  | "defeat";
export type Floor = "ground" | "upper" | "basement";
export type TilePool = Floor;
export type Direction = "north" | "south" | "east" | "west";
export type CardType = "event" | "item" | "omen";
export type TileSymbol = "event" | "item" | "omen" | "none";
export type DeckType = "events" | "items" | "omens";
export type TraitorSelection = "random" | "lowest-sanity" | "highest-knowledge";

export type TileSpecial =
  | "entrance-hall"
  | "foyer"
  | "grand-staircase"
  | "upper-landing"
  | "coal-chute"
  | "basement-landing"
  | "mystic-elevator"
  | "collapsed-room"
  | "chasm"
  | "catacombs"
  | "basement-stairs"
  | "secret-passage"
  | "secret-stairs"
  | "gallery";

export interface BarrierStat {
  stat: Stat;
  min: number;
}

export type EventTierRange = "0-1" | "2-3" | "4+";

export interface EventTierAction {
  stat?: Stat;
  delta?: number;
  itemId?: string;
  message?: string;
  guard?: boolean;
  teleportFloor?: Floor;
}

export interface EventTier {
  range: EventTierRange;
  text: string;
  action: EventTierAction;
}

export type RoomTransitionKind =
  | "grand-staircase"
  | "upper-landing"
  | "coal-chute"
  | "basement-stairs"
  | "stairs-up"
  | "stairs-down";

export type VerticalDropKind = "coal-chute" | "collapsed-room" | "gallery";

export interface VerticalDrop {
  id: string;
  kind: VerticalDropKind;
  from: { floor: Floor; x: number; y: number };
  to: { floor: Floor; x: number; y: number };
}

export interface PassageToken {
  id: string;
  tileId: string;
  floor: Floor;
  x: number;
  y: number;
  roomName: string;
}

export interface StairsLink {
  basement: { floor: Floor; x: number; y: number };
  foyer: { floor: Floor; x: number; y: number };
}

/** @deprecated Use ExplorerTemplate from characterData */
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
  age: number;
  color: ExplorerColor;
  statTracks: Record<Stat, StatTrack>;
  inventory: string[];
  ap: number;
  floor: Floor;
  x: number;
  y: number;
  isTraitor: boolean;
  isAlive: boolean;
  guardNextCombat: boolean;
  visitedBuffRooms: string[];
  /** Direction player moved from when entering current tile */
  enteredFrom?: Direction;
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
  templateId: string;
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
  noCardDraw?: boolean;
  symbol: TileSymbol;
  isLocked?: boolean;
  turnEndBuff?: Stat;
  barrierStat?: BarrierStat;
}

export interface CardEffect {
  stat: Stat;
  delta: number;
}

export interface Card {
  id: string;
  type: CardType;
  title: string;
  description: string;
  flavor?: string;
  stat?: Stat;
  tiers?: EventTier[];
  target?: number;
  difficulty?: number;
  successText: string;
  failureText: string;
  onSuccess?: CardEffect;
  onFailure?: CardEffect;
  /** @deprecated Use onSuccess */
  successEffect?: CardEffect;
  /** @deprecated Use onFailure */
  failureEffect?: CardEffect;
  itemReward?: string;
  omenStatBonus?: CardEffect;
}

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  passiveBonus?: Partial<Record<Stat, number>>;
  combatAttackStat?: Stat;
  combatAttackBonus?: number;
  combatDefenseBonus?: number;
  mentalAttack?: boolean;
}

export interface CardDecks {
  eventDeck: string[];
  eventDiscardPile: string[];
  itemDeck: string[];
  omenDeck: string[];
}

export type CardRollPhase =
  | "none"
  | "await-stat"
  | "await-haunt"
  | "await-threat"
  | "await-crisis"
  | "complete";

export interface PendingCard {
  card: Card;
  tileId: string;
  resolved: boolean;
  rollPhase: CardRollPhase;
  statDice?: number[];
  hauntDice?: number[];
  threatDice?: number[];
  crisisDice?: number[];
  roll?: number;
  success?: boolean;
  winningTierIndex?: number;
}

export interface HauntAction {
  id: string;
  roomTemplateId: string;
  label: string;
  description: string;
  stat: Stat;
  minStat: number;
  apCost: number;
  survivorOnly?: boolean;
  traitorOnly?: boolean;
}

export interface MonsterDefinition {
  id: string;
  name: string;
  might: number;
  sanity: number;
  hp: number;
}

export interface HauntScenario {
  id: string;
  name: string;
  traitorSelection: TraitorSelection;
  survivorGoal: string;
  traitorGoal: string;
  survivorWinCondition: string;
  traitorWinCondition: string;
  secretsOfSurvival: string[];
  traitorsTome: string[];
  hauntActions: HauntAction[];
  monster?: MonsterDefinition;
}

export interface HauntState {
  scenarioId: string;
  omenId: string;
  roomTemplateId: string;
  traitorPlayerId: string;
  completedActionIds: string[];
  monsterHp?: number;
  briefingDismissed: boolean;
}

export type CombatPhase =
  | "select-target"
  | "rolling"
  | "allocate-damage"
  | "resolved";

export type DamagePool = "physical" | "mental";

export interface DamageAllocation {
  might?: number;
  speed?: number;
  sanity?: number;
  knowledge?: number;
}

export interface CombatState {
  attackerId: string;
  defenderId: string;
  defenderType: "player" | "monster";
  attackStat: Stat;
  defenseStat: Stat;
  mental: boolean;
  phase: CombatPhase;
  attackerDice?: number[];
  defenderDice?: number[];
  attackerTotal?: number;
  defenderTotal?: number;
  damage?: number;
  winnerId?: string;
  loserId?: string;
  damagePool?: DamagePool;
  flankingBonus?: number;
  guardBonus?: number;
  log: string[];
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
  omensDrawn: number;
  /** @deprecated Use omensDrawn */
  cluesDiscovered: number;
  threatLevel: number;
  pendingCard: PendingCard | null;
  log: string[];
  puzzle: PuzzleState | null;
  selectedPlayerCount: number;
  /** Unique 1-of-1 exploration room deck; placed rooms never return. */
  roomDeck: string[];
  cardDecks: CardDecks;
  placedRoomIds: string[];
  drawnCardIds: string[];
  /** Omen card ids drawn and still in play (never reshuffled). */
  activeGameOmenIds: string[];
  haunt: HauntState | null;
  combat: CombatState | null;
  lastOmenRoomTemplateId: string | null;
  pendingTransition: {
    kind: RoomTransitionKind;
    tileId: string;
    traitorFloorPick?: Floor;
  } | null;
  pendingVaultItems: PendingCard[];
  pendingVaultLockpick: string | null;
  pendingElevator: {
    sourceTileId: string;
    sourceFloor: Floor;
    sourceX: number;
    sourceY: number;
    phase: "roll" | "pick-floor";
    dice?: number[];
    total?: number;
  } | null;
  verticalDrops: VerticalDrop[];
  passageTokens: PassageToken[];
  stairsLink: StairsLink | null;
  pendingVertical:
    | { mode: "portal-select"; fromTokenId: string }
    | { mode: "hidden-latch" }
    | null;
}
