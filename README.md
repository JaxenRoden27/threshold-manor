# Threshold Manor

A cooperative 2D tile-based survival puzzle game for 2–4 players in the browser. Explore a haunted manor room by room, resolve Event/Item/Clue cards, and survive the Crisis by aligning ritual sigils together.

Inspired by *Betrayal at the House on the Hill*, adapted into a fully cooperative experience.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Zustand for game state

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:4317](http://localhost:4317).

## How to play (MVP)

1. **Setup** — Choose party size (2–4) and select investigators. Each character has unique Might, Speed, Sanity, and Knowledge stats.
2. **Exploration** — You start in the Front Entrance. Use direction buttons (N/S/E/W) on the map to move through doorways. Movement costs 1 Action Point (AP). AP refreshes each turn based on your Speed.
3. **New rooms** — Stepping through an unexplored doorway generates a random tile from Ground, Upper, or Basement pools and draws an Event, Item, or Clue card.
4. **Cards** — Events test a stat (d6 + stat vs difficulty). Items grant gear and stat boosts. Clues raise Threat Level and trigger a threat die roll; if the roll is below the Clue count—or you uncover 3 Clues—the Crisis begins.
5. **Crisis** — Cooperatively rotate sigils to match the target pattern. Each rotation costs 1 AP. Align all sigils before running out of moves to win.

## Game modules

- `src/game/tileData.ts` — Tile pools and procedural room generation
- `src/game/cardData.ts` — Event, Item, and Clue card definitions
- `src/game/gameEngine.ts` — Core loop, movement, stat checks, crisis triggers
- `src/game/puzzleEngine.ts` — Cooperative sigil alignment puzzle

## Build

```bash
npm run build
npm start
```
