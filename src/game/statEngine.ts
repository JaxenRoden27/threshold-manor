import { getExplorerById } from "./characterData";
import type { ExplorerTemplate } from "./characterData";
import type { GameState, Phase, Player, Stat, StatTrack } from "./types";

export function isPostHaunt(phase: Phase, haunt: GameState["haunt"]): boolean {
  return phase === "HAUNT_ACTIVE" && haunt !== null;
}

export function statValue(track: StatTrack): number {
  return track.values[track.currentIndex];
}

export function playerStat(player: Player, stat: Stat): number {
  return statValue(player.statTracks[stat]);
}

export function modifyStat(
  track: StatTrack,
  delta: number,
  postHaunt: boolean
): StatTrack {
  let nextIndex = track.currentIndex + delta;
  if (!postHaunt && nextIndex < 1) nextIndex = 1;
  nextIndex = Math.max(0, Math.min(7, nextIndex));
  return { ...track, currentIndex: nextIndex };
}

export function isPlayerDefeated(player: Player, postHaunt: boolean): boolean {
  if (!postHaunt) return false;
  const physical =
    player.statTracks.speed.currentIndex === 0 ||
    player.statTracks.might.currentIndex === 0;
  const mental =
    player.statTracks.sanity.currentIndex === 0 ||
    player.statTracks.knowledge.currentIndex === 0;
  return physical || mental;
}

export function applyStatDelta(
  player: Player,
  stat: Stat,
  delta: number,
  postHaunt: boolean
): Player {
  const updatedTrack = modifyStat(player.statTracks[stat], delta, postHaunt);
  const next: Player = {
    ...player,
    statTracks: { ...player.statTracks, [stat]: updatedTrack },
    isAlive: true,
  };
  next.isAlive = !isPlayerDefeated(next, postHaunt);
  return next;
}

export function createPlayerFromExplorer(
  explorer: ExplorerTemplate,
  slot: { id: string; index: number }
): Player {
  const cloneTrack = (t: StatTrack): StatTrack => ({
    values: t.values,
    startIndex: t.startIndex,
    currentIndex: t.startIndex,
  });
  const speed = cloneTrack(explorer.speed);
  return {
    id: slot.id,
    templateId: explorer.id,
    name: explorer.name,
    age: explorer.age,
    color: explorer.color,
    statTracks: {
      speed,
      might: cloneTrack(explorer.might),
      sanity: cloneTrack(explorer.sanity),
      knowledge: cloneTrack(explorer.knowledge),
    },
    inventory: [],
    ap: statValue(speed),
    floor: "ground",
    x: 0,
    y: 0,
    isTraitor: false,
    isAlive: true,
    guardNextCombat: false,
    visitedBuffRooms: [],
  };
}

export function createPlayerFromTemplateId(
  templateId: string,
  slot: { id: string; index: number }
): Player | null {
  const explorer = getExplorerById(templateId);
  if (!explorer) return null;
  return createPlayerFromExplorer(explorer, slot);
}

export function nextLivingPlayerIndex(players: Player[], from: number): number {
  if (players.length === 0) return 0;
  for (let i = 1; i <= players.length; i++) {
    const idx = (from + i) % players.length;
    if (players[idx].isAlive) return idx;
  }
  return from;
}

export function livingPlayerCount(players: Player[]): number {
  return players.filter((p) => p.isAlive).length;
}
