import type { Card, CardType } from "./types";

export const EVENT_CARDS: Card[] = [
  {
    id: "event-whispers",
    type: "event",
    title: "Whispers in the Walls",
    description: "Cold voices coil around you. Test Sanity to keep your nerve.",
    stat: "sanity",
    difficulty: 4,
    successText: "You steady your breath. The whispers fade.",
    failureText: "The voices claw inward. Your mind frays.",
    successEffect: { stat: "sanity", delta: 1 },
    failureEffect: { stat: "sanity", delta: -2 },
  },
  {
    id: "event-collapsing",
    type: "event",
    title: "Collapsing Beam",
    description: "Timber groans overhead. Test Might to hold the frame.",
    stat: "might",
    difficulty: 5,
    successText: "You brace the beam long enough for everyone to pass.",
    failureText: "Splinters rake your arms as the beam slams down.",
    failureEffect: { stat: "might", delta: -2 },
    successEffect: { stat: "might", delta: 1 },
  },
  {
    id: "event-rushing",
    type: "event",
    title: "Something Rushes Past",
    description: "A blur darts through the dark. Test Speed to dodge it.",
    stat: "speed",
    difficulty: 4,
    successText: "You sidestep the rush and catch your balance.",
    failureText: "It clips you hard. You stumble, shaken.",
    failureEffect: { stat: "speed", delta: -2 },
    successEffect: { stat: "speed", delta: 1 },
  },
  {
    id: "event-riddle",
    type: "event",
    title: "Cryptic Inscription",
    description: "Symbols crawl across the stone. Test Knowledge to decipher them.",
    stat: "knowledge",
    difficulty: 5,
    successText: "The pattern clicks. A hidden latch releases.",
    failureText: "The symbols swim. You misread a warning.",
    successEffect: { stat: "knowledge", delta: 1 },
    failureEffect: { stat: "knowledge", delta: -1 },
  },
  {
    id: "event-shadow",
    type: "event",
    title: "Living Shadow",
    description: "A shadow peels from the wall. Test Might or lose ground.",
    stat: "might",
    difficulty: 4,
    successText: "You drive it back into the plaster.",
    failureText: "It batters you against the wainscoting.",
    failureEffect: { stat: "might", delta: -1 },
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
    successEffect: { stat: "sanity", delta: 1 },
    itemReward: "Brass Lantern",
  },
  {
    id: "item-crowbar",
    type: "item",
    title: "Iron Crowbar",
    description: "Pried from a sealed crate. Useful—and reassuring.",
    successText: "The crowbar fits your grip. Might comes easier now.",
    failureText: "",
    successEffect: { stat: "might", delta: 1 },
    itemReward: "Iron Crowbar",
  },
  {
    id: "item-journal",
    type: "item",
    title: "Scholar's Journal",
    description: "Notes on the house's occult history. Dense, but illuminating.",
    successText: "You skim a crucial passage. Knowledge sharpens.",
    failureText: "",
    successEffect: { stat: "knowledge", delta: 2 },
    itemReward: "Scholar's Journal",
  },
  {
    id: "item-talisman",
    type: "item",
    title: "Warded Talisman",
    description: "A charm etched with protective sigils. It hums when held.",
    successText: "The talisman calms racing thoughts.",
    failureText: "",
    successEffect: { stat: "sanity", delta: 2 },
    itemReward: "Warded Talisman",
  },
  {
    id: "item-boots",
    type: "item",
    title: "Swift Boots",
    description: "Soft leather, barely worn. You could move like smoke in these.",
    successText: "The boots fit. Your stride lengthens.",
    failureText: "",
    successEffect: { stat: "speed", delta: 2 },
    itemReward: "Swift Boots",
  },
];

export const CLUE_CARDS: Card[] = [
  {
    id: "clue-sigil",
    type: "clue",
    title: "Sigil Fragment",
    description: "A carved sigil matches the ritual chamber sketches. The Crisis stirs.",
    successText: "Another piece of the pattern. Threat Level rises.",
    failureText: "",
  },
  {
    id: "clue-blood",
    type: "clue",
    title: "Bloodstained Map",
    description: "A floor plan marked in dried blood. Three rooms connect to a hidden core.",
    successText: "The map confirms your fears. The house is waking up.",
    failureText: "",
  },
  {
    id: "clue-diary",
    type: "clue",
    title: "Last Entry",
    description: '"When the third seal breaks, redirect the ley lines—or we are lost."',
    successText: "The final warning. You feel the walls tighten.",
    failureText: "",
  },
  {
    id: "clue-mirror",
    type: "clue",
    title: "Shattered Mirror",
    description: "Reflections show a room that is not there. The veil thins.",
    successText: "The mirror's secret burns behind your eyes.",
    failureText: "",
  },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function drawCardType(): CardType {
  const roll = Math.random();
  if (roll < 0.45) return "event";
  if (roll < 0.75) return "item";
  return "clue";
}

export function drawCard(type: CardType): Card {
  switch (type) {
    case "event":
      return { ...pickRandom(EVENT_CARDS) };
    case "item":
      return { ...pickRandom(ITEM_CARDS) };
    case "clue":
      return { ...pickRandom(CLUE_CARDS) };
  }
}
