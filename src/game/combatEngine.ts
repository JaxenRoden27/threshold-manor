import { ITEM_DEFINITIONS } from "./cardData";
import { rollBetrayalDice } from "./diceEngine";
import type {
  CombatState,
  DamageAllocation,
  DamagePool,
  GameState,
  Player,
  Stat,
} from "./types";
import { getHauntScenario } from "./hauntMatrix";
import { checkHauntVictory } from "./hauntEngine";

const GUARD_BONUS_DICE = 2;

export function getBestCombatItem(
  player: Player,
  mental: boolean
): { stat: Stat; bonus: number } {
  let best: { stat: Stat; bonus: number } = {
    stat: mental ? "knowledge" : "might",
    bonus: 0,
  };
  for (const itemId of player.inventory) {
    const def = ITEM_DEFINITIONS[itemId];
    if (!def) continue;
    const stat = def.combatAttackStat ?? "might";
    const isMental = def.mentalAttack ?? stat === "knowledge";
    if (mental && !isMental) continue;
    if (!mental && isMental) continue;
    const bonus = def.combatAttackBonus ?? 0;
    if (bonus > best.bonus) best = { stat, bonus };
  }
  return best;
}

export function countFlankingAllies(
  state: GameState,
  attacker: Player,
  defenderId: string
): number {
  return state.players.filter(
    (p) =>
      p.id !== attacker.id &&
      p.id !== defenderId &&
      p.floor === attacker.floor &&
      p.x === attacker.x &&
      p.y === attacker.y &&
      p.isTraitor === attacker.isTraitor
  ).length;
}

export function findOpposingOnTile(
  state: GameState,
  active: Player,
  tileFloor: Player["floor"],
  tileX: number,
  tileY: number
): { type: "player"; id: string } | null {
  if (state.phase !== "HAUNT_ACTIVE") return null;
  const opponent = state.players.find(
    (p) =>
      p.id !== active.id &&
      p.floor === tileFloor &&
      p.x === tileX &&
      p.y === tileY &&
      p.isTraitor !== active.isTraitor
  );
  return opponent ? { type: "player", id: opponent.id } : null;
}

export function startCombat(
  state: GameState,
  defenderId: string,
  defenderType: "player" | "monster",
  mentalAttack = false
): GameState {
  if (state.phase !== "HAUNT_ACTIVE" && state.phase !== "exploration")
    return state;
  const attacker = state.players[state.activePlayerIndex];
  if (!attacker || attacker.ap <= 0) return state;

  const weapon = getBestCombatItem(attacker, mentalAttack);
  const attackStat = mentalAttack ? "knowledge" : weapon.stat;
  const defenseStat: Stat = mentalAttack ? "sanity" : "might";
  const flankingBonus =
    defenderType === "player"
      ? countFlankingAllies(state, attacker, defenderId)
      : 0;

  let guardBonus = 0;
  if (defenderType === "player") {
    const defender = state.players.find((p) => p.id === defenderId);
    if (defender?.guardNextCombat) guardBonus = GUARD_BONUS_DICE;
  }

  const combat: CombatState = {
    attackerId: attacker.id,
    defenderId,
    defenderType,
    attackStat,
    defenseStat,
    mental: mentalAttack,
    phase: "rolling",
    flankingBonus,
    guardBonus,
    log: [
      `${attacker.name} attacks (${attackStat} vs ${defenseStat})${
        flankingBonus ? ` with ${flankingBonus} flanking die(s)` : ""
      }${guardBonus ? ` — defender is on guard (+${guardBonus})` : ""}.`,
    ],
  };

  return { ...state, combat };
}

export function rollCombatDice(state: GameState): {
  attackerDice: number[];
  defenderDice: number[];
  attackerTotal: number;
  defenderTotal: number;
} {
  const combat = state.combat!;
  const attacker = state.players.find((p) => p.id === combat.attackerId)!;
  const weapon = getBestCombatItem(attacker, combat.mental);
  const atkDiceCount =
    attacker[combat.attackStat] + (combat.flankingBonus ?? 0);
  const { dice: attackerDice } = rollBetrayalDice(atkDiceCount);
  const attackerTotal =
    attackerDice.reduce((s, d) => s + d, 0) + weapon.bonus;

  let defDiceCount = 0;
  if (combat.defenderType === "player") {
    const defender = state.players.find((p) => p.id === combat.defenderId)!;
    defDiceCount = defender[combat.defenseStat] + (combat.guardBonus ?? 0);
  } else if (state.haunt) {
    const monster = getHauntScenario(state.haunt.scenarioId).monster;
    defDiceCount =
      (combat.defenseStat === "sanity" ? monster?.sanity : monster?.might) ?? 0;
  }
  const { dice: defenderDice } = rollBetrayalDice(defDiceCount);
  const defenderTotal = defenderDice.reduce((s, d) => s + d, 0);

  return { attackerDice, defenderDice, attackerTotal, defenderTotal };
}

