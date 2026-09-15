import { TILE_BY_ID, templateToTile } from "./tileData";
import type { Floor, RoomTransitionKind, Tile } from "./types";

export const ELEVATOR_DESTINATIONS: Record<
  Floor,
  { floor: Floor; x: number; y: number; templateId: string; name: string }
> = {
  basement: {
    floor: "basement",
    x: 0,
    y: 0,
    templateId: "basement-landing",
    name: "Basement Landing",
  },
  ground: {
    floor: "ground",
    x: 0,
    y: 1,
    templateId: "foyer",
    name: "Foyer",
  },
  upper: {
    floor: "upper",
    x: 0,
    y: 2,
    templateId: "upper-landing",
    name: "Upper Landing",
  },
};

export function getTransitionKind(tile: Tile): RoomTransitionKind | null {
  if (tile.special === "grand-staircase") return "grand-staircase";
  if (tile.special === "upper-landing") return "upper-landing";
  if (tile.special === "coal-chute") return "coal-chute";
  if (tile.special === "basement-landing") return "basement-stairs";
  return null;
}

export function getTransitionLabel(kind: RoomTransitionKind): string {
  switch (kind) {
    case "grand-staircase":
      return "Climb to Upper Landing (1 AP)";
    case "upper-landing":
      return "Descend to Grand Staircase (1 AP)";
    case "coal-chute":
      return "Slide down Coal Chute (free)";
    case "basement-stairs":
      return "Climb stairs to Foyer (1 AP)";
  }
}

export function getTransitionDestination(
  kind: RoomTransitionKind,
  currentTile: Tile
): { floor: Floor; x: number; y: number } | null {
  switch (kind) {
    case "grand-staircase":
      return currentTile.floorLink ?? { floor: "upper", x: 0, y: 2 };
    case "upper-landing":
      return currentTile.floorLink ?? { floor: "ground", x: 0, y: 2 };
    case "coal-chute":
      return { floor: "basement", x: 0, y: 0 };
    case "basement-stairs":
      return { floor: "ground", x: 0, y: 1 };
  }
}

export function transitionCostsAp(kind: RoomTransitionKind): number {
  return kind === "coal-chute" ? 0 : 1;
}

export function ensureDestinationTile(
  tiles: Tile[],
  dest: { floor: Floor; x: number; y: number; templateId: string; name: string }
): Tile[] {
  const exists = tiles.some(
    (t) => t.floor === dest.floor && t.x === dest.x && t.y === dest.y
  );
  if (exists) return tiles;
  const template = TILE_BY_ID[dest.templateId];
  if (!template) return tiles;
  return [...tiles, templateToTile(template, dest.floor, dest.x, dest.y, true)];
}
