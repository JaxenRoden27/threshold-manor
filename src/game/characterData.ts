import type { ExplorerColor, StatTrack } from "./types";

export interface ExplorerTemplate {
  id: string;
  name: string;
  nickname?: string;
  age: number;
  color: ExplorerColor;
  /** Other explorer on the same color miniature — picking one locks both. */
  pairId: string;
  speed: StatTrack;
  might: StatTrack;
  sanity: StatTrack;
  knowledge: StatTrack;
}

function track(
  values: [number, number, number, number, number, number, number, number],
  startIndex: number
): StatTrack {
  return { values, startIndex, currentIndex: startIndex };
}

/** User-specified tracks for the six primary explorers. */
const DARRIN: ExplorerTemplate = {
  id: "darrin-williams",
  name: 'Darrin "Flash" Williams',
  age: 20,
  color: "red",
  pairId: "jenny-leclerc",
  speed: track([0, 4, 4, 4, 5, 6, 7, 7], 3),
  might: track([0, 2, 3, 3, 4, 5, 6, 7], 2),
  sanity: track([0, 1, 2, 3, 4, 5, 5, 7], 2),
  knowledge: track([0, 2, 3, 3, 4, 5, 5, 5], 2),
};

const LONGFELLOW: ExplorerTemplate = {
  id: "professor-longfellow",
  name: "Professor Longfellow",
  age: 57,
  color: "green",
  pairId: "vivian-lopez",
  speed: track([0, 2, 2, 4, 4, 5, 5, 6], 2),
  might: track([0, 1, 2, 3, 4, 5, 5, 6], 2),
  sanity: track([0, 1, 3, 3, 4, 5, 5, 7], 2),
  knowledge: track([0, 4, 5, 5, 5, 5, 6, 8], 4),
};

const ZOE: ExplorerTemplate = {
  id: "zoe-ingstrom",
  name: "Zoe Ingstrom",
  age: 8,
  color: "yellow",
  pairId: "missy-dubourde",
  speed: track([0, 4, 4, 4, 4, 5, 6, 8], 3),
  might: track([0, 2, 2, 3, 3, 4, 4, 5], 3),
  sanity: track([0, 3, 4, 5, 5, 6, 6, 7], 3),
  knowledge: track([0, 2, 2, 3, 4, 4, 5, 5], 2),
};

const PETER: ExplorerTemplate = {
  id: "peter-akimoto",
  name: "Peter Akimoto",
  age: 13,
  color: "blue",
  pairId: "brandon-jaspers",
  speed: track([0, 2, 3, 4, 4, 5, 6, 7], 3),
  might: track([0, 2, 3, 3, 4, 5, 5, 6], 2),
  sanity: track([0, 3, 4, 4, 4, 5, 6, 7], 3),
  knowledge: track([0, 3, 4, 4, 5, 6, 7, 8], 2),
};

const HEATHER: ExplorerTemplate = {
  id: "heather-granville",
  name: "Heather Granville",
  age: 18,
  color: "purple",
  pairId: "ox-bellows",
  speed: track([0, 3, 3, 4, 5, 6, 6, 7], 2),
  might: track([0, 3, 3, 3, 4, 5, 6, 7], 2),
  sanity: track([0, 3, 3, 3, 4, 5, 6, 8], 2),
  knowledge: track([0, 2, 3, 3, 4, 5, 6, 7], 4),
};

const MADAME_ZOSTRA: ExplorerTemplate = {
  id: "madame-zostra",
  name: "Madame Zostra",
  age: 37,
  color: "white",
  pairId: "father-rhinehardt",
  speed: track([0, 2, 3, 3, 5, 5, 6, 6], 2),
  might: track([0, 2, 3, 3, 4, 5, 5, 6], 3),
  sanity: track([0, 4, 4, 4, 5, 6, 7, 8], 2),
  knowledge: track([0, 1, 3, 4, 4, 4, 5, 5], 3),
};

/** Official Betrayal color-pair counterparts (8-stage tracks from published data). */
const JENNY: ExplorerTemplate = {
  id: "jenny-leclerc",
  name: "Jenny LeClerc",
  age: 21,
  color: "red",
  pairId: "darrin-williams",
  speed: track([0, 2, 3, 4, 4, 4, 5, 6], 4),
  might: track([0, 3, 4, 4, 4, 4, 5, 6], 3),
  sanity: track([0, 1, 1, 2, 4, 4, 4, 5], 5),
  knowledge: track([0, 2, 3, 3, 4, 4, 5, 6], 3),
};

const VIVIAN: ExplorerTemplate = {
  id: "vivian-lopez",
  name: "Vivian Lopez",
  age: 42,
  color: "green",
  pairId: "professor-longfellow",
  speed: track([0, 3, 4, 4, 4, 4, 6, 7], 4),
  might: track([0, 2, 2, 2, 4, 4, 5, 6], 3),
  sanity: track([0, 4, 4, 4, 5, 6, 7, 8], 3),
  knowledge: track([0, 4, 5, 5, 5, 5, 6, 6], 4),
};

