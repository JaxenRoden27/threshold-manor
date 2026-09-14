import { getCardEffect, getCardTarget } from "./cardData";
import { createShuffledCardDecks, drawRoomCard } from "./cardEngine";
import {
  createShuffledDeck,
  createStarterTiles,
  DIRECTION_DELTA,
  drawTileForFloor,
  OPPOSITE,
  templateToTile,
} from "./tileData";
import type {
  CharacterTemplate,
  Direction,
  Floor,
  GameState,
  PendingCard,
  Phase,
  Player,
  Stat,
  Tile,
} from "./types";
import { startHaunt } from "./hauntEngine";
import {
  betrayalFaceLabel,
  checkHauntTrigger,
  checkStatSuccess,
  rollBetrayalDice,
} from "./diceEngine";

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

function syncOmenFields<T extends Partial<GameState>>(state: T): T {
  return {
    ...state,
    cluesDiscovered: state.omensDrawn ?? state.cluesDiscovered ?? 0,
    omensDrawn: state.omensDrawn ?? state.cluesDiscovered ?? 0,
  };
}

export function createInitialState(): GameState {
  return syncOmenFields({
    phase: "setup",
    players: [],
    activePlayerIndex: 0,
    tiles: [],
    viewFloor: "ground",
    omensDrawn: 0,
    cluesDiscovered: 0,
    threatLevel: 1,
    pendingCard: null,
    log: [],
    puzzle: null,
    selectedPlayerCount: 2,
    tileDeck: [],
    cardDecks: createShuffledCardDecks(),
    haunt: null,
    combat: null,
    lastOmenRoomTemplateId: null,
  });
}

export function setPlayerCount(state: GameState, count: number): GameState {
  return { ...state, selectedPlayerCount: Math.min(4, Math.max(2, count)) };
}

export function startMultiplayerGame(
  members: { peerId: string; characterId: string | null }[]
): GameState {
  const selectedIds = members
    .map((m) => m.characterId)
    .filter(Boolean) as string[];
  const state = startGame(createInitialState(), selectedIds);
  const players = state.players.map((p, i) => ({
    ...p,
    id: members[i]?.peerId ?? p.id,
  }));
  return {
    ...state,
    players,
    selectedPlayerCount: members.length,
    log: [
      ...state.log,
      `${members.length} investigators enter Threshold Manor together.`,
    ],
  };
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
    floor: "ground" as Floor,
    x: 0,
    y: 0,
    isTraitor: false,
  }));

  return syncOmenFields({
    ...state,
    phase: "exploration",
    players,
    activePlayerIndex: 0,
    tiles: createStarterTiles(),
    viewFloor: "ground",
    omensDrawn: 0,
    cluesDiscovered: 0,
    threatLevel: 1,
    pendingCard: null,
    tileDeck: createShuffledDeck(),
    cardDecks: createShuffledCardDecks(),
    haunt: null,
    combat: null,
    lastOmenRoomTemplateId: null,
    log: [
      "You stand in the Entrance Hall. The door seals behind you.",
      "Explore floor by floor. Uncover Omens—but each one risks the Haunt.",
    ],
    puzzle: null,
  });
}

export function getTileAt(
  tiles: Tile[],
  floor: Floor,
  x: number,
  y: number
): Tile | undefined {
  return tiles.find((t) => t.floor === floor && t.x === x && t.y === y);
}

export function getActivePlayer(state: GameState): Player {
  return state.players[state.activePlayerIndex];
}

