import { ITEM_DEFINITIONS } from "./cardData";
import { rollBetrayalDice } from "./diceEngine";
import type {
  CombatState,
  GameState,
  Player,
  Stat,
} from "./types";
import { getHauntScenario } from "./hauntMatrix";
import { checkHauntVictory } from "./hauntEngine";

export function getBestCombatItem(
  player: Player,
  mental: boolean
): { stat: Stat; bonus: number } {
  let best: { stat: Stat; bonus: number } = { stat: mental ? "knowledge" : "might", bonus: 0 };
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

export function getDefenseBonus(player: Player): number {
  return player.inventory.reduce((sum, itemId) => {
    const def = ITEM_DEFINITIONS[itemId];
    return sum + (def?.combatDefenseBonus ?? 0);
  }, 0);
}

export function startCombat(
  state: GameState,
  defenderId: string,
  defenderType: "player" | "monster",
  mentalAttack = false
): GameState {
  if (state.phase !== "HAUNT_ACTIVE" && state.phase !== "exploration") return state;
  const attacker = state.players[state.activePlayerIndex];
  if (!attacker || attacker.ap <= 0) return state;

  const weapon = getBestCombatItem(attacker, mentalAttack);
  const attackStat = weapon.stat;
  const defenseStat: Stat =
    mentalAttack || weapon.stat === "knowledge" ? "sanity" : "might";

  const combat: CombatState = {
    attackerId: attacker.id,
    defenderId,
    defenderType,
    attackStat,
    defenseStat,
    phase: "rolling",
    log: [
      `${attacker.name} initiates combat (${attackStat} vs ${defenseStat}).`,
    ],
  };

  return { ...state, combat };
}

export function resolveCombatRoll(
  state: GameState,
  attackerDice: number[],
  defenderDice: number[]
): GameState {
  const combat = state.combat;
  if (!combat || combat.phase !== "rolling") return state;

  const attacker = state.players.find((p) => p.id === combat.attackerId);
  if (!attacker) return state;

  const weapon = getBestCombatItem(
    attacker,
    combat.attackStat === "knowledge"
  );
  const atkBonus = weapon.bonus;
  const attackerTotal =
    attackerDice.reduce((s, d) => s + d, 0) + attacker[combat.attackStat] + atkBonus;

  let defenderTotal = 0;
  let damage = 0;
  let log = [...state.log, ...combat.log];
  let players = [...state.players];
  let haunt = state.haunt;
  let phase = state.phase;

  if (combat.defenderType === "player") {
    const defender = players.find((p) => p.id === combat.defenderId);
    if (!defender) return state;
    const defBonus = getDefenseBonus(defender);
    defenderTotal =
      defenderDice.reduce((s, d) => s + d, 0) +
      defender[combat.defenseStat] +
      defBonus;
    damage = Math.max(0, attackerTotal - defenderTotal);

    log.push(
      `Attack ${attackerTotal} vs Defense ${defenderTotal} → ${damage} damage to ${combat.defenseStat}.`
    );

    players = players.map((p) => {
      if (p.id !== combat.defenderId) return p;
      const next = { ...p };
      next[combat.defenseStat] = Math.max(0, p[combat.defenseStat] - damage);
      return next;
    });

    players = players.map((p) =>
      p.id === combat.attackerId ? { ...p, ap: Math.max(0, p.ap - 1) } : p
    );
  } else if (combat.defenderType === "monster" && haunt) {
    const scenario = getHauntScenario(haunt.scenarioId);
    const monster = scenario.monster;
    if (!monster) return state;
    const monsterDefense =
      combat.defenseStat === "sanity" ? monster.sanity : monster.might;
    defenderTotal =
      defenderDice.reduce((s, d) => s + d, 0) + monsterDefense;
    damage = Math.max(0, attackerTotal - defenderTotal);
    const monsterHp = Math.max(0, (haunt.monsterHp ?? monster.hp) - damage);

    log.push(
      `Attack ${attackerTotal} vs ${monster.name} ${defenderTotal} → ${damage} damage.`
    );

    haunt = { ...haunt, monsterHp };
    players = players.map((p) =>
      p.id === combat.attackerId ? { ...p, ap: Math.max(0, p.ap - 1) } : p
    );
  }

  let next: GameState = {
    ...state,
    players,
    haunt,
    phase,
    combat: {
      ...combat,
      phase: "resolved",
      attackerDice,
      defenderDice,
      attackerTotal,
      defenderTotal,
      damage,
      log: combat.log,
    },
    log,
  };

  next = checkHauntVictory(next);
  return next;
}

export function dismissCombat(state: GameState): GameState {
  return { ...state, combat: null };
}

export function rollCombatForActive(state: GameState): {
  attackerDice: number[];
  defenderDice: number[];
} {
  const combat = state.combat;
  if (!combat) {
    return { attackerDice: [], defenderDice: [] };
  }
  const attacker = state.players.find((p) => p.id === combat.attackerId);
  if (!attacker) return { attackerDice: [], defenderDice: [] };

  const weapon = getBestCombatItem(
    attacker,
    combat.attackStat === "knowledge"
  );
  const atkCount = attacker[weapon.stat];
  const { dice: attackerDice } = rollBetrayalDice(atkCount);

  let defCount = 0;
  if (combat.defenderType === "player") {
    const defender = state.players.find((p) => p.id === combat.defenderId);
    defCount = defender ? defender[combat.defenseStat] : 0;
  } else if (state.haunt) {
    const scenario = getHauntScenario(state.haunt.scenarioId);
    const monster = scenario.monster;
    defCount = monster
      ? combat.defenseStat === "sanity"
        ? monster.sanity
        : monster.might
      : 0;
  }

  const { dice: defenderDice } = rollBetrayalDice(defCount);
  return { attackerDice, defenderDice };
}
