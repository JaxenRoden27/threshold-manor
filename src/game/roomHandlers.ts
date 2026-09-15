import { drawCard } from "./cardEngine";
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

  let next = state;
  const items: PendingCard[] = [];
  for (let i = 0; i < 2; i++) {
    const draw = drawCard(next, "items");
    next = draw.state;
    if (draw.card) {
      items.push(makePendingCard(draw.card, tile.id));
    }
  }

  const tiles = next.tiles.map((t) =>
    t.id === tile.id ? { ...t, isLocked: false, cardResolved: true } : t
  );

  const firstItem = items[0] ?? null;

  return {
    ...next,
    tiles,
    pendingCard: firstItem,
    pendingVaultItems: items.slice(1),
    log: [
      ...next.log,
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
  const draw = drawCard(state, deckType);
  if (!draw.card) {
    return { state: draw.state, pendingCard: null };
  }
  const pendingCard = makePendingCard(draw.card, tileId);
  let log = [...draw.state.log, `A ${symbol} card is drawn: "${draw.card.title}".`];
  if (symbol === "omen") {
    log.push("An Omen! A Haunt Roll will follow immediately.");
  }
  log.push(`${state.players[state.activePlayerIndex].name} must resolve the room before moving again.`);
  const activeGameOmenIds =
    symbol === "omen"
      ? [...draw.state.activeGameOmenIds, draw.card.id]
      : draw.state.activeGameOmenIds;
  return {
    state: { ...draw.state, log, activeGameOmenIds },
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
