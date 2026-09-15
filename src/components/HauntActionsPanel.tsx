"use client";

import { getHauntScenario } from "@/game/hauntMatrix";
import { playerStat } from "@/game/statEngine";
import { useGameStore } from "@/store/gameStore";
import { useGameActions } from "@/hooks/useGameActions";
import { useMultiplayerStore } from "@/store/multiplayerStore";
import { Button } from "@/components/ui/button";

export function HauntActionsPanel() {
  const { phase, haunt, players, activePlayerIndex, tiles } = useGameStore();
  const { performHauntAction, initiateCombat, canAct } = useGameActions();
  const { mode, localPeerId } = useMultiplayerStore();

  if (phase !== "HAUNT_ACTIVE" || !haunt?.briefingDismissed) return null;

  const scenario = getHauntScenario(haunt.scenarioId);
  const active = players[activePlayerIndex];
  const currentTile = tiles.find(
    (t) =>
      t.floor === active?.floor && t.x === active?.x && t.y === active?.y
  );

  const localPlayer = players.find((p) => p.id === localPeerId);
  const viewingAsTraitor =
    mode === "multiplayer"
      ? localPlayer?.isTraitor ?? false
      : active?.isTraitor ?? false;

  const availableActions = scenario.hauntActions.filter((action) => {
    if (action.roomTemplateId !== currentTile?.templateId) return false;
    if (action.survivorOnly && viewingAsTraitor) return false;
    if (action.traitorOnly && !viewingAsTraitor) return false;
    if (haunt.completedActionIds.includes(action.id)) return false;
    if (!active || playerStat(active, action.stat) < action.minStat) return false;
    if (active.ap < action.apCost) return false;
    return true;
  });

  const otherPlayers = players.filter(
    (p) => p.id !== active?.id && p.floor === active?.floor && p.x === active?.x && p.y === active?.y
  );

  const canFightMonster =
    scenario.monster &&
    haunt.monsterHp !== undefined &&
    haunt.monsterHp > 0 &&
    active &&
    active.ap > 0 &&
    canAct();

  if (
    availableActions.length === 0 &&
    otherPlayers.length === 0 &&
    !canFightMonster
  ) {
    return null;
  }

  return (
    <div className="rounded-lg border border-rose-800/50 bg-rose-950/20 p-3 space-y-2">
      <p className="text-center text-xs font-medium text-rose-200">
        Haunt Actions · {currentTile?.name}
      </p>

      {availableActions.map((action) => (
        <Button
          key={action.id}
          variant="outline"
          className="w-full border-rose-700 text-rose-100"
          disabled={!canAct()}
          onClick={() => performHauntAction(action.id)}
        >
          {action.label} ({action.stat} {action.minStat}+, {action.apCost} AP)
        </Button>
      ))}

      {otherPlayers.map((target) => (
        <div key={target.id} className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-amber-700 text-amber-100"
            disabled={!canAct() || !active || active.ap <= 0}
            onClick={() => initiateCombat(target.id, "player", false)}
          >
            Attack {target.name} (physical)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-violet-700 text-violet-100"
            disabled={!canAct() || !active || active.ap <= 0}
            onClick={() => initiateCombat(target.id, "player", true)}
          >
            Attack {target.name} (mental)
          </Button>
        </div>
      ))}

      {canFightMonster && scenario.monster && (
        <Button
          variant="outline"
          className="w-full border-rose-600 text-rose-100"
          disabled={!canAct()}
          onClick={() => initiateCombat(scenario.monster!.id, "monster", false)}
        >
          Fight {scenario.monster.name} (HP {haunt.monsterHp})
        </Button>
      )}
    </div>
  );
}
