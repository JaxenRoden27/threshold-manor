import { hasRoomsAvailableForFloor } from "./roomEngine";
import { DIRECTION_DELTA, OPPOSITE, TILE_BY_ID, templateToTile } from "./tileData";
import type {
  Floor,
  GameState,
  PassageToken,
  Player,
  StairsLink,
  Tile,
  VerticalDrop,
  VerticalDropKind,
} from "./types";

const FOYER_COORDS: { floor: Floor; x: number; y: number } = {
  floor: "ground",
  x: 0,
  y: 1,
};
const ROPE_ITEM_ID = "item-rope";
const LATCH_KNOWLEDGE_MIN = 4;

export interface VerticalMoveOption {
  id: string;
  kind: "stairs-up" | "stairs-down" | "rope-climb" | "portal" | "hidden-latch";
  label: string;
  apCost: number;
  dropId?: string;
  tokenId?: string;
}

function tileAt(tiles: Tile[], floor: Floor, x: number, y: number): Tile | undefined {
  return tiles.find((t) => t.floor === floor && t.x === x && t.y === y);
}

function playerHasRope(player: Player): boolean {
  return player.inventory.includes(ROPE_ITEM_ID);
}

export function isBasementStairsTile(tile: Tile): boolean {
  return tile.special === "basement-stairs" || tile.templateId === "basement-stairs";
}

export function isSecretPortalRoom(tile: Tile): boolean {
  return (
    tile.templateId === "secret-passage" ||
    tile.templateId === "secret-stairs" ||
    tile.special === "secret-passage" ||
    tile.special === "secret-stairs"
  );
}

export function isBasementDeckEmpty(state: GameState): boolean {
  return !hasRoomsAvailableForFloor(
    state.roomDeck,
    state.placedRoomIds,
    "basement"
  );
}

export function hasBasementGroundExit(state: GameState): boolean {
  if (state.stairsLink) return true;
  return state.tiles.some(
    (t) => t.floor === "basement" && isBasementStairsTile(t)
  );
}

export function establishStairsLink(
  state: GameState,
  basementX: number,
  basementY: number
): GameState {
  const link: StairsLink = {
    basement: { floor: "basement", x: basementX, y: basementY },
    foyer: FOYER_COORDS,
  };
  const tiles = state.tiles.map((t) => {
    if (t.floor === FOYER_COORDS.floor && t.x === FOYER_COORDS.x && t.y === FOYER_COORDS.y) {
      return {
        ...t,
        floorLink: { floor: "basement" as Floor, x: basementX, y: basementY },
      };
    }
    if (t.floor === "basement" && t.x === basementX && t.y === basementY) {
      return {
        ...t,
        floorLink: FOYER_COORDS,
        special: "basement-stairs" as const,
      };
    }
    return t;
  });
  return {
    ...state,
    tiles,
    stairsLink: link,
    log: [...state.log, "Stone stairs now connect the Basement to the Foyer."],
  };
}