export function setViewFloor(state: GameState, floor: Floor): GameState {
  return { ...state, viewFloor: floor };
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

function beginTurnForPlayer(players: Player[], index: number): Player[] {
  return players.map((p, i) =>
    i === index ? { ...p, ap: p.speed } : p
  );
}

function initialRollPhase(card: PendingCard["card"]): PendingCard["rollPhase"] {
  if (card.type === "event") return "await-stat";
  if (card.type === "omen") return "await-haunt";
  return "none";
}

export function createPendingCard(
  card: PendingCard["card"],
  tileId: string
): PendingCard {
  return {
    card,
    tileId,
    resolved: false,
    rollPhase: initialRollPhase(card),
  };
}

export function applyStatRoll(
  state: GameState,
  pending: PendingCard,
  dice: number[]
): GameState {
  const { card } = pending;
  if (card.type !== "event" || !card.stat) return state;

  const target = getCardTarget(card);
  const total = dice.reduce((sum, face) => sum + face, 0);
  const success = checkStatSuccess(total, target);

  let players = [...state.players];
  let log = [
    ...state.log,
    `${state.players[state.activePlayerIndex].name} rolls ${dice.map(betrayalFaceLabel).join(", ")} = ${total} vs ${target}. ${
      success ? "Success!" : "Failure."
    }`,
  ];

  const effect = getCardEffect(card, success);
  if (effect) {
    players = updatePlayer(players, state.activePlayerIndex, (p) =>
      applyStatEffect(p, effect.stat, effect.delta)
    );
    log.push(success ? card.successText : card.failureText);
  }

  const tiles = state.tiles.map((t) =>
    t.id === pending.tileId ? { ...t, cardResolved: true } : t
  );

  return {
    ...state,
    players,
    tiles,
    pendingCard: {
      ...pending,
      statDice: dice,
      roll: total,
      success,
      rollPhase: "complete",
      resolved: true,
    },
    log,
  };
}

export function applyHauntRoll(
  state: GameState,
  pending: PendingCard,
  dice: number[]
): GameState {
  const { card } = pending;
  if (card.type !== "omen") return state;

  const total = dice.reduce((sum, face) => sum + face, 0);
  const omensDrawn = state.omensDrawn + 1;
  let threatLevel = state.threatLevel + 1;
  let players = [...state.players];
  let log = [
    ...state.log,
    card.successText,
    `Omen uncovered (${omensDrawn} total). Haunt Roll: ${dice.map(betrayalFaceLabel).join(", ")} = ${total}.`,
  ];

  if (card.omenStatBonus) {
    players = updatePlayer(players, state.activePlayerIndex, (p) =>
      applyStatEffect(p, card.omenStatBonus!.stat, card.omenStatBonus!.delta)
    );
  }

  const tile = state.tiles.find((t) => t.id === pending.tileId);
  const roomTemplateId = tile?.templateId ?? state.lastOmenRoomTemplateId ?? "foyer";

  const tiles = state.tiles.map((t) =>
    t.id === pending.tileId ? { ...t, cardResolved: true } : t
  );

  let next: GameState = syncOmenFields({
    ...state,
    players,
    tiles,
    omensDrawn,
    cluesDiscovered: omensDrawn,
    threatLevel,
    lastOmenRoomTemplateId: roomTemplateId,
    pendingCard: {
      ...pending,
      hauntDice: dice,
      roll: total,
      success: !checkHauntTrigger(total, omensDrawn),
      rollPhase: "complete",
      resolved: true,
    },
    log,
  });

  if (checkHauntTrigger(total, omensDrawn)) {
    log.push(
      `Haunt Roll ${total} falls below ${omensDrawn} Omen(s)—the house reveals its true face!`
    );
    next = { ...next, log, pendingCard: null };
    return startHaunt(next, card.id, roomTemplateId);
  }

  log.push(`The house holds—for now. (${total} ≥ ${omensDrawn} Omens)`);
  return { ...next, log };
}

/** @deprecated Use applyHauntRoll */
export function applyCrisisRoll(
  state: GameState,
  pending: PendingCard,
  dice: number[]
): GameState {
  return applyHauntRoll(state, pending, dice);
}

export function resolveItemCard(
  state: GameState,
  pending: PendingCard
): GameState {
  const { card } = pending;
  if (card.type !== "item") return state;

  let players = [...state.players];
  let log = [...state.log];

  if (card.itemReward) {
    players = updatePlayer(players, state.activePlayerIndex, (p) => ({
      ...p,
      inventory: [...p.inventory, card.itemReward!],
    }));
  }
  const effect = card.onSuccess ?? card.successEffect;
  if (effect) {
    players = updatePlayer(players, state.activePlayerIndex, (p) =>
      applyStatEffect(p, effect.stat, effect.delta)
    );
  }
  log.push(card.successText);

  const tiles = state.tiles.map((t) =>
    t.id === pending.tileId ? { ...t, cardResolved: true } : t
  );

  return {
    ...state,
    players,
    tiles,
    pendingCard: {
      ...pending,
      success: true,
      rollPhase: "complete",
      resolved: true,
    },
    log,
  };
}

export function dismissCard(state: GameState): GameState {
  const active = getActivePlayer(state);
  const nextIndex = (state.activePlayerIndex + 1) % state.players.length;
  const players = beginTurnForPlayer(state.players, nextIndex);
  const next = players[nextIndex];

  return {
    ...state,
    players,
    pendingCard: null,
    activePlayerIndex: nextIndex,
    viewFloor: next.floor,
    log: [
      ...state.log,
      `${active.name} ends their turn. ${next.name} steps forward.`,
    ],
  };
}

export function movePlayer(
  state: GameState,
  direction: Direction
): GameState {
  const movablePhases: Phase[] = ["exploration", "HAUNT_ACTIVE"];
  if (!movablePhases.includes(state.phase) || state.pendingCard || state.combat)
    return state;

  const active = getActivePlayer(state);
  if (active.ap <= 0) return state;

  const currentTile = getTileAt(state.tiles, active.floor, active.x, active.y);
  if (!currentTile || !currentTile.doors[direction]) return state;

  const { dx, dy } = DIRECTION_DELTA[direction];
  const nx = active.x + dx;
  const ny = active.y + dy;

  let tiles = [...state.tiles];
  let tileDeck = state.tileDeck;
  let log = [...state.log];
  let pendingCard: PendingCard | null = state.pendingCard;
  let cardDecks = state.cardDecks;

  const existing = getTileAt(tiles, active.floor, nx, ny);
  if (!existing) {
    const requiredDoor = OPPOSITE[direction];
    const draw = drawTileForFloor(tileDeck, active.floor, requiredDoor);
    tileDeck = draw.deck;
    if (!draw.template) {
      log.push(
        `${active.name} finds a bricked-up doorway to the ${direction}.`
      );
      return { ...state, log };
    }
    const newTile = templateToTile(draw.template, active.floor, nx, ny);
    tiles.push(newTile);
    log.push(
      `${active.name} discovers ${newTile.name} on the ${active.floor} floor.`
    );
  }

  const targetTile = getTileAt(tiles, active.floor, nx, ny)!;
  const isNewDiscovery = !targetTile.visited;

  let players = updatePlayer(state.players, state.activePlayerIndex, (p) => ({
    ...p,
    x: nx,
    y: ny,
    ap: isNewDiscovery ? 0 : p.ap - 1,
  }));

  if (isNewDiscovery && state.phase === "exploration") {
    tiles = tiles.map((t) =>
      t.id === targetTile.id ? { ...t, visited: true } : t
    );
    const draw = drawRoomCard({ ...state, cardDecks });
    cardDecks = draw.cardDecks;
    if (draw.card) {
      pendingCard = createPendingCard(draw.card, targetTile.id);
      log.push(`A ${draw.type} card is drawn: "${draw.card.title}".`);
      if (draw.type === "omen") {
        log.push("An Omen! A Haunt Roll will follow immediately.");
      }
      log.push(`${active.name} must resolve the room before moving again.`);
    }
  } else if (isNewDiscovery) {
    tiles = tiles.map((t) =>
      t.id === targetTile.id ? { ...t, visited: true } : t
    );
  }

  return {
    ...state,
    players,
    tiles,
    tileDeck,
    cardDecks,
    log,
    pendingCard,
    viewFloor: active.floor,
  };
}

export function useFloorTransition(state: GameState): GameState {
  const movablePhases: Phase[] = ["exploration", "HAUNT_ACTIVE"];
  if (!movablePhases.includes(state.phase) || state.pendingCard || state.combat)
    return state;

  const active = getActivePlayer(state);
  if (active.ap <= 0) return state;

  const currentTile = getTileAt(state.tiles, active.floor, active.x, active.y);
  if (!currentTile?.floorLink) return state;

  const link = currentTile.floorLink;
  const dest = getTileAt(state.tiles, link.floor, link.x, link.y);
  if (!dest) return state;

  const label =
    currentTile.special === "coal-chute"
      ? "slides down the Coal Chute"
      : currentTile.special === "grand-staircase"
        ? "climbs the Grand Staircase"
        : currentTile.special === "upper-landing"
          ? "descends to the Grand Staircase"
          : `moves to the ${link.floor} floor`;

  const players = updatePlayer(state.players, state.activePlayerIndex, (p) => ({
    ...p,
    floor: link.floor,
    x: link.x,
    y: link.y,
    ap: p.ap - 1,
  }));

  return {
    ...state,
    players,
    viewFloor: link.floor,
    log: [...state.log, `${active.name} ${label} (1 AP).`],
  };
}

export function endTurn(state: GameState): GameState {
  const turnPhases: Phase[] = ["exploration", "HAUNT_ACTIVE"];
  if (!turnPhases.includes(state.phase) || state.pendingCard || state.combat)
    return state;
  const nextIndex = (state.activePlayerIndex + 1) % state.players.length;
  const players = beginTurnForPlayer(state.players, nextIndex);
  const next = players[nextIndex];
  return {
    ...state,
    players,
    activePlayerIndex: nextIndex,
    viewFloor: next.floor,
    log: [...state.log, `${next.name} takes a fresh turn (${next.ap} AP).`],
  };
}

export function rollStatCheckForCard(state: GameState): { dice: number[]; total: number } {
  const pending = state.pendingCard;
  if (!pending?.card.stat) return rollBetrayalDice(1);
  const active = getActivePlayer(state);
  return rollBetrayalDice(active[pending.card.stat]);
}
