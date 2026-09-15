import { createShuffledCardDecks, discardResolvedEvent } from "./cardEngine";
import { applyTierAction, resolveWinningTier } from "./eventEngine";
import {
  findOpposingOnTile,
  startCombat,
} from "./combatEngine";
import {
  createStarterTiles,
  DIRECTION_DELTA,
  OPPOSITE,
  templateToTile,
} from "./tileData";
import { createRoomDeck, drawRoom, getStarterPlacedIds } from "./roomEngine";
import {
  getTransitionDestination,
  getTransitionKind,
  getTransitionLabel,
  transitionCostsAp,
} from "./roomTransitions";
import {
  activateElevatorFromRoom,
  beginElevatorSequence,
  completeElevatorFloorPick,
  completeElevatorRoll,
  isMysticElevatorTile,
} from "./mysticElevatorEngine";
import {
  barrierFailMessage,
  canCrossBarrier,
  handleCoalChuteEnter,
  handleCollapsedRoomEnter,
  handleGalleryEnter,
  isBarrierCrossing,
  withEnteredFrom,
} from "./specialRooms";
import {
  attemptHiddenLatch,
  dismissHiddenLatch,
  dismissPortalSelect,
  executePortalTeleport,
  executeVerticalMove,
  maybeTriggerHiddenLatch,
  onDiscoverTile,
} from "./verticalTraversal";
import {
  drawCardForSymbol,
  handleOnTurnEnd,
  attemptVaultLockpick as vaultLockpick,
} from "./roomHandlers";
import {
  createPlayerFromTemplateId,
  nextLivingPlayerIndex,
  playerStat,
  applyStatDelta,
  isPostHaunt,
} from "./statEngine";
import { EXPLORER_BY_ID, sortExplorerIdsByAge } from "./characterData";
import type {
  Direction,
  Floor,
  GameState,
  PendingCard,
  Phase,
  Player,
  RoomTransitionKind,
  Stat,
  Tile,
} from "./types";
import { startHaunt } from "./hauntEngine";
import {
  betrayalFaceLabel,
  checkHauntTrigger,
  rollBetrayalDice,
} from "./diceEngine";

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
    roomDeck: [],
    placedRoomIds: [],
    drawnCardIds: [],
    activeGameOmenIds: [],
    cardDecks: createShuffledCardDecks(),
    haunt: null,
    combat: null,
    lastOmenRoomTemplateId: null,
    pendingTransition: null,
    pendingVaultItems: [],
    pendingVaultLockpick: null,
    pendingElevator: null,
    verticalDrops: [],
    passageTokens: [],
    stairsLink: null,
    pendingVertical: null,
  });
}

export function setPlayerCount(state: GameState, count: number): GameState {
  return { ...state, selectedPlayerCount: Math.min(6, Math.max(2, count)) };
}

export function startMultiplayerGame(
  members: { peerId: string; characterId: string | null }[]
): GameState {
  const sorted = [...members]
    .filter((m) => m.characterId)
    .sort((a, b) => {
      const ageA = EXPLORER_BY_ID[a.characterId!]?.age ?? 99;
      const ageB = EXPLORER_BY_ID[b.characterId!]?.age ?? 99;
      return ageA - ageB;
    });
  const selectedIds = sorted.map((m) => m.characterId!) as string[];
  const state = startGame(createInitialState(), selectedIds);
  const players = state.players.map((p, i) => ({
    ...p,
    id: sorted[i]?.peerId ?? p.id,
  }));
  const youngest = players[0];
  return {
    ...state,
    players,
    selectedPlayerCount: members.length,
    log: [
      ...state.log,
      `${members.length} investigators enter Threshold Manor together.`,
      youngest
        ? `Turn order: youngest first — ${youngest.name} (age ${youngest.age}) opens.`
        : "",
    ].filter(Boolean),
  };
}