export function resolveCombatRoll(
  state: GameState,
  attackerDice: number[],
  defenderDice: number[],
  attackerTotal: number,
  defenderTotal: number
): GameState {
  const combat = state.combat;
  if (!combat || combat.phase !== "rolling") return state;

  const damage = Math.abs(attackerTotal - defenderTotal);
  const attackerWins = attackerTotal > defenderTotal;
  const tie = attackerTotal === defenderTotal;
  let log = [...state.log, ...combat.log];

  log.push(
    `Attack ${attackerTotal} vs Defense ${defenderTotal}${
      tie ? " — tied, no damage." : ` — ${damage} damage.`
    }`
  );

  let players = state.players.map((p) =>
    p.id === combat.defenderId && combat.defenderType === "player"
      ? { ...p, guardNextCombat: false }
      : p
  );

  players = players.map((p) =>
    p.id === combat.attackerId ? { ...p, ap: Math.max(0, p.ap - 1) } : p
  );

  if (tie || damage === 0) {
    return {
      ...state,
      players,
      combat: {
        ...combat,
        phase: "resolved",
        attackerDice,
        defenderDice,
        attackerTotal,
        defenderTotal,
        damage: 0,
        log: combat.log,
      },
      log,
    };
  }

  const damagePool: DamagePool = combat.mental ? "mental" : "physical";

  if (combat.defenderType === "monster" && state.haunt && attackerWins) {
    const scenario = getHauntScenario(state.haunt.scenarioId);
    const monsterHp = Math.max(
      0,
      (state.haunt.monsterHp ?? scenario.monster?.hp ?? 0) - damage
    );
    log.push(`${scenario.monster?.name} takes ${damage} damage.`);
    let next: GameState = {
      ...state,
      players,
      haunt: { ...state.haunt, monsterHp },
      combat: {
        ...combat,
        phase: "resolved",
        attackerDice,
        defenderDice,
        attackerTotal,
        defenderTotal,
        damage,
        winnerId: combat.attackerId,
        log: combat.log,
      },
      log,
    };
    return checkHauntVictory(next);
  }

  if (combat.defenderType === "monster" && !attackerWins) {
    return {
      ...state,
      players,
      combat: {
        ...combat,
        phase: "allocate-damage",
        attackerDice,
        defenderDice,
        attackerTotal,
        defenderTotal,
        damage,
        winnerId: combat.defenderId,
        loserId: combat.attackerId,
        damagePool,
        log: combat.log,
      },
      log,
    };
  }

  const winnerId = attackerWins ? combat.attackerId : combat.defenderId;
  const loserId = attackerWins ? combat.defenderId : combat.attackerId;

  return {
    ...state,
    players,
    combat: {
      ...combat,
      phase: "allocate-damage",
      attackerDice,
      defenderDice,
      attackerTotal,
      defenderTotal,
      damage,
      winnerId,
      loserId,
      damagePool,
      log: combat.log,
    },
    log,
  };
}

export function applyDamageAllocation(
  state: GameState,
  allocation: DamageAllocation
): GameState {
  const combat = state.combat;
  if (!combat || combat.phase !== "allocate-damage" || !combat.loserId) {
    return state;
  }

  const damage = combat.damage ?? 0;
  const pool = combat.damagePool ?? "physical";
  const allocated =
    pool === "physical"
      ? (allocation.might ?? 0) + (allocation.speed ?? 0)
      : (allocation.sanity ?? 0) + (allocation.knowledge ?? 0);

  if (allocated !== damage) return state;

  const players = state.players.map((p) => {
    if (p.id !== combat.loserId) return p;
    return {
      ...p,
      might: Math.max(0, p.might - (allocation.might ?? 0)),
      speed: Math.max(0, p.speed - (allocation.speed ?? 0)),
      sanity: Math.max(0, p.sanity - (allocation.sanity ?? 0)),
      knowledge: Math.max(0, p.knowledge - (allocation.knowledge ?? 0)),
    };
  });

  const loser = state.players.find((p) => p.id === combat.loserId);
  let log = [
    ...state.log,
    `${loser?.name} assigns ${damage} damage across ${
      pool === "physical" ? "Might/Speed" : "Sanity/Knowledge"
    }.`,
  ];

  let next: GameState = {
    ...state,
    players,
    combat: { ...combat, phase: "resolved" },
    log,
  };
  next = checkHauntVictory(next);
  return next;
}

export function setGuard(state: GameState, playerId: string): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.ap <= 0) return state;
  const players = state.players.map((p) =>
    p.id === playerId
      ? { ...p, ap: p.ap - 1, guardNextCombat: true }
      : p
  );
  return {
    ...state,
    players,
    log: [
      ...state.log,
      `${player.name} takes a defensive guard (+${GUARD_BONUS_DICE} dice next combat).`,
    ],
  };
}

export function dismissCombat(state: GameState): GameState {
  return { ...state, combat: null };
}
