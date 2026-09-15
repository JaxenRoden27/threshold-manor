import type {
  EventTier,
  EventTierAction,
  EventTierRange,
  GameState,
  Player,
  Stat,
} from "./types";
import { ELEVATOR_DESTINATIONS, ensureDestinationTile } from "./roomTransitions";

export function tierRangeForTotal(total: number): EventTierRange {
  if (total >= 4) return "4+";
  if (total >= 2) return "2-3";
  return "0-1";
}

export function resolveWinningTier(
  total: number,
  tiers: EventTier[]
): { tier: EventTier; index: number } {
  const range = tierRangeForTotal(total);
  const index = tiers.findIndex((t) => t.range === range);
  if (index >= 0) return { tier: tiers[index], index };
  return { tier: tiers[tiers.length - 1], index: tiers.length - 1 };
}

function updatePlayerStat(
  players: Player[],
  playerIndex: number,
  stat: Stat,
  delta: number
): Player[] {
  return players.map((p, i) =>
    i === playerIndex
      ? { ...p, [stat]: Math.max(0, p[stat] + delta) }
      : p
  );
}

export function applyTierAction(
  state: GameState,
  playerIndex: number,
  action: EventTierAction
): { state: GameState; message: string } {
  let players = [...state.players];
  let tiles = [...state.tiles];
  let log = [...state.log];
  const player = players[playerIndex];
  let message = action.message ?? "";

  if (action.stat !== undefined && action.delta !== undefined) {
    players = updatePlayerStat(players, playerIndex, action.stat, action.delta);
    message =
      message ||
      `${player.name}'s ${action.stat} ${action.delta >= 0 ? "+" : ""}${action.delta}.`;
  }

  if (action.itemId) {
    players = players.map((p, i) =>
      i === playerIndex
        ? { ...p, inventory: [...p.inventory, action.itemId!] }
        : p
    );
    message = message || `${player.name} gains an item.`;
  }

  if (action.guard) {
    players = players.map((p, i) =>
      i === playerIndex ? { ...p, guardNextCombat: true } : p
    );
    message = message || `${player.name} takes a defensive guard (+2 dice next combat).`;
  }

  if (action.teleportFloor) {
    const dest = ELEVATOR_DESTINATIONS[action.teleportFloor];
    tiles = ensureDestinationTile(tiles, dest);
    players = players.map((p, i) =>
      i === playerIndex
        ? { ...p, floor: dest.floor, x: dest.x, y: dest.y }
        : p
    );
    message =
      message ||
      `${player.name} is hurled to the ${dest.name} on the ${dest.floor} floor!`;
  }

  if (message) log.push(message);

  return {
    state: {
      ...state,
      players,
      tiles,
      log,
      viewFloor: players[playerIndex].floor,
    },
    message,
  };
}
