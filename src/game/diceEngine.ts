const BETRAYAL_FACES = [0, 0, 1, 1, 2, 2] as const;

export function rollBetrayalDie(): number {
  const index = Math.floor(Math.random() * BETRAYAL_FACES.length);
  return BETRAYAL_FACES[index];
}

export function rollBetrayalDice(count: number): { dice: number[]; total: number } {
  const dice = Array.from({ length: Math.max(0, count) }, () => rollBetrayalDie());
  const total = dice.reduce((sum, face) => sum + face, 0);
  return { dice, total };
}

/** @deprecated Use rollBetrayalDice */
export function rollDie(): number {
  return rollBetrayalDie();
}

/** @deprecated Use rollBetrayalDice */
export function rollDice(count: number): number[] {
  return rollBetrayalDice(count).dice;
}

export function checkStatSuccess(total: number, difficulty: number): boolean {
  return total >= difficulty;
}

export function checkHauntTrigger(hauntRollTotal: number, omensDrawn: number): boolean {
  return hauntRollTotal < omensDrawn;
}

/** @deprecated Use checkHauntTrigger */
export function checkCrisisTrigger(crisisRollTotal: number, cluesDiscovered: number): boolean {
  return checkHauntTrigger(crisisRollTotal, cluesDiscovered);
}

export function betrayalFaceLabel(value: number): string {
  return String(value);
}

/** @deprecated Use betrayalFaceLabel */
export function dieFaceLabel(value: number): string {
  return betrayalFaceLabel(value);
}
