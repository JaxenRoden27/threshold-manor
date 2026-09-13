import { drawCard, drawCardType } from "./cardData";
import {
  createTileId,
  DIRECTION_DELTA,
  ENTRANCE_TILE,
  OPPOSITE,
  pickPool,
  pickTileTemplate,
} from "./tileData";
import type {
  CharacterTemplate,
  Direction,
  GameState,
  PendingCard,
  Phase,
  Player,
  Stat,
  Tile,
} from "./types";
import { createPuzzleState } from "./puzzleEngine";

export const CHARACTER_TEMPLATES: CharacterTemplate[] = [
  {
    id: "priest",
    name: "Sister Mara",
    title: "Occult Scholar",
    might: 2,
    speed: 3,
    sanity: 4,
    knowledge: 5,
  },
  {
    id: "athlete",
    name: "Leo Vance",
    title: "Ex-Paramedic",
    might: 5,
    speed: 4,
    sanity: 3,
    knowledge: 2,
  },
  {
    id: "medium",
    name: "Iris Cole",
    title: "Reluctant Medium",
    might: 2,
    speed: 3,
    sanity: 5,
    knowledge: 3,
  },
  {
    id: "detective",
    name: "Jonah Reed",
    title: "Private Investigator",
    might: 3,
    speed: 4,
    sanity: 3,
    knowledge: 4,
  },
];

export function createInitialState(): GameState {
  return {
    phase: "setup",
    players: [],
    activePlayerIndex: 0,
    tiles: [],
    clueCount: 0,
    threatLevel: 1,
    pendingCard: null,
    log: [],
    puzzle: null,
    selectedPlayerCount: 2,
  };
}

export function setPlayerCount(state: GameState, count: number): GameState {
  return { ...state, selectedPlayerCount: Math.min(4, Math.max(2, count)) };
}

export function startGame(
  state: GameState,
  selectedIds: string[]
): GameState {
  const count = Math.min(4, Math.max(2, selectedIds.length));
  const templates = selectedIds
    .map((id) => CHARACTER_TEMPLATES.find((c) => c.id === id))
    .filter(Boolean) as CharacterTemplate[];

  const players: Player[] = templates.slice(0, count).map((t, i) => ({
    id: `player-${i}`,
    templateId: t.id,
    name: t.name,
    title: t.title,
    might: t.might,
    speed: t.speed,
    sanity: t.sanity,
    knowledge: t.knowledge,
    inventory: [],
    ap: t.speed,
    x: 0,
    y: 0,
  }));

  const entrance: Tile = {
    id: createTileId(0, 0),
    name: ENTRANCE_TILE.name,
    pool: ENTRANCE_TILE.pool,
    x: 0,
    y: 0,
    doors: { ...ENTRANCE_TILE.doors },
    visited: true,
    cardResolved: true,
  };

  return {
    ...state,
    phase: "exploration",
    players,
    activePlayerIndex: 0,
    tiles: [entrance],
    clueCount: 0,
    threatLevel: 1,
    pendingCard: null,
    log: [
      "You stand at the Front Entrance. The door seals behind you.",
      "Explore the house. Uncover Clues—but each one wakes the Crisis.",
    ],
    puzzle: null,
  };
}

export function getTileAt(tiles: Tile[], x: number, y: number): Tile | undefined {
  return tiles.find((t) => t.x === x && t.y === y);
}

export function getActivePlayer(state: GameState): Player {
  return state.players[state.activePlayerIndex];
}

function applyStatEffect(
  player: Player,
  stat: Stat,
  delta: number
): Player {
  return {
    ...player,
    [stat]: Math.max(0, player[stat] + delta),
  };
}

function updatePlayer(
  players: Player[],
  index: number,
  updater: (p: Player) => Player
): Player[] {
  return players.map((p, i) => (i === index ? updater(p) : p));
}

export function rollStatCheck(player: Player, stat: Stat, difficulty: number) {
  const roll = Math.floor(Math.random() * 6) + 1 + player[stat];
  return { roll, success: roll >= difficulty };
}

