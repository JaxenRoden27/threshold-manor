# Threshold Manor

A cooperative 2D tile-based survival puzzle game for 2–4 players in the browser. Explore a haunted manor room by room, resolve Event/Item/Clue cards, and survive the Crisis by aligning ritual sigils together.

Inspired by *Betrayal at the House on the Hill*, adapted into a fully cooperative experience.

## Play online

**https://jaxen-roden.github.io/threshold-manor/**

(After GitHub Pages is enabled on the `threshold-manor` repo.)

## Stack

- Next.js (static export) + TypeScript
- Tailwind CSS + shadcn/ui
- Zustand for game state
- PeerJS (WebRTC) for free peer-to-peer multiplayer — no game server required

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:4317](http://localhost:4317).

## Multiplayer room codes

1. **Host** — Click **Create Room** on the setup screen. You receive a **4-letter code** (e.g. `XK7M`).
2. **Share** — Send friends the play link and room code. They open the same URL on their own device.
3. **Join** — Guests tap **Join Room**, enter the code, and pick an investigator.
4. **Ready up** — Each player selects a unique character and taps **Ready**.
5. **Start** — The host taps **Start Game** when everyone is ready (2–4 players).

Gameplay syncs over WebRTC via PeerJS (free cloud signaling). The **host** owns game state; all clients see the same mansion, turns, cards, dice rolls, and Crisis puzzle. Only the **active player** can move, roll dice, or act on their turn.

## Local play

Choose **Local Play** for hot-seat mode on one screen — no room code needed.

## How to play

1. **Exploration** — Start in the Front Entrance. Use the direction pad to move (1 AP per doorway).
2. **Cards** — New rooms draw Event, Item, or Clue cards. Roll dice for stat checks and threat rolls.
3. **Crisis** — Triggered when the threat die falls below the Clue count, or at 3 Clues. Align sigils cooperatively.
4. **Win** — Align all sigils before moves run out. **Lose** — Run out of Crisis moves or get overwhelmed.

## Deploy to GitHub Pages

Static export — no API routes. The workflow in `.github/workflows/deploy-pages.yml` builds with `NEXT_PUBLIC_BASE_PATH=/threshold-manor` and deploys the `out/` folder.

```bash
npm run build
# output in out/
```

## Game modules

- `src/game/tileData.ts` — Tile pools and procedural room generation
- `src/game/cardData.ts` — Event, Item, and Clue card definitions
- `src/game/gameEngine.ts` — Core loop, movement, stat checks, crisis triggers
- `src/game/puzzleEngine.ts` — Cooperative sigil alignment puzzle
- `src/game/diceEngine.ts` — Dice roll logic
- `src/multiplayer/` — PeerJS session, room codes, sync protocol