const MISSY: ExplorerTemplate = {
  id: "missy-dubourde",
  name: "Missy Dubourde",
  age: 9,
  color: "yellow",
  pairId: "zoe-ingstrom",
  speed: track([0, 3, 3, 5, 6, 6, 6, 7], 3),
  might: track([0, 2, 3, 3, 3, 4, 5, 6], 4),
  sanity: track([0, 1, 2, 3, 4, 5, 5, 6], 3),
  knowledge: track([0, 2, 3, 4, 4, 5, 6, 6], 4),
};

const BRANDON: ExplorerTemplate = {
  id: "brandon-jaspers",
  name: "Brandon Jaspers",
  age: 12,
  color: "blue",
  pairId: "peter-akimoto",
  speed: track([0, 3, 4, 4, 4, 5, 6, 7], 3),
  might: track([0, 2, 3, 3, 4, 5, 6, 6], 4),
  sanity: track([0, 3, 3, 3, 4, 5, 6, 7], 4),
  knowledge: track([0, 1, 3, 3, 5, 5, 6, 6], 3),
};

const OX: ExplorerTemplate = {
  id: "ox-bellows",
  name: "Ox Bellows",
  age: 23,
  color: "purple",
  pairId: "heather-granville",
  speed: track([0, 2, 2, 2, 3, 4, 5, 5], 5),
  might: track([0, 4, 5, 5, 6, 6, 7, 8], 3),
  sanity: track([0, 2, 2, 3, 4, 5, 5, 6], 3),
  knowledge: track([0, 2, 2, 3, 3, 5, 5, 6], 3),
};

const FATHER_RHINEHARDT: ExplorerTemplate = {
  id: "father-rhinehardt",
  name: "Father Rhinehardt",
  age: 62,
  color: "white",
  pairId: "madame-zostra",
  speed: track([0, 2, 3, 3, 4, 5, 6, 7], 3),
  might: track([0, 1, 2, 2, 4, 4, 5, 5], 3),
  sanity: track([0, 3, 4, 5, 5, 6, 7, 7], 5),
  knowledge: track([0, 1, 3, 3, 4, 5, 6, 6], 4),
};

export const EXPLORER_TEMPLATES: ExplorerTemplate[] = [
  DARRIN,
  JENNY,
  LONGFELLOW,
  VIVIAN,
  ZOE,
  MISSY,
  PETER,
  BRANDON,
  HEATHER,
  OX,
  MADAME_ZOSTRA,
  FATHER_RHINEHARDT,
];

export const EXPLORER_BY_ID: Record<string, ExplorerTemplate> = Object.fromEntries(
  EXPLORER_TEMPLATES.map((e) => [e.id, e])
);

export const COLOR_PAIR_LABELS: Record<ExplorerColor, string> = {
  red: "Red",
  green: "Green",
  yellow: "Yellow",
  blue: "Blue",
  purple: "Purple",
  white: "White",
};

export const COLOR_STYLES: Record<
  ExplorerColor,
  { ring: string; badge: string; dot: string }
> = {
  red: { ring: "ring-red-500", badge: "bg-red-900/50 text-red-200", dot: "bg-red-500" },
  green: { ring: "ring-green-500", badge: "bg-green-900/50 text-green-200", dot: "bg-green-500" },
  yellow: { ring: "ring-yellow-500", badge: "bg-yellow-900/50 text-yellow-200", dot: "bg-yellow-500" },
  blue: { ring: "ring-blue-500", badge: "bg-blue-900/50 text-blue-200", dot: "bg-blue-500" },
  purple: { ring: "ring-purple-500", badge: "bg-purple-900/50 text-purple-200", dot: "bg-purple-500" },
  white: { ring: "ring-stone-300", badge: "bg-stone-200/20 text-stone-100", dot: "bg-stone-200" },
};

export function getExplorerById(id: string): ExplorerTemplate | undefined {
  return EXPLORER_BY_ID[id];
}

/** Both explorer ids locked when either color-pair character is taken. */
export function getLockedExplorerIds(explorerId: string): string[] {
  const explorer = EXPLORER_BY_ID[explorerId];
  if (!explorer) return [explorerId];
  return [explorer.id, explorer.pairId];
}

export function isExplorerTaken(
  explorerId: string,
  takenIds: Set<string | null>
): boolean {
  return getLockedExplorerIds(explorerId).some((id) => takenIds.has(id));
}

/** Sort explorer ids youngest-first for turn order. */
export function sortExplorerIdsByAge(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const ageA = EXPLORER_BY_ID[a]?.age ?? 99;
    const ageB = EXPLORER_BY_ID[b]?.age ?? 99;
    return ageA - ageB;
  });
}

export function explorersByColor(): Record<ExplorerColor, ExplorerTemplate[]> {
  const grouped: Record<ExplorerColor, ExplorerTemplate[]> = {
    red: [],
    green: [],
    yellow: [],
    blue: [],
    purple: [],
    white: [],
  };
  for (const e of EXPLORER_TEMPLATES) {
    grouped[e.color].push(e);
  }
  return grouped;
}
