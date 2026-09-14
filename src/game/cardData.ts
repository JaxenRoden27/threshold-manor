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
};

export const EVENT_CARDS: Card[] = [
  {
    id: "event-whispers",
    type: "event",
    title: "Whispers in the Walls",
    description: "Cold voices coil around you. Test Sanity to keep your nerve.",
    stat: "sanity",
    target: 4,
    difficulty: 4,
    successText: "You steady your breath. The whispers fade.",
    failureText: "The voices claw inward. Your mind frays.",
    onSuccess: { stat: "sanity", delta: 1 },
    onFailure: { stat: "sanity", delta: -2 },
  },
  {
    id: "event-collapsing",
    type: "event",
    title: "Collapsing Beam",
    description: "Timber groans overhead. Test Might to hold the frame.",
    stat: "might",
    target: 5,
    difficulty: 5,
    successText: "You brace the beam long enough for everyone to pass.",
    failureText: "Splinters rake your arms as the beam slams down.",
    onSuccess: { stat: "might", delta: 1 },
    onFailure: { stat: "might", delta: -2 },
  },
  {
    id: "event-rushing",
    type: "event",
    title: "Something Rushes Past",
    description: "A blur darts through the dark. Test Speed to dodge it.",
    stat: "speed",
    target: 4,
    difficulty: 4,
    successText: "You sidestep the rush and catch your balance.",
    failureText: "It clips you hard. You stumble, shaken.",
    onSuccess: { stat: "speed", delta: 1 },
    onFailure: { stat: "speed", delta: -2 },
  },
  {
    id: "event-riddle",
    type: "event",
    title: "Cryptic Inscription",
    description: "Symbols crawl across the stone. Test Knowledge to decipher them.",
    stat: "knowledge",
    target: 5,
    difficulty: 5,
    successText: "The pattern clicks. A hidden latch releases.",
    failureText: "The symbols swim. You misread a warning.",
    onSuccess: { stat: "knowledge", delta: 1 },
    onFailure: { stat: "knowledge", delta: -1 },
  },
  {
    id: "event-shadow",
    type: "event",
    title: "Living Shadow",
    description: "A shadow peels from the wall. Test Might or lose ground.",
    stat: "might",
    target: 4,
    difficulty: 4,
    successText: "You drive it back into the plaster.",
    failureText: "It batters you against the wainscoting.",
    onFailure: { stat: "might", delta: -1 },
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
