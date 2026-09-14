export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error"
  | "disconnected";

export type PlayMode = "local" | "multiplayer";

export interface LobbyMember {
  peerId: string;
  characterId: string | null;
  isHost: boolean;
  ready: boolean;
}

export interface LobbyState {
  roomCode: string;
  members: LobbyMember[];
  maxPlayers: number;
  started: boolean;
}

export type GameAction =
  | { kind: "move"; direction: "north" | "south" | "east" | "west" }
  | { kind: "use-floor-transition" }
  | { kind: "resolve-item" }
  | { kind: "roll-stat"; dice: number[] }
  | { kind: "roll-crisis"; dice: number[] }
  | { kind: "dismiss-card" }
  | { kind: "end-turn" }
  | { kind: "rotate-sigil"; index: number }
  | { kind: "set-view-floor"; floor: "ground" | "upper" | "basement" };

export type NetMessage =
  | { type: "lobby-update"; lobby: LobbyState }
  | { type: "game-state"; state: import("@/game/types").GameState }
  | { type: "action"; action: GameAction; fromPeerId: string }
  | { type: "join"; peerId: string }
  | { type: "select-character"; peerId: string; characterId: string | null }
  | { type: "set-ready"; peerId: string; ready: boolean }
  | { type: "start-game" }
  | { type: "error"; message: string }
  | { type: "host-left" };
