export function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function rollDice(count: number): number[] {
  return Array.from({ length: count }, () => rollDie());
}

export function computeStatTotal(dieFace: number, modifier: number): number {
  return dieFace + modifier;
}

export function checkStatSuccess(
  dieFace: number,
  modifier: number,
  difficulty: number
): boolean {
  return computeStatTotal(dieFace, modifier) >= difficulty;
}

export function checkThreatCrisis(dieFace: number, clueCount: number): boolean {
  return dieFace < clueCount;
}

export function dieFaceLabel(value: number): string {
  const faces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  return faces[value - 1] ?? String(value);
}
