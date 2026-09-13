import type { GameState } from "@/game/types";
import type { GameAction, LobbyState, NetMessage } from "./types";
import { generateRoomCode, normalizeRoomCode } from "./roomCode";
import { getClientId } from "./clientId";
import { getSignalWebSocketUrl } from "./signalHost";

type SessionReadyMessage = {
  type: "session-ready";
  isHost: boolean;
  lobby: LobbyState;
};

type ClientMessage =
  | { type: "host-create"; clientId: string; roomCode: string; maxPlayers?: number }
  | { type: "guest-join"; clientId: string }
  | { type: "select-character"; peerId: string; characterId: string | null }
  | { type: "set-ready"; peerId: string; ready: boolean }
  | { type: "start-game" }
  | { type: "publish-game-state"; state: GameState }
  | { type: "action"; action: GameAction; fromPeerId: string };

const CONNECT_TIMEOUT_MS = 15000;

export interface SessionCallbacks {
  onLobbyUpdate: (lobby: LobbyState) => void;
  onGameState: (state: GameState) => void;
  onStatus: (status: import("./types").ConnectionStatus, message?: string) => void;
  onAction: (action: GameAction, fromPeerId: string) => void;
  onStartGameRequest: () => void;
  onHostLeft: () => void;
}

export class MultiplayerSession {
  private socket: WebSocket | null = null;
  private callbacks: SessionCallbacks;
  private lobby: LobbyState | null = null;
  private clientId = getClientId();
  private isHost = false;
  private roomCode: string | null = null;

  constructor(callbacks: SessionCallbacks) {
    this.callbacks = callbacks;
  }

  getLocalPeerId() {
    return this.clientId;
  }

  getIsHost() {
    return this.isHost;
  }

  getLobby() {
    return this.lobby;
  }

  async createRoom(maxPlayers = 4): Promise<string> {
    this.isHost = true;
    this.callbacks.onStatus("connecting");

    for (let attempt = 0; attempt < 8; attempt++) {
      const code = generateRoomCode();
      try {
        await this.openRoom(code, {
          type: "host-create",
          clientId: this.clientId,
          roomCode: code,
          maxPlayers,
        });
        this.roomCode = code;
        this.callbacks.onStatus("connected");
        return code;
      } catch (error) {
        if (error instanceof Error && error.message === "code-taken") {
          continue;
        }
        this.disconnect();
        throw error;
      }
    }

    this.isHost = false;
    this.callbacks.onStatus("error", "Could not create a room. Try again.");
    throw new Error("Failed to create room");
  }

  async joinRoom(code: string): Promise<void> {
    this.isHost = false;
    this.lobby = null;
    this.callbacks.onStatus("connecting");

    const normalized = normalizeRoomCode(code);
    await this.openRoom(normalized, {
      type: "guest-join",
      clientId: this.clientId,
    });
    this.roomCode = normalized;
    this.callbacks.onStatus("connected");
  }

  ensureHostAvailable() {
    if (!this.isHost || !this.roomCode) return;
    if (this.socket?.readyState === WebSocket.OPEN) return;
    if (this.socket?.readyState === WebSocket.CONNECTING) return;

    void this.openRoom(this.roomCode, {
      type: "host-create",
      clientId: this.clientId,
      roomCode: this.roomCode,
      maxPlayers: this.lobby?.maxPlayers ?? 4,
    })
      .then(() => {
        this.callbacks.onStatus("connected");
      })
      .catch(() => {
        this.callbacks.onStatus(
          "error",
          "Room connection lost. Leave and create a new room."
        );
      });
  }

  abortJoin() {
    this.disconnect();
    this.isHost = false;
    this.lobby = null;
    this.roomCode = null;
  }

  selectCharacter(characterId: string | null) {
    this.send({
      type: "select-character",
      peerId: this.clientId,
      characterId,
    });
  }

  setReady(ready: boolean) {
    this.send({
      type: "set-ready",
      peerId: this.clientId,
      ready,
    });
  }

  startGame() {
    if (!this.isHost) return;
    this.send({ type: "start-game" });
  }

  broadcastGameState(state: GameState) {
    if (!this.isHost) return;
    this.send({ type: "publish-game-state", state });
  }

  sendAction(action: GameAction) {
    if (this.isHost) return;
    this.send({
      type: "action",
      action,
      fromPeerId: this.clientId,
    });
  }

  destroy() {
    this.disconnect();
    this.lobby = null;
    this.isHost = false;
    this.roomCode = null;
    this.callbacks.onStatus("idle");
  }

  private async openRoom(code: string, handshake: ClientMessage): Promise<void> {
    this.disconnect();

    const socket = new WebSocket(getSignalWebSocketUrl(code));
    this.socket = socket;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Connection timeout"));
      }, CONNECT_TIMEOUT_MS);

      const onOpen = () => {
        socket.send(JSON.stringify(handshake));
      };

      const onMessage = (event: MessageEvent) => {
        let msg: SessionReadyMessage | NetMessage;
        try {
          msg = JSON.parse(String(event.data)) as SessionReadyMessage | NetMessage;
        } catch {
          return;
        }

        if (msg.type === "session-ready") {
          cleanup();
          this.isHost = msg.isHost;
          this.lobby = msg.lobby;
          this.callbacks.onLobbyUpdate(msg.lobby);
          resolve();
          return;
        }

        if (msg.type === "error") {
          cleanup();
          reject(new Error(msg.message));
        }
      };

      const onError = () => {
        cleanup();
        reject(new Error("Connection failed"));
      };

      const cleanup = () => {
        clearTimeout(timeout);
        socket.removeEventListener("open", onOpen);
        socket.removeEventListener("message", onMessage);
        socket.removeEventListener("error", onError);
      };

      socket.addEventListener("open", onOpen);
      socket.addEventListener("message", onMessage);
      socket.addEventListener("error", onError);
    });

    socket.addEventListener("message", (event) => {
      let msg: SessionReadyMessage | NetMessage;
      try {
        msg = JSON.parse(String(event.data)) as SessionReadyMessage | NetMessage;
      } catch {
        return;
      }
      if (msg.type === "session-ready") return;
      this.handleMessage(msg);
    });

    socket.addEventListener("close", () => {
      if (this.isHost) {
        this.ensureHostAvailable();
        return;
      }
      if (this.lobby?.started) return;
      this.callbacks.onHostLeft();
    });
  }

  private handleMessage(msg: NetMessage) {
    switch (msg.type) {
      case "lobby-update":
        this.lobby = msg.lobby;
        this.callbacks.onLobbyUpdate(msg.lobby);
        break;
      case "game-state":
        if (!this.isHost) this.callbacks.onGameState(msg.state);
        break;
      case "action":
        if (this.isHost) this.callbacks.onAction(msg.action, msg.fromPeerId);
        break;
      case "start-game":
        if (!this.isHost) this.callbacks.onStartGameRequest();
        break;
      case "error":
        this.callbacks.onStatus("error", msg.message);
        break;
      case "host-left":
        this.callbacks.onHostLeft();
        break;
    }
  }

  private send(message: ClientMessage) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(message));
  }

  private disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
