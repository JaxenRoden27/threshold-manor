import type { Card, ItemDefinition } from "./types";

export const ITEM_DEFINITIONS: Record<string, ItemDefinition> = {
  "item-lantern": {
    id: "item-lantern",
    name: "Brass Lantern",
    description: "Steadies the nerves of its bearer.",
    passiveBonus: { sanity: 1 },
    combatDefenseBonus: 1,
  },
  "item-crowbar": {
    id: "item-crowbar",
    name: "Iron Crowbar",
    description: "A brutal lever in close quarters.",
    passiveBonus: { might: 1 },
    combatAttackStat: "might",
    combatAttackBonus: 1,
  },
  "item-journal": {
    id: "item-journal",
    name: "Scholar's Journal",
    description: "Occult notes sharpen the mind.",
    passiveBonus: { knowledge: 1 },
    combatAttackStat: "knowledge",
    combatAttackBonus: 1,
    mentalAttack: true,
  },
  "item-talisman": {
    id: "item-talisman",
    name: "Warded Talisman",
    description: "Protective sigils repel psychic assault.",
    passiveBonus: { sanity: 1 },
    combatDefenseBonus: 2,
  },
  "item-boots": {
    id: "item-boots",
    name: "Swift Boots",
    description: "Lightfooted escape from danger.",
    passiveBonus: { speed: 1 },
    combatDefenseBonus: 1,
  },
  "item-silver-dagger": {
    id: "item-silver-dagger",
    name: "Silver Dagger",
    description: "Blessed edge against unholy foes.",
    combatAttackStat: "might",
    combatAttackBonus: 2,
  },
  "item-hex-charm": {
    id: "item-hex-charm",
    name: "Hex Charm",
    description: "Channels malice through forbidden words.",
    combatAttackStat: "knowledge",
    combatAttackBonus: 2,
    mentalAttack: true,
  },
  "item-rope": {
    id: "item-rope",
    name: "Climbing Rope",
    description: "Climb back up one-way drops and chutes.",
  },
};

export const EVENT_CARDS: Card[] = [
  {
    id: "event-creaking-floorboards",
    type: "event",
    title: "Creaking Floorboards",
    flavor:
      "The boards buckle underfoot. Something below pulls at your ankles.",
    description: "Make a Speed roll. The house decides how far you fall.",
    stat: "speed",
    successText: "You keep your footing.",
    failureText: "The floor gives way!",
    tiers: [
      {
        range: "0-1",
        text: "The boards collapse — you plummet to the Basement Landing.",
        action: {
          teleportFloor: "basement",
          message: "The floorboards give way! You crash into the Basement Landing.",
        },
      },
      {
        range: "2-3",
        text: "You stumble but stay on this floor. Lose 1 Speed.",
        action: { stat: "speed", delta: -1 },
      },
      {
        range: "4+",
        text: "You dance across the groaning wood unscathed.",
        action: { stat: "speed", delta: 1, message: "Nimble footwork saves you." },
      },
    ],
  },
  {
    id: "event-whispers",
    type: "event",
    title: "Whispers in the Walls",
    flavor: "Cold voices coil around you, naming secrets you never spoke aloud.",
    description: "Make a Sanity roll.",
    stat: "sanity",
    successText: "The whispers fade.",
    failureText: "Your mind frays.",
    tiers: [
      {
        range: "0-1",
        text: "The voices claw inward. Lose 2 Sanity.",
        action: { stat: "sanity", delta: -2 },
      },
      {
        range: "2-3",
        text: "You steady your breath, shaken.",
        action: { stat: "sanity", delta: -1 },
      },
      {
        range: "4+",
        text: "You silence the whispers with iron will.",
        action: { stat: "sanity", delta: 1 },
      },
    ],
  },
  {
    id: "event-collapsing",
    type: "event",
    title: "Collapsing Beam",
    flavor: "Timber groans overhead. Dust rains into your eyes.",
    description: "Make a Might roll.",
    stat: "might",
    successText: "You hold the frame.",
    failureText: "The beam slams down.",
    tiers: [
      {
        range: "0-1",
        text: "Splinters rake your arms. Lose 2 Might.",
        action: { stat: "might", delta: -2 },
      },
      {
        range: "2-3",
        text: "You brace the beam, bruised but standing.",
        action: { stat: "might", delta: -1 },
      },
      {
        range: "4+",
        text: "You shoulder the weight long enough for everyone to pass.",
        action: { stat: "might", delta: 1 },
      },
    ],
  },
  {
    id: "event-rushing",
    type: "event",
    title: "Something Rushes Past",
    flavor: "A blur darts through the dark, trailing the smell of ozone.",
    description: "Make a Speed roll.",
    stat: "speed",
    successText: "You dodge it.",
    failureText: "It clips you.",
    tiers: [
      {
        range: "0-1",
        text: "It batters you. Lose 2 Speed.",
        action: { stat: "speed", delta: -2 },
      },
      {
        range: "2-3",
        text: "You stumble, shaken.",
        action: { stat: "speed", delta: -1 },
      },
      {
        range: "4+",
        text: "You sidestep and catch your balance.",
        action: { stat: "speed", delta: 1 },
      },
    ],
  },
  {
    id: "event-riddle",
    type: "event",
    title: "Cryptic Inscription",
    flavor: "Symbols crawl across the stone like living things.",
    description: "Make a Knowledge roll.",
    stat: "knowledge",
    successText: "The pattern clicks.",
    failureText: "The symbols swim.",
    tiers: [
      {
        range: "0-1",
        text: "You misread a warning. Lose 1 Knowledge.",
        action: { stat: "knowledge", delta: -1 },
      },
      {
        range: "2-3",
        text: "Fragments make sense, but the rest eludes you.",
        action: { message: "The inscription remains partly unread." },
      },
      {
        range: "4+",
        text: "A hidden latch releases. Gain 1 Knowledge.",
        action: { stat: "knowledge", delta: 1 },
      },
    ],
  },
  {
    id: "event-shadow",
    type: "event",
    title: "Living Shadow",
    flavor: "A shadow peels from the wall, reaching with fingers of smoke.",
    description: "Make a Might roll.",
    stat: "might",
    successText: "You drive it back.",
    failureText: "It batters you.",
    tiers: [
      {
        range: "0-1",
        text: "It slams you into the wainscoting. Lose 1 Might.",
        action: { stat: "might", delta: -1 },
      },
      {
        range: "2-3",
        text: "You fend it off, winded.",
        action: { guard: true },
      },
      {
        range: "4+",
        text: "You drive it back into the plaster.",
        action: { stat: "might", delta: 1 },
      },
    ],
  },
];

