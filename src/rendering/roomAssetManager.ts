import type { Floor } from "@/game/types";

const FLOOR_FALLBACK: Record<
  Floor,
  { base: string; pattern: string; label: string }
> = {
  ground: { base: "#2D1A1E", pattern: "wood", label: "Wood planks" },
  upper: { base: "#13192B", pattern: "marble", label: "Marble" },
  basement: { base: "#1E2E20", pattern: "stone", label: "Cracked stone" },
};

const failedAssets = new Set<string>();
const fallbackCache = new Map<string, string>();

export function getRoomAssetPath(roomId: string, floor: Floor): string {
  return `/assets/rooms/${floor}/${roomId}.webp`;
}

export function markAssetFailed(roomId: string, floor: Floor): void {
  failedAssets.add(`${floor}/${roomId}`);
}

export function shouldUseFallback(roomId: string, floor: Floor): boolean {
  return failedAssets.has(`${floor}/${roomId}`);
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function patternDefs(floor: Floor, seed: number): string {
  const { base, pattern } = FLOOR_FALLBACK[floor];
  if (pattern === "wood") {
    const planks = Array.from({ length: 6 }, (_, i) => {
      const y = 6 + i * 14;
      const shade = 0.85 + ((seed + i * 17) % 20) / 100;
      const r = Math.round(parseInt(base.slice(1, 3), 16) * shade);
      const g = Math.round(parseInt(base.slice(3, 5), 16) * shade);
      const b = Math.round(parseInt(base.slice(5, 7), 16) * shade);
      return `<rect x="4" y="${y}" width="72" height="12" fill="rgb(${r},${g},${b})" rx="1"/>
        <line x1="4" y1="${y + 6}" x2="76" y2="${y + 6}" stroke="rgba(0,0,0,0.15)" stroke-width="0.5"/>`;
    }).join("");
    return `<rect width="80" height="80" fill="${base}"/>${planks}`;
  }
  if (pattern === "marble") {
    const veins = Array.from({ length: 4 }, (_, i) => {
      const x1 = (seed + i * 31) % 80;
      const y1 = (seed + i * 47) % 80;
      return `<path d="M${x1},0 Q${(x1 + 40) % 80},40 ${(x1 + 20) % 80},80" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>`;
    }).join("");
    return `<rect width="80" height="80" fill="${base}"/>${veins}
      <rect width="80" height="80" fill="url(#marbleGrad)"/>`;
  }
  const cracks = Array.from({ length: 5 }, (_, i) => {
    const x1 = (seed + i * 23) % 70 + 5;
    const y1 = (seed + i * 37) % 70 + 5;
    const x2 = x1 + ((seed + i) % 20) - 10;
    const y2 = y1 + ((seed + i * 3) % 20) - 10;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(0,0,0,0.35)" stroke-width="1.5"/>`;
  }).join("");
  return `<rect width="80" height="80" fill="${base}"/>${cracks}`;
}

export function getProceduralFallbackUrl(roomId: string, floor: Floor): string {
  const key = `${floor}/${roomId}`;
  const cached = fallbackCache.get(key);
  if (cached) return cached;

  const seed = hashSeed(key);
  const { base } = FLOOR_FALLBACK[floor];
  const marbleGrad =
    floor === "upper"
      ? `<defs><linearGradient id="marbleGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="rgba(255,255,255,0.04)"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0.08)"/>
        </linearGradient></defs>`
      : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
    ${marbleGrad}
    ${patternDefs(floor, seed)}
    <rect width="80" height="80" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  </svg>`;

  const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  fallbackCache.set(key, url);
  return url;
}

export function getFloorBaseColor(floor: Floor): string {
  return FLOOR_FALLBACK[floor].base;
}

export function getFloorLightingClass(floor: Floor): string {
  switch (floor) {
    case "ground":
      return "tile-lighting-ground";
    case "upper":
      return "tile-lighting-upper";
    case "basement":
      return "tile-lighting-basement";
  }
}