export function resolveCard(
  state: GameState,
  pending: PendingCard
): GameState {
  const { card } = pending;
  let players = [...state.players];
  const active = players[state.activePlayerIndex];
  let log = [...state.log];
  let clueCount = state.clueCount;
  let threatLevel = state.threatLevel;
  let phase: Phase = state.phase;
  let puzzle = state.puzzle;

  if (card.type === "event" && card.stat && card.difficulty) {
    const { roll, success } = rollStatCheck(active, card.stat, card.difficulty);
    pending.roll = roll;
    pending.success = success;
    log.push(
      `${active.name} rolls ${roll} vs ${card.difficulty} (${card.stat}). ${
        success ? "Success!" : "Failure."
      }`
    );
    const effect = success ? card.successEffect : card.failureEffect;
    if (effect) {
      players = updatePlayer(players, state.activePlayerIndex, (p) =>
        applyStatEffect(p, effect.stat, effect.delta)
      );
      log.push(success ? card.successText : card.failureText);
    }
  } else if (card.type === "item") {
    pending.success = true;
    if (card.itemReward) {
      players = updatePlayer(players, state.activePlayerIndex, (p) => ({
        ...p,
        inventory: [...p.inventory, card.itemReward!],
      }));
    }
    if (card.successEffect) {
      players = updatePlayer(players, state.activePlayerIndex, (p) =>
        applyStatEffect(p, card.successEffect!.stat, card.successEffect!.delta)
      );
    }
    log.push(card.successText);
  } else if (card.type === "clue") {
    pending.success = true;
    clueCount += 1;
    threatLevel += 1;
    log.push(card.successText);
    log.push(`Clue uncovered (${clueCount}/3). Threat Level: ${threatLevel}.`);

    const threatRoll = Math.floor(Math.random() * 6) + 1;
    const crisisFromRoll = threatRoll < clueCount;
    const crisisFromCount = clueCount >= 3;

    log.push(`Threat die rolls ${threatRoll}.`);

    if (crisisFromRoll || crisisFromCount) {
      phase = "crisis";
      puzzle = createPuzzleState();
      log.push(
        crisisFromCount
          ? "Three Clues revealed—the Crisis erupts!"
          : `The die (${threatRoll}) falls below Clue count (${clueCount})—the Crisis erupts!`
      );
      log.push("Align the sigils together to redirect the house's power!");
    }
  }

  const tiles = state.tiles.map((t) =>
    t.id === pending.tileId ? { ...t, cardResolved: true } : t
  );

  return {
    ...state,
    players,
    tiles,
    clueCount,
    threatLevel,
    phase,
    puzzle,
    pendingCard: { ...pending, resolved: true },
    log,
  };
}

export function dismissCard(state: GameState): GameState {
  const active = getActivePlayer(state);
  const refreshed = updatePlayer(state.players, state.activePlayerIndex, (p) => ({
    ...p,
    ap: p.speed,
  }));

  return {
    ...state,
    players: refreshed,
    pendingCard: null,
    log: [
      ...state.log,
      `${active.name} ends their turn. Next explorer steps forward.`,
    ],
    activePlayerIndex: (state.activePlayerIndex + 1) % state.players.length,
  };
}

export function movePlayer(
  state: GameState,
  direction: Direction
): GameState {
  if (state.phase !== "exploration" || state.pendingCard) return state;

  const active = getActivePlayer(state);
  if (active.ap <= 0) return state;

  const currentTile = getTileAt(state.tiles, active.x, active.y);
  if (!currentTile || !currentTile.doors[direction]) return state;

  const { dx, dy } = DIRECTION_DELTA[direction];
  const nx = active.x + dx;
  const ny = active.y + dy;

  let tiles = [...state.tiles];
  let log = [...state.log];
  let pendingCard: PendingCard | null = state.pendingCard;

  const existing = getTileAt(tiles, nx, ny);
  if (!existing) {
    const pool = pickPool(state.clueCount);
    const requiredDoor = OPPOSITE[direction];
    const template = pickTileTemplate(pool, requiredDoor);
    const newTile: Tile = {
      id: createTileId(nx, ny),
      name: template.name,
      pool: template.pool,
      x: nx,
      y: ny,
      doors: { ...template.doors },
      visited: false,
      cardResolved: false,
    };
    tiles.push(newTile);
    log.push(
      `${active.name} discovers ${newTile.name} (${newTile.pool} floor).`
    );
  }

  const targetTile = getTileAt(tiles, nx, ny)!;
  const players = updatePlayer(state.players, state.activePlayerIndex, (p) => ({
    ...p,
    x: nx,
    y: ny,
    ap: p.ap - 1,
  }));

  if (!targetTile.visited) {
    tiles = tiles.map((t) =>
      t.id === targetTile.id ? { ...t, visited: true } : t
    );
    const cardType = drawCardType();
    const card = drawCard(cardType);
    pendingCard = { card, tileId: targetTile.id, resolved: false };
    log.push(`A ${cardType} card is drawn: "${card.title}".`);
  }

  return { ...state, players, tiles, log, pendingCard };
}

export function endTurn(state: GameState): GameState {
  if (state.phase !== "exploration" || state.pendingCard) return state;
  const nextIndex = (state.activePlayerIndex + 1) % state.players.length;
  const players = state.players.map((p, i) =>
    i === nextIndex ? { ...p, ap: p.speed } : p
  );
  return {
    ...state,
    players,
    activePlayerIndex: nextIndex,
    log: [...state.log, `${players[nextIndex].name} takes a fresh turn.`],
  };
}
