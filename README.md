# Threshold Manor

A cooperative 2D tile-based survival puzzle game for 2–4 players in the browser. Explore a haunted manor room by room, resolve Event/Item/Clue cards, and survive the Crisis by aligning ritual sigils together.

Inspired by *Betrayal at the House on the Hill*, adapted into a fully cooperative experience.

## Play online

**https://jaxenroden27.github.io/threshold-manor/**

Repo: **https://github.com/JaxenRoden27/threshold-manor**

(GitHub Pages deploys automatically from `main` via `.github/workflows/deploy-pages.yml`.)

## Stack

- Next.js (static export) + TypeScript
- Tailwind CSS + shadcn/ui
- Zustand for game state
- Cloudflare Worker WebSocket signaling (rooms stay registered when the host backgrounds their browser)

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:4317](http://localhost:4317).

### Local multiplayer signaling

Run the Node signal server and point the client at it:

```bash
cd signal-server && npm install && npm start
```

```bash
NEXT_PUBLIC_SIGNAL_HOST=localhost:8787 npm run dev
```

## Multiplayer room codes

1. **Host** — Click **Create Room** on the setup screen. You receive a **4-letter code** (e.g. `XK7M`).
2. **Share** — Send friends the play link and room code. They open the same URL on their own device.
3. **Join** — Guests tap **Join Room**, enter the code, and pick an investigator.
4. **Ready up** — Each player selects a unique character and taps **Ready**.
5. **Start** — The host taps **Start Game** when everyone is ready (2–4 players).

Gameplay syncs over a WebSocket room server. The **host** owns game state; all clients see the same mansion, turns, cards, dice rolls, and Crisis puzzle. Only the **active player** can move, roll dice, or act on their turn.

The host can briefly switch apps to copy the room code — the room stays registered on the signal server.

## Local play

Choose **Local Play** for hot-seat mode on one screen — no room code needed.

## How to play

1. **Exploration** — Start in the Front Entrance. Use the direction pad to move (1 AP per doorway).
2. **Cards** — New rooms draw Event, Item, or Clue cards. Roll dice for stat checks and threat rolls.
3. **Crisis** — Triggered when the threat die falls below the Clue count, or at 3 Clues. Align sigils cooperatively.
4. **Win** — Align all sigils before moves run out. **Lose** — Run out of Crisis moves or get overwhelmed.

## Deploy to GitHub Pages

Static export — no API routes. The workflow in `.github/workflows/deploy-pages.yml` deploys the Cloudflare Worker signal server, builds with `NEXT_PUBLIC_BASE_PATH=/threshold-manor`, and publishes the `out/` folder.

### Production signal server (Render)

Multiplayer requires a small WebSocket server. Deploy it once on Render (free tier):

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/JaxenRoden27/threshold-manor)

After deploy, set the repository variable `SIGNAL_HOST` to `threshold-manor-signal.onrender.com` (Settings → Secrets and variables → Actions → Variables), then re-run the **Deploy to GitHub Pages** workflow.

A `render.yaml` blueprint is included at the repo root.

```bash
# One-time publish (requires GH_TOKEN or gh auth login)
./scripts/publish-github.sh
```

## Game modules

- `src/game/tileData.ts` — Tile pools and procedural room generation
- `src/game/cardData.ts` — Event, Item, and Clue card definitions
- `src/game/gameEngine.ts` — Core loop, movement, stat checks, crisis triggers
- `src/game/puzzleEngine.ts` — Cooperative sigil alignment puzzle
- `src/game/diceEngine.ts` — Dice roll logic
- `src/multiplayer/` — WebSocket session, room codes, sync protocol
- `worker/` — Cloudflare Durable Object signal server (production)
- `signal-server/` — Node WebSocket signal server (local dev / Render)
