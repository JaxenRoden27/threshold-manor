import type { HauntScenario } from "./types";

const BURN_PAINTING_ACTION = {
  id: "burn-painting",
  roomTemplateId: "portrait-gallery",
  label: "Burn the Cursed Painting",
  description:
    "Knowledge 5+ required. Destroy the weeping portrait to weaken the haunt.",
  stat: "knowledge" as const,
  minStat: 5,
  apCost: 1,
  survivorOnly: true,
};

const SEAL_RITUAL_ACTION = {
  id: "seal-ritual",
  roomTemplateId: "ritual-chamber",
  label: "Seal the Ritual Circle",
  description:
    "Knowledge 4+ required. Disrupt the traitor's binding ceremony.",
  stat: "knowledge" as const,
  minStat: 4,
  apCost: 1,
  survivorOnly: true,
};

const SABOTAGE_BOILER_ACTION = {
  id: "sabotage-boiler",
  roomTemplateId: "boiler-room",
  label: "Overload the Boiler",
  description: "Might 4+ required. Flood the basement to trap survivors.",
  stat: "might" as const,
  minStat: 4,
  apCost: 1,
  traitorOnly: true,
};

export const HAUNT_SCENARIOS: Record<string, HauntScenario> = {
  "haunt-burning-portraits": {
    id: "haunt-burning-portraits",
    name: "The Burning Portraits",
    traitorSelection: "highest-knowledge",
    survivorGoal:
      "Destroy the cursed paintings before the traitor completes the gallery ritual.",
    traitorGoal:
      "Complete three dark rituals in the Portrait Gallery while survivors burn.",
    survivorWinCondition:
      "Complete Burn the Cursed Painting twice, or reduce the traitor to 0 Sanity.",
    traitorWinCondition:
      "Complete Sabotage actions three times, or reduce all survivors to 0 Sanity.",
    secretsOfSurvival: [
      "The traitor gains power from intact portraits—burn them in the Gallery.",
      "Silver weapons and mental attacks bypass the Portrait Wraith's defenses.",
      "Stay together in the upper floor; the traitor hunts isolated investigators.",
    ],
    traitorsTome: [
      "You are the curator of the gallery's curse. Each intact portrait feeds your ritual.",
      "Sabotage the boiler to flood survivors into your hunting grounds.",
      "Feign cooperation until the third omen's power settles in your veins.",
    ],
    hauntActions: [BURN_PAINTING_ACTION, SABOTAGE_BOILER_ACTION],
    monster: {
      id: "portrait-wraith",
      name: "Portrait Wraith",
      might: 4,
      sanity: 3,
      hp: 6,
    },
  },
  "haunt-ritual-betrayal": {
    id: "haunt-ritual-betrayal",
    name: "Ritual of Betrayal",
    traitorSelection: "lowest-sanity",
    survivorGoal:
      "Seal the ritual chamber before the traitor sacrifices the party.",
    traitorGoal: "Complete the blood binding in the Ritual Chamber.",
    survivorWinCondition:
      "Seal the Ritual Circle twice, or defeat the Bound Horror.",
    traitorWinCondition:
      "Reduce all survivors to 0 Sanity, or complete three traitor rituals.",
    secretsOfSurvival: [
      "The Ritual Chamber is the key—reach it before the traitor.",
      "Mental attacks are effective against the Bound Horror.",
      "Watch for sudden Sanity loss; the traitor may be among you.",
    ],
    traitorsTome: [
      "You swore the blood oath in the basement. The house demands a sacrifice.",
      "Lure survivors to the Ritual Chamber to complete the binding.",
      "The Bound Horror serves you—direct it against isolated prey.",
    ],
    hauntActions: [SEAL_RITUAL_ACTION, SABOTAGE_BOILER_ACTION],
    monster: {
      id: "bound-horror",
      name: "Bound Horror",
      might: 5,
      sanity: 2,
      hp: 8,
    },
  },
  "haunt-default": {
    id: "haunt-default",
    name: "The House Awakens",
    traitorSelection: "random",
    survivorGoal: "Uncover the traitor and survive the manor's wrath.",
    traitorGoal: "Eliminate the investigators before they escape.",
    survivorWinCondition:
      "Reduce the traitor or monster to 0 in any stat, or complete two haunt actions.",
    traitorWinCondition:
      "Reduce all survivors to 0 Might or Sanity.",
    secretsOfSurvival: [
      "One among you has turned. Watch for suspicious behavior after the Haunt.",
      "Use items for combat bonuses—crowbars and journals matter now.",
      "Complete haunt actions on marked rooms to progress toward victory.",
    ],
    traitorsTome: [
      "The house chose you. Strike when survivors split up.",
      "Your goal is annihilation—attack weakened investigators.",
      "Pretend to help with haunt actions until you can strike.",
    ],
    hauntActions: [BURN_PAINTING_ACTION, SEAL_RITUAL_ACTION],
  },
};

/** Matrix lookup: [omenId][roomTemplateId] → scenario id */
export const HAUNT_MATRIX: Record<string, Record<string, string>> = {
  "omen-portrait": {
    "portrait-gallery": "haunt-burning-portraits",
    "guest-bedroom": "haunt-burning-portraits",
    "music-room": "haunt-burning-portraits",
  },
  "omen-sigil": {
    "ritual-chamber": "haunt-ritual-betrayal",
    "root-vault": "haunt-ritual-betrayal",
    "flooded-tunnels": "haunt-ritual-betrayal",
  },
  "omen-blood": {
    "ritual-chamber": "haunt-ritual-betrayal",
    "wine-cellar": "haunt-ritual-betrayal",
  },
  "omen-diary": {
    "nursery": "haunt-burning-portraits",
    "attic-landing": "haunt-ritual-betrayal",
  },
  "omen-mirror": {
    "portrait-gallery": "haunt-burning-portraits",
    "guest-bedroom": "haunt-burning-portraits",
  },
  "omen-chalice": {
    "ritual-chamber": "haunt-ritual-betrayal",
    "wine-cellar": "haunt-ritual-betrayal",
  },
};

export function lookupHauntScenario(
  omenId: string,
  roomTemplateId: string
): HauntScenario {
  const scenarioId =
    HAUNT_MATRIX[omenId]?.[roomTemplateId] ?? "haunt-default";
  return HAUNT_SCENARIOS[scenarioId] ?? HAUNT_SCENARIOS["haunt-default"];
}

export function getHauntScenario(scenarioId: string): HauntScenario {
  return HAUNT_SCENARIOS[scenarioId] ?? HAUNT_SCENARIOS["haunt-default"];
}
