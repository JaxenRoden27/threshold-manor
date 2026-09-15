import {
  EXPLORATION_TILES,
  STARTER_TEMPLATE_IDS,
  TILE_BY_ID,
  type TileTemplate,
} from "./tileData";
import type { Direction, Floor, GameState } from "./types";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** One copy of each exploration room — unique 1-of-1 deck. */
export function createRoomDeck(): string[] {
  return shuffle(EXPLORATION_TILES.map((t) => t.id));
}

export function getStarterPlacedIds(): string[] {
  return Array.from(STARTER_TEMPLATE_IDS);
}

export function hasRoomsAvailableForFloor(
  roomDeck: string[],
  placedRoomIds: string[],
  floor: Floor
): boolean {
  const placed = new Set(placedRoomIds);
  return roomDeck.some((id) => {
    const template = TILE_BY_ID[id];
    return (
      template &&
      !placed.has(id) &&
      template.allowedFloors.includes(floor)
    );
  });
}

export function drawRoom(
  state: GameState,
  floor: Floor,
  requiredDoor: Direction
): { state: GameState; template: TileTemplate | null } {
  const placed = new Set(state.placedRoomIds);
  const deck = [...state.roomDeck];

  for (let i = 0; i < deck.length; i++) {
    const id = deck[i];
    if (placed.has(id)) continue;

    const template = TILE_BY_ID[id];
    if (
      !template ||
      !template.allowedFloors.includes(floor) ||
      !template.doors[requiredDoor]
    ) {
      continue;
    }

    const roomDeck = deck.filter((_, idx) => idx !== i);
    return {
      template,
      state: {
        ...state,
        roomDeck,
        placedRoomIds: [...state.placedRoomIds, id],
      },
    };
  }

  return { state, template: null };
}