function findBasementOpenDoorway(
  tiles: Tile[]
): { x: number; y: number; door: "north" | "south" | "east" | "west" } | null {
  const basementTiles = tiles.filter((t) => t.floor === "basement");
  const candidates: { x: number; y: number; door: "north" | "south" | "east" | "west" }[] = [];

  for (const tile of basementTiles) {
    for (const dir of ["north", "south", "east", "west"] as const) {
      if (!tile.doors[dir]) continue;
      const { dx, dy } = DIRECTION_DELTA[dir];
      const nx = tile.x + dx;
      const ny = tile.y + dy;
      const blocked = basementTiles.some((t) => t.x === nx && t.y === ny);
      if (!blocked) {
        candidates.push({ x: nx, y: ny, door: OPPOSITE[dir] });
      }
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function spawnBasementStairs(state: GameState): GameState {
  const spot = findBasementOpenDoorway(state.tiles);
  if (!spot) {
    return {
      ...state,
      log: [...state.log, "No open basement doorway to mount the hidden stairs."],
    };
  }

  const template = TILE_BY_ID["basement-stairs"];
  if (!template) return state;

  const doors = { north: false, south: false, east: false, west: false };
  doors[spot.door] = true;

  const newTile: Tile = {
    ...templateToTile(template, "basement", spot.x, spot.y, true),
    doors,
    visited: true,
    cardResolved: true,
    floorLink: FOYER_COORDS,
    special: "basement-stairs",
  };

  return establishStairsLink(
    { ...state, tiles: [...state.tiles, newTile] },
    spot.x,
    spot.y
  );
}

let dropCounter = 0;
export function registerVerticalDrop(
  state: GameState,
  kind: VerticalDropKind,
  from: { floor: Floor; x: number; y: number },
  to: { floor: Floor; x: number; y: number }
): GameState {
  dropCounter += 1;
  const drop: VerticalDrop = {
    id: `drop-${dropCounter}`,
    kind,
    from,
    to,
  };
  return {
    ...state,
    verticalDrops: [...state.verticalDrops, drop],
  };
}

let tokenCounter = 0;
export function addPassageToken(state: GameState, tile: Tile): GameState {
  if (state.passageTokens.some((t) => t.tileId === tile.id)) return state;
  tokenCounter += 1;
  const token: PassageToken = {
    id: `token-${tokenCounter}`,
    tileId: tile.id,
    floor: tile.floor,
    x: tile.x,
    y: tile.y,
    roomName: tile.name,
  };
  return {
    ...state,
    passageTokens: [...state.passageTokens, token],
    log: [
      ...state.log,
      `A Passage Token is placed in ${tile.name} — secret routes may connect.`,
    ],
  };
}

export function getVerticalMoveOptions(
  state: GameState,
  playerIndex: number
): VerticalMoveOption[] {
  const player = state.players[playerIndex];
  const tile = tileAt(state.tiles, player.floor, player.x, player.y);
  if (!tile) return [];

  const options: VerticalMoveOption[] = [];

  if (state.stairsLink) {
    const { basement, foyer } = state.stairsLink;
    if (
      player.floor === basement.floor &&
      player.x === basement.x &&
      player.y === basement.y &&
      player.ap >= 1
    ) {
      options.push({
        id: "stairs-up",
        kind: "stairs-up",
        label: "Stairs Up to Foyer (1 AP)",
        apCost: 1,
      });
    }
    if (
      player.floor === foyer.floor &&
      player.x === foyer.x &&
      player.y === foyer.y &&
      player.ap >= 1
    ) {
      options.push({
        id: "stairs-down",
        kind: "stairs-down",
        label: "Stairs Down to Basement (1 AP)",
        apCost: 1,
      });
    }
  }

  if (playerHasRope(player) && player.ap >= 1) {
    for (const drop of state.verticalDrops) {
      if (
        player.floor === drop.to.floor &&
        player.x === drop.to.x &&
        player.y === drop.to.y
      ) {
        options.push({
          id: `rope-${drop.id}`,
          kind: "rope-climb",
          label: `Climb Up to ${drop.kind.replace("-", " ")} (1 AP)`,
          apCost: 1,
          dropId: drop.id,
        });
      }
    }
  }

  const atToken = state.passageTokens.find(
    (t) => t.floor === player.floor && t.x === player.x && t.y === player.y
  );
  if (atToken && player.ap >= 1) {
    const others = state.passageTokens.filter((t) => t.id !== atToken.id);
    if (others.length > 0) {
      options.push({
        id: "portal-travel",
        kind: "portal",
        label: "Use Passage Token (1 AP)",
        apCost: 1,
        tokenId: atToken.id,
      });
    }
  }

  return options;
}

export function maybeTriggerHiddenLatch(state: GameState): GameState {
  if (state.pendingVertical?.mode === "hidden-latch") return state;
  if (state.stairsLink) return state;

  const active = state.players[state.activePlayerIndex];
  if (active.floor !== "basement") return state;
  if (hasBasementGroundExit(state)) return state;
  if (!isBasementDeckEmpty(state)) return state;

  return {
    ...state,
    pendingVertical: { mode: "hidden-latch" },
    log: [...state.log, "Hidden Latch Discovered — Knowledge 4+ may reveal stairs to the Foyer."],
  };
}

export function attemptHiddenLatch(state: GameState): GameState {
  const active = state.players[state.activePlayerIndex];
  if (active.knowledge < LATCH_KNOWLEDGE_MIN) {
    return {
      ...state,
      pendingVertical: null,
      log: [
        ...state.log,
        `${active.name} cannot work the hidden latch (Knowledge ${LATCH_KNOWLEDGE_MIN}+ required).`,
      ],
    };
  }

  let next = spawnBasementStairs(state);
  return {
    ...next,
    pendingVertical: null,
    log: [
      ...next.log,
      `${active.name} trips the hidden latch — stairs to the Foyer emerge!`,
    ],
  };
}

export function dismissHiddenLatch(state: GameState): GameState {
  return { ...state, pendingVertical: null };
}

function movePlayerVertical(
  state: GameState,
  playerIndex: number,
  dest: { floor: Floor; x: number; y: number },
  apCost: number,
  logMessage: string
): GameState {
  const player = state.players[playerIndex];
  const players = state.players.map((p, i) =>
    i === playerIndex
      ? { ...p, floor: dest.floor, x: dest.x, y: dest.y, ap: p.ap - apCost }
      : p
  );
  return {
    ...state,
    players,
    viewFloor: dest.floor,
    log: [...state.log, logMessage],
  };
}

export function executeVerticalMove(
  state: GameState,
  optionId: string
): GameState {
  const playerIndex = state.activePlayerIndex;
  const options = getVerticalMoveOptions(state, playerIndex);
  const option = options.find((o) => o.id === optionId);
  if (!option) return state;

  const player = state.players[playerIndex];

  if (option.kind === "stairs-up" && state.stairsLink) {
    const dest = state.stairsLink.foyer;
    return movePlayerVertical(
      state,
      playerIndex,
      dest,
      option.apCost,
      `${player.name} climbs the stairs to the Foyer.`
    );
  }

  if (option.kind === "stairs-down" && state.stairsLink) {
    const dest = state.stairsLink.basement;
    return movePlayerVertical(
      state,
      playerIndex,
      dest,
      option.apCost,
      `${player.name} descends the stairs to the Basement.`
    );
  }

  if (option.kind === "rope-climb" && option.dropId) {
    const drop = state.verticalDrops.find((d) => d.id === option.dropId);
    if (!drop) return state;
    return movePlayerVertical(
      state,
      playerIndex,
      drop.from,
      option.apCost,
      `${player.name} climbs the rope back up!`
    );
  }

  if (option.kind === "portal" && option.tokenId) {
    return {
      ...state,
      pendingVertical: { mode: "portal-select", fromTokenId: option.tokenId },
    };
  }

  return state;
}

export function executePortalTeleport(
  state: GameState,
  toTokenId: string
): GameState {
  const pending = state.pendingVertical;
  if (!pending || pending.mode !== "portal-select") return state;

  const fromToken = state.passageTokens.find((t) => t.id === pending.fromTokenId);
  const toToken = state.passageTokens.find((t) => t.id === toTokenId);
  if (!fromToken || !toToken || fromToken.id === toToken.id) return state;

  const playerIndex = state.activePlayerIndex;
  const player = state.players[playerIndex];
  if (player.ap < 1) return state;

  const players = state.players.map((p, i) =>
    i === playerIndex
      ? {
          ...p,
          floor: toToken.floor,
          x: toToken.x,
          y: toToken.y,
          ap: p.ap - 1,
        }
      : p
  );

  return {
    ...state,
    players,
    viewFloor: toToken.floor,
    pendingVertical: null,
    log: [
      ...state.log,
      `${player.name} slips through a secret passage from ${fromToken.roomName} to ${toToken.roomName}.`,
    ],
  };
}

export function dismissPortalSelect(state: GameState): GameState {
  if (state.pendingVertical?.mode === "portal-select") {
    return { ...state, pendingVertical: null };
  }
  return state;
}

export function onDiscoverTile(state: GameState, tile: Tile): GameState {
  let next = state;

  if (isBasementStairsTile(tile) && !state.stairsLink) {
    next = establishStairsLink(next, tile.x, tile.y);
  }

  if (isSecretPortalRoom(tile)) {
    next = addPassageToken(next, tile);
  }

  return next;
}
