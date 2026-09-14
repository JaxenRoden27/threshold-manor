import type { GameState, HauntState, Phase, Player, TraitorSelection } from "./types";
import { getHauntScenario, lookupHauntScenario } from "./hauntMatrix";

export function checkHauntTrigger(
  hauntRollTotal: number,
  omensDrawn: number
): boolean {
  return hauntRollTotal < omensDrawn;
}

function selectTraitor(
  players: Player[],
  method: TraitorSelection
): string {
  if (players.length === 0) return "";
  switch (method) {
    case "lowest-sanity": {
      const sorted = [...players].sort((a, b) => a.sanity - b.sanity);
      return sorted[0].id;
    }
    case "highest-knowledge": {
      const sorted = [...players].sort((a, b) => b.knowledge - a.knowledge);
      return sorted[0].id;
    }
    case "random":
    default: {
      const index = Math.floor(Math.random() * players.length);
      return players[index].id;
    }
  }
}

export function startHaunt(
  state: GameState,
  omenId: string,
  roomTemplateId: string
): GameState {
  const scenario = lookupHauntScenario(omenId, roomTemplateId);
  const traitorPlayerId = selectTraitor(state.players, scenario.traitorSelection);
  const traitor = state.players.find((p) => p.id === traitorPlayerId);

  const players = state.players.map((p) => ({
    ...p,
    isTraitor: p.id === traitorPlayerId,
  }));

  const haunt: HauntState = {
    scenarioId: scenario.id,
    omenId,
    roomTemplateId,
    traitorPlayerId,
    completedActionIds: [],
    monsterHp: scenario.monster?.hp,
    briefingDismissed: false,
  };

  const log = [
    ...state.log,
    `The Haunt begins: ${scenario.name}!`,
    traitor
      ? `${traitor.name} has been chosen by the house—but who can you trust?`
      : "The house chooses its champion in secret.",
    "Read your manual. Survivors and traitor have different goals.",
  ];

  return {
    ...state,
    phase: "HAUNT_ACTIVE",
    players,
    haunt,
    pendingCard: null,
    combat: null,
    log,
  };
}

export function dismissHauntBriefing(state: GameState): GameState {
  if (!state.haunt) return state;
  return {
    ...state,
    haunt: { ...state.haunt, briefingDismissed: true },
  };
}

export function completeHauntAction(
  state: GameState,
  actionId: string
): GameState {
  if (!state.haunt || state.phase !== "HAUNT_ACTIVE") return state;

  const scenario = getHauntScenario(state.haunt.scenarioId);
  const action = scenario.hauntActions.find((a) => a.id === actionId);
  if (!action) return state;
  if (state.haunt.completedActionIds.includes(actionId)) return state;

  const active = state.players[state.activePlayerIndex];
  const completedActionIds = [...state.haunt.completedActionIds, actionId];
  const survivorCompletions = completedActionIds.filter((id) =>
    scenario.hauntActions.find((a) => a.id === id && a.survivorOnly)
  ).length;
  const traitorCompletions = completedActionIds.filter((id) =>
    scenario.hauntActions.find((a) => a.id === id && a.traitorOnly)
  ).length;

  let phase: Phase = state.phase;
  let log = [
    ...state.log,
    `${active.name} completes: ${action.label}.`,
  ];

  if (active.isTraitor && traitorCompletions >= 3) {
    phase = "defeat";
    log.push("The traitor's rituals succeed. The house claims the survivors.");
  } else if (!active.isTraitor && survivorCompletions >= 2) {
    phase = "victory";
    log.push("The survivors thwart the haunt. Dawn breaks over Threshold Manor.");
  }

  const players = state.players.map((p, i) =>
    i === state.activePlayerIndex ? { ...p, ap: Math.max(0, p.ap - action.apCost) } : p
  );

  return {
    ...state,
    players,
    phase,
    haunt: { ...state.haunt, completedActionIds },
    log,
  };
}

export function checkHauntVictory(state: GameState): GameState {
  if (!state.haunt || state.phase !== "HAUNT_ACTIVE") return state;

  const traitor = state.players.find((p) => p.id === state.haunt!.traitorPlayerId);
  const survivors = state.players.filter((p) => !p.isTraitor);

  if (traitor && (traitor.might <= 0 || traitor.sanity <= 0)) {
    return {
      ...state,
      phase: "victory",
      log: [...state.log, "The traitor falls. The survivors endure."],
    };
  }

  if (
    survivors.length > 0 &&
    survivors.every((p) => p.might <= 0 || p.sanity <= 0)
  ) {
    return {
      ...state,
      phase: "defeat",
      log: [...state.log, "The survivors are broken. The traitor wins."],
    };
  }

  if (state.haunt.monsterHp !== undefined && state.haunt.monsterHp <= 0) {
    return {
      ...state,
      phase: "victory",
      log: [...state.log, "The monster is destroyed. The haunt ends."],
    };
  }

  return state;
}