export const ITEM_CARDS: Card[] = [
  {
    id: "item-lantern",
    type: "item",
    title: "Brass Lantern",
    description: "A heavy lantern still holds oil. Its warmth steadies the group.",
    successText: "You pocket the lantern. Everyone gains a sliver of courage.",
    failureText: "",
    onSuccess: { stat: "sanity", delta: 1 },
    itemReward: "item-lantern",
  },
  {
    id: "item-crowbar",
    type: "item",
    title: "Iron Crowbar",
    description: "Pried from a sealed crate. Useful—and reassuring.",
    successText: "The crowbar fits your grip. Might comes easier now.",
    failureText: "",
    onSuccess: { stat: "might", delta: 1 },
    itemReward: "item-crowbar",
  },
  {
    id: "item-journal",
    type: "item",
    title: "Scholar's Journal",
    description: "Notes on the house's occult history. Dense, but illuminating.",
    successText: "You skim a crucial passage. Knowledge sharpens.",
    failureText: "",
    onSuccess: { stat: "knowledge", delta: 2 },
    itemReward: "item-journal",
  },
  {
    id: "item-talisman",
    type: "item",
    title: "Warded Talisman",
    description: "A charm etched with protective sigils. It hums when held.",
    successText: "The talisman calms racing thoughts.",
    failureText: "",
    onSuccess: { stat: "sanity", delta: 2 },
    itemReward: "item-talisman",
  },
  {
    id: "item-boots",
    type: "item",
    title: "Swift Boots",
    description: "Soft leather, barely worn. You could move like smoke in these.",
    successText: "The boots fit. Your stride lengthens.",
    failureText: "",
    onSuccess: { stat: "speed", delta: 2 },
    itemReward: "item-boots",
  },
  {
    id: "item-rope",
    type: "item",
    title: "Climbing Rope",
    description: "A coiled rope with iron hooks. Climb back up one-way drops and chutes.",
    successText: "You coil the rope at your belt — ready to climb out of a dead drop.",
    failureText: "",
    itemReward: "item-rope",
  },
];

export const OMEN_CARDS: Card[] = [
  {
    id: "omen-sigil",
    type: "omen",
    title: "Sigil Fragment",
    description: "A carved sigil matches the ritual chamber sketches. The Haunt stirs.",
    successText: "Another piece of the pattern. The house watches.",
    failureText: "",
    omenStatBonus: { stat: "knowledge", delta: 1 },
  },
  {
    id: "omen-blood",
    type: "omen",
    title: "Bloodstained Map",
    description: "A floor plan marked in dried blood. Three rooms connect to a hidden core.",
    successText: "The map confirms your fears. The house is waking up.",
    failureText: "",
    omenStatBonus: { stat: "sanity", delta: -1 },
  },
  {
    id: "omen-diary",
    type: "omen",
    title: "Last Entry",
    description: '"When the third seal breaks, one among you will turn."',
    successText: "The final warning. You feel the walls tighten.",
    failureText: "",
    omenStatBonus: { stat: "sanity", delta: -1 },
  },
  {
    id: "omen-mirror",
    type: "omen",
    title: "Shattered Mirror",
    description: "Reflections show a room that is not there. The veil thins.",
    successText: "The mirror's secret burns behind your eyes.",
    failureText: "",
    omenStatBonus: { stat: "knowledge", delta: 1 },
  },
  {
    id: "omen-portrait",
    type: "omen",
    title: "Weeping Portrait",
    description: "Oil paint runs like tears. Eyes follow your every step.",
    successText: "The portrait's gaze lingers long after you look away.",
    failureText: "",
    omenStatBonus: { stat: "sanity", delta: -1 },
  },
  {
    id: "omen-chalice",
    type: "omen",
    title: "Ceremonial Chalice",
    description: "Dried blood cakes the rim. Something was offered here.",
    successText: "The chalice hums with residual power.",
    failureText: "",
    omenStatBonus: { stat: "might", delta: 1 },
  },
];

export const CARD_BY_ID: Record<string, Card> = Object.fromEntries(
  [...EVENT_CARDS, ...ITEM_CARDS, ...OMEN_CARDS].map((c) => [c.id, c])
);

export function getCardEffect(
  card: Card,
  success: boolean
): Card["onSuccess"] | undefined {
  if (success) return card.onSuccess ?? card.successEffect;
  return card.onFailure ?? card.failureEffect;
}

export function getCardTarget(card: Card): number {
  return card.target ?? card.difficulty ?? 4;
}
