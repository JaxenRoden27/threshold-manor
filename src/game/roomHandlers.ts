import { drawFromDeck } from "./cardEngine";
import type { CardRollPhase, Floor, GameState, PendingCard, Stat, Tile } from "./types";
import type { Card } from "./types";

function tileAt(tiles: Tile[], floor: Floor, x: number, y: number): Tile | undefined {
  return tiles.find((t) => t.floor === floor && t.x === x && t.y === y);
}

function makePendingCard(card: Card, tileId: string): PendingCard {
  const rollPhase: CardRollPhase =
    card.type === "event" ? "await-stat" : card.type === "omen" ? "await-haunt" : "none";
  return { card, tileId, resolved: false, rollPhase };
}

export const BUFF_ROOM_STATS: Record<string, Stat> = {
  gymnasium: "speed",
  library: "knowledge",
  chapel: "sanity",
  larder: "might",
};

export function handleCoalChuteEnter(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  const dest = { floor: "basement" as Floor, x: 0, y: 0 };
  const players = state.players.map((p, i) =>
    i === playerIndex ? { ...p, floor: dest.floor, x: dest.x, y: dest.y } : p
  );
  return {
    ...state,
    players,
    viewFloor: dest.floor,
    log: [
      ...state.log,
      `${player.name} plummets down the Coal Chute to the Basement Landing!`,
    ],
  };
}

export function handleOnTurnEnd(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  const tile = tileAt(state.tiles, player.floor, player.x, player.y);
  if (!tile) return state;

  const buffStat = BUFF_ROOM_STATS[tile.templateId];
  if (!buffStat) return state;
  if (player.visitedBuffRooms.includes(tile.templateId)) return state;

  const players = state.players.map((p, i) => {
    if (i !== playerIndex) return p;
    return {
      ...p,
      [buffStat]: p[buffStat] + 1,
      visitedBuffRooms: [...p.visitedBuffRooms, tile.templateId],
    };
  });

  return {
    ...state,
    players,
    log: [
      ...state.log,
      `${player.name} gains +1 ${buffStat} from the ${tile.name} (first visit this game).`,
    ],
  };
}

export function attemptVaultLockpick(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  const tile = tileAt(state.tiles, player.floor, player.x, player.y);
  if (!tile || tile.templateId !== "vault" || !tile.isLocked) return state;

  if (player.knowledge < 6) {
    return {
      ...state,
      log: [
        ...state.log,
        `${player.name} fails to pick the vault lock (Knowledge 6+ required).`,
      ],
    };
  }

  let cardDecks = state.cardDecks;
  const items: PendingCard[] = [];
  for (let i = 0; i < 2; i++) {
    const draw = drawFromDeck(cardDecks, "items");
    cardDecks = draw.decks;
    if (draw.card) {
      items.push(makePendingCard(draw.card, tile.id));
    }
  }

  const tiles = state.tiles.map((t) =>
    t.id === tile.id ? { ...t, isLocked: false, cardResolved: true } : t
  );

  const firstItem = items[0] ?? null;

  return {
    ...state,
    tiles,
    cardDecks,
    pendingCard: firstItem,
    pendingVaultItems: items.slice(1),
    log: [
      ...state.log,
      `${player.name} picks the vault lock! Two items spill out.`,
    ],
  };
}

export function drawCardForSymbol(
  state: GameState,
  symbol: "event" | "item" | "omen",
  tileId: string
): { state: GameState; pendingCard: PendingCard | null } {
  const deckType = symbol === "event" ? "events" : symbol === "item" ? "items" : "omens";
  const draw = drawFromDeck(state.cardDecks, deckType);
  if (!draw.card) {
    return { state, pendingCard: null };
  }
  const pendingCard = makePendingCard(draw.card, tileId);
  let log = [...state.log, `A ${symbol} card is drawn: "${draw.card.title}".`];
  if (symbol === "omen") {
    log.push("An Omen! A Haunt Roll will follow immediately.");
  }
  log.push(`${state.players[state.activePlayerIndex].name} must resolve the room before moving again.`);
  return {
    state: { ...state, cardDecks: draw.decks, log },
    pendingCard,
  };
}

export function findBasementEdgePlacement(
  tiles: Tile[]
): { floor: Floor; x: number; y: number } {
  const basementTiles = tiles.filter((t) => t.floor === "basement");
  if (basementTiles.length === 0) {
    return { floor: "basement", x: 1, y: 0 };
  }
  const maxX = Math.max(...basementTiles.map((t) => t.x));
  return { floor: "basement", x: maxX + 1, y: 0 };
}