export function startGame(
  state: GameState,
  selectedIds: string[]
): GameState {
  const count = Math.min(6, Math.max(2, selectedIds.length));
  const orderedIds = sortExplorerIdsByAge(selectedIds).slice(0, count);
  const players: Player[] = orderedIds
    .map((id, i) =>
      createPlayerFromTemplateId(id, { id: `player-${i}`, index: i })
    )
    .filter(Boolean) as Player[];

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
    roomDeck: createRoomDeck(),
    placedRoomIds: getStarterPlacedIds(),
    drawnCardIds: [],
    activeGameOmenIds: [],
    cardDecks: createShuffledCardDecks(),
    haunt: null,
    combat: null,
    lastOmenRoomTemplateId: null,
    pendingTransition: null,
    pendingVaultItems: [],
    pendingVaultLockpick: null,
    pendingElevator: null,
    verticalDrops: [],
    passageTokens: [],
    stairsLink: null,
    pendingVertical: null,
    log: [
      "You stand in the Entrance Hall. The door seals behind you.",
      "Explore floor by floor. Uncover Omens—but each one risks the Haunt.",
      players[0]
        ? `Turn order: youngest first — ${players[0].name} (age ${players[0].age}) opens.`
        : "",
    ].filter(Boolean),
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

function updatePlayer(
  players: Player[],
  index: number,
  updater: (p: Player) => Player
): Player[] {
  return players.map((p, i) => (i === index ? updater(p) : p));
}

function beginTurnForPlayer(players: Player[], index: number): Player[] {
  return players.map((p, i) =>
    i === index
      ? { ...p, ap: playerStat(p, "speed"), enteredFrom: undefined }
      : p
  );
}

function applyStatEffect(
  player: Player,
  stat: Stat,
  delta: number,
  postHaunt: boolean
): Player {
  return applyStatDelta(player, stat, delta, postHaunt);
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

  const total = dice.reduce((sum, face) => sum + face, 0);
  const playerIndex = state.activePlayerIndex;
  let next = { ...state };
  let winningTierIndex = 0;

  const rollLine = `${state.players[playerIndex].name} rolls ${dice.map(betrayalFaceLabel).join(", ")} = ${total}.`;

  if (card.tiers && card.tiers.length > 0) {
    const { tier, index } = resolveWinningTier(total, card.tiers);
    winningTierIndex = index;
    const result = applyTierAction(
      { ...state, log: [...state.log, rollLine, tier.text] },
      playerIndex,
      tier.action
    );
    next = result.state;
  } else {
    next.log = [...state.log, rollLine];
  }

  const tiles = next.tiles.map((t) =>
    t.id === pending.tileId ? { ...t, cardResolved: true } : t
  );

  return {
    ...next,
    tiles,
    pendingCard: {
      ...pending,
      statDice: dice,
      roll: total,
      success: true,
      rollPhase: "complete",
      resolved: true,
      winningTierIndex,
    },
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

  const postHaunt = isPostHaunt(state.phase, state.haunt);
  if (card.omenStatBonus) {
    players = updatePlayer(state.players, state.activePlayerIndex, (p) =>
      applyStatEffect(
        p,
        card.omenStatBonus!.stat,
        card.omenStatBonus!.delta,
        postHaunt
      )
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
    activeGameOmenIds: state.activeGameOmenIds.includes(card.id)
      ? state.activeGameOmenIds
      : [...state.activeGameOmenIds, card.id],
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
  const postHaunt = isPostHaunt(state.phase, state.haunt);
  if (effect) {
    players = updatePlayer(players, state.activePlayerIndex, (p) =>
      applyStatEffect(p, effect.stat, effect.delta, postHaunt)
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
  if (state.pendingVaultItems.length > 0) {
    const [nextCard, ...rest] = state.pendingVaultItems;
    return {
      ...state,
      pendingCard: nextCard,
      pendingVaultItems: rest,
    };
  }

  let cardDecks = state.cardDecks;
  const pending = state.pendingCard;
  if (pending?.resolved && pending.card.type === "event") {
    cardDecks = discardResolvedEvent(cardDecks, pending.card.id);
  }

  const active = getActivePlayer(state);
  let players = state.players;
  const nextIndex = nextLivingPlayerIndex(players, state.activePlayerIndex);
  players = beginTurnForPlayer(players, nextIndex);
  const next = players[nextIndex];

  return {
    ...state,
    cardDecks,
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

function maybeTriggerHauntCombat(
  state: GameState,
  active: Player,
  floor: Floor,
  x: number,
  y: number
): GameState {
  const opponent = findOpposingOnTile(state, active, floor, x, y);
  if (!opponent || state.combat) return state;
  return startCombat(state, opponent.id, "player", false);
}

export function movePlayer(
  state: GameState,
  direction: Direction
): GameState {
  const movablePhases: Phase[] = ["exploration", "HAUNT_ACTIVE"];
  if (
    !movablePhases.includes(state.phase) ||
    state.pendingCard ||
    state.combat ||
    state.pendingElevator ||
    state.pendingVertical
  )
    return state;

  const active = getActivePlayer(state);
  if (!active.isAlive || active.ap <= 0) return state;

  const currentTile = getTileAt(state.tiles, active.floor, active.x, active.y);
  if (!currentTile || !currentTile.doors[direction]) return state;

  if (
    currentTile.barrierStat &&
    isBarrierCrossing(currentTile, active.enteredFrom, direction) &&
    !canCrossBarrier(active, currentTile)
  ) {
    return {
      ...state,
      log: [...state.log, barrierFailMessage(active, currentTile)],
    };
  }

  const { dx, dy } = DIRECTION_DELTA[direction];
  const nx = active.x + dx;
  const ny = active.y + dy;

  let tiles = [...state.tiles];
  let nextState: GameState = { ...state };
  let log = [...state.log];
  let pendingCard: PendingCard | null = state.pendingCard;
  let pendingVaultLockpick = state.pendingVaultLockpick;

  const existing = getTileAt(tiles, active.floor, nx, ny);
  if (!existing) {
    const requiredDoor = OPPOSITE[direction];
    const draw = drawRoom(nextState, active.floor, requiredDoor);
    nextState = draw.state;
    if (!draw.template) {
      log.push(
        `${active.name} finds a bricked-up doorway to the ${direction}.`
      );
      return { ...nextState, log };
    }
    const newTile = templateToTile(draw.template, active.floor, nx, ny);
    tiles.push(newTile);
    log.push(
      `${active.name} discovers ${newTile.name} on the ${active.floor} floor.`
    );
  }

  const targetTile = getTileAt(tiles, active.floor, nx, ny)!;
  const isNewDiscovery = !targetTile.visited;
  const symbol = targetTile.symbol;

  let newAp = active.ap - 1;
  if (isNewDiscovery && symbol !== "none") {
    newAp = 0;
  }

  let players = withEnteredFrom(
    updatePlayer(state.players, state.activePlayerIndex, (p) => ({
      ...p,
      x: nx,
      y: ny,
      ap: newAp,
    })),
    state.activePlayerIndex,
    OPPOSITE[direction]
  );

  if (isNewDiscovery) {
    tiles = tiles.map((t) =>
      t.id === targetTile.id ? { ...t, visited: true } : t
    );

    if (symbol !== "none") {
      const drawResult = drawCardForSymbol(
        { ...nextState, log },
        symbol,
        targetTile.id
      );
      nextState = drawResult.state;
      log = drawResult.state.log;
      if (drawResult.pendingCard) {
        pendingCard = drawResult.pendingCard;
      }
    }

    if (targetTile.templateId === "vault" && targetTile.isLocked) {
      pendingVaultLockpick = targetTile.id;
    }
  }

  let next: GameState = {
    ...nextState,
    players,
    tiles,
    log,
    pendingCard,
    pendingVaultLockpick,
    viewFloor: active.floor,
  };

  if (isNewDiscovery) {
    const discovered =
      next.tiles.find((t) => t.id === targetTile.id) ?? targetTile;
    next = onDiscoverTile(next, discovered);
    tiles = next.tiles;
  }

  if (targetTile.special === "coal-chute") {
    next = handleCoalChuteEnter(next, state.activePlayerIndex, targetTile);
    players = next.players;
  } else if (targetTile.special === "collapsed-room") {
    next = handleCollapsedRoomEnter(next, state.activePlayerIndex, targetTile);
    players = next.players;
  } else if (targetTile.special === "gallery") {
    next = handleGalleryEnter(next, state.activePlayerIndex, targetTile);
    players = next.players;
  } else if (isMysticElevatorTile(targetTile)) {
    const elevatorTile =
      next.tiles.find((t) => t.id === targetTile.id) ?? targetTile;
    next = beginElevatorSequence(
      next,
      elevatorTile,
      next.players[state.activePlayerIndex].isTraitor
    );
  }

  if (!next.pendingElevator) {
    const moved = next.players[next.activePlayerIndex];
    next = maybeTriggerHauntCombat(
      next,
      moved,
      moved.floor,
      moved.x,
      moved.y
    );
  }

  next = maybeTriggerHiddenLatch(next);
  return next;
}

export function beginRoomTransition(state: GameState): GameState {
  const movablePhases: Phase[] = ["exploration", "HAUNT_ACTIVE"];
  if (
    !movablePhases.includes(state.phase) ||
    state.pendingCard ||
    state.combat ||
    state.pendingVertical
  )
    return state;

  const active = getActivePlayer(state);
  const currentTile = getTileAt(state.tiles, active.floor, active.x, active.y);
  if (!currentTile) return state;

  const kind = getTransitionKind(currentTile);
  if (!kind) return state;

  const apCost = transitionCostsAp(kind);
  if (active.ap < apCost) return state;

  return applyRoomTransition(state, kind);
}

export function activateElevator(state: GameState): GameState {
  const movablePhases: Phase[] = ["exploration", "HAUNT_ACTIVE"];
  if (
    !movablePhases.includes(state.phase) ||
    state.pendingCard ||
    state.combat ||
    state.pendingElevator ||
    state.pendingVaultLockpick ||
    state.pendingVertical
  )
    return state;
  return activateElevatorFromRoom(state);
}

export function completeElevatorTransition(
  state: GameState,
  elevatorDice?: number[],
  floorPick?: Floor
): GameState {
  if (floorPick !== undefined) {
    return completeElevatorFloorPick(state, floorPick);
  }
  if (elevatorDice) {
    return completeElevatorRoll(state, elevatorDice);
  }
  return state;
}

export function applyRoomTransition(
  state: GameState,
  kind: RoomTransitionKind
): GameState {
  const active = getActivePlayer(state);
  const currentTile = getTileAt(state.tiles, active.floor, active.x, active.y);
  if (!currentTile) return state;

  const apCost = transitionCostsAp(kind);
  if (active.ap < apCost) return state;

  let tiles = [...state.tiles];
  let players = [...state.players];
  let log = [...state.log];
  const playerIndex = state.activePlayerIndex;

  const dest = getTransitionDestination(kind, currentTile);
  if (!dest) return state;

  const destTile = getTileAt(tiles, dest.floor, dest.x, dest.y);
  if (!destTile && kind !== "coal-chute") return state;

  players = updatePlayer(players, playerIndex, (p) => ({
    ...p,
    floor: dest.floor,
    x: dest.x,
    y: dest.y,
    ap: p.ap - apCost,
  }));

  const label = getTransitionLabel(kind);
  log.push(`${active.name}: ${label.replace(/ \(.*\)/, "")}.`);

  let next: GameState = {
    ...state,
    players,
    viewFloor: dest.floor,
    pendingTransition: null,
    log,
  };
  const moved = players[playerIndex];
  next = maybeTriggerHauntCombat(next, moved, dest.floor, dest.x, dest.y);
  return next;
}

/** @deprecated Use beginRoomTransition / applyRoomTransition */
export function useFloorTransition(state: GameState): GameState {
  return beginRoomTransition(state);
}

export function attemptVaultLockpick(state: GameState): GameState {
  const result = vaultLockpick(state, state.activePlayerIndex);
  return { ...result, pendingVaultLockpick: null };
}

export function dismissVaultLockpick(state: GameState): GameState {
  return { ...state, pendingVaultLockpick: null };
}

export function endTurn(state: GameState): GameState {
  const turnPhases: Phase[] = ["exploration", "HAUNT_ACTIVE"];
  if (
    !turnPhases.includes(state.phase) ||
    state.pendingCard ||
    state.combat ||
    state.pendingTransition ||
    state.pendingVaultLockpick ||
    state.pendingElevator ||
    state.pendingVertical
  )
    return state;

  let next = handleOnTurnEnd(state, state.activePlayerIndex);
  const nextIndex = nextLivingPlayerIndex(
    next.players,
    next.activePlayerIndex
  );
  const players = beginTurnForPlayer(next.players, nextIndex);
  const activePlayer = players[nextIndex];
  return {
    ...next,
    players,
    activePlayerIndex: nextIndex,
    viewFloor: activePlayer.floor,
    log: [...next.log, `${activePlayer.name} takes a fresh turn (${activePlayer.ap} AP).`],
  };
}

export function rollStatCheckForCard(state: GameState): { dice: number[]; total: number } {
  const pending = state.pendingCard;
  if (!pending?.card.stat) return rollBetrayalDice(1);
  const active = getActivePlayer(state);
  return rollBetrayalDice(playerStat(active, pending.card.stat));
}

export function performVerticalMove(state: GameState, optionId: string): GameState {
  const movablePhases: Phase[] = ["exploration", "HAUNT_ACTIVE"];
  if (
    !movablePhases.includes(state.phase) ||
    state.pendingCard ||
    state.combat ||
    state.pendingElevator
  )
    return state;
  return executeVerticalMove(state, optionId);
}

export function performPortalTeleport(state: GameState, toTokenId: string): GameState {
  const movablePhases: Phase[] = ["exploration", "HAUNT_ACTIVE"];
  if (
    !movablePhases.includes(state.phase) ||
    state.pendingCard ||
    state.combat ||
    state.pendingElevator
  )
    return state;
  return executePortalTeleport(state, toTokenId);
}

export function performHiddenLatch(state: GameState): GameState {
  if (state.pendingVertical?.mode !== "hidden-latch") return state;
  return attemptHiddenLatch(state);
}

export function dismissVerticalModal(state: GameState): GameState {
  if (state.pendingVertical?.mode === "hidden-latch") {
    return dismissHiddenLatch(state);
  }
  if (state.pendingVertical?.mode === "portal-select") {
    return dismissPortalSelect(state);
  }
  return state;
}
