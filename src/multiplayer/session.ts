import type { DataConnection, Peer, PeerError } from "peerjs";
import type { GameState } from "@/game/types";
import type { GameAction, LobbyState, NetMessage } from "./types";
import { generateRoomCode, peerIdForRoom } from "./roomCode";

type PeerConstructor = typeof import("peerjs").default;

const PEER_OPTIONS = {
  host: "0.peerjs.com",
  port: 443,
  path: "/",
  secure: true,
  key: "peerjs",
  debug: 0,
  config: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: ["turn:eu-0.turn.peerjs.com:3478", "turn:us-0.turn.peerjs.com:3478"],
        username: "peerjs",
        credential: "peerjsp",
      },
    ],
  },
};

const JOIN_ATTEMPTS = 5;
const JOIN_ATTEMPT_DELAY_MS = 2500;
const JOIN_TIMEOUT_MS = 12000;
const LOBBY_SYNC_TIMEOUT_MS = 10000;
const HOST_KEEPALIVE_MS = 4000;

let PeerClass: PeerConstructor | null = null;

async function getPeerClass(): Promise<PeerConstructor> {
  if (!PeerClass) {
    const mod = await import("peerjs");
    PeerClass = mod.default;
  }
  return PeerClass;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface SessionCallbacks {
  onLobbyUpdate: (lobby: LobbyState) => void;
  onGameState: (state: GameState) => void;
  onStatus: (status: import("./types").ConnectionStatus, message?: string) => void;
  onAction: (action: GameAction, fromPeerId: string) => void;
  onStartGameRequest: () => void;
  onHostLeft: () => void;
}

export class MultiplayerSession {
  private peer: Peer | null = null;
  private connections = new Map<string, DataConnection>();
  private callbacks: SessionCallbacks;
  private lobby: LobbyState | null = null;
  private localPeerId = "";
  private isHost = false;
  private joinLobbyResolve: ((lobby: LobbyState) => void) | null = null;
  private joinLobbyReject: ((error: Error) => void) | null = null;
  private hostKeepaliveTimer: ReturnType<typeof setInterval> | null = null;
  private hostReregistering = false;

  constructor(callbacks: SessionCallbacks) {
    this.callbacks = callbacks;
  }

  getLocalPeerId() {
    return this.localPeerId;
  }

  getIsHost() {
    return this.isHost;
  }

  getLobby() {
    return this.lobby;
  }

  async createRoom(maxPlayers = 4): Promise<string> {
    await getPeerClass();
    this.isHost = true;
    this.callbacks.onStatus("connecting");

    for (let attempt = 0; attempt < 8; attempt++) {
      const code = generateRoomCode();
      const id = peerIdForRoom(code);
      try {
        await this.initPeer(id);
        this.lobby = {
          roomCode: code,
          members: [
            {
              peerId: this.localPeerId,
              characterId: null,
              isHost: true,
              ready: false,
            },
          ],
          maxPlayers,
          started: false,
        };
        this.startHostKeepalive();
        this.broadcastLobby();
        this.callbacks.onStatus("connected");
        return code;
      } catch {
        this.teardownPeer();
      }
    }

    this.isHost = false;
    this.callbacks.onStatus("error", "Could not create a room. Try again.");
    throw new Error("Failed to create room");
  }

  async joinRoom(code: string): Promise<void> {
    await getPeerClass();
    this.isHost = false;
    this.lobby = null;
    this.stopHostKeepalive();
    this.callbacks.onStatus("connecting");

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < JOIN_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        this.callbacks.onStatus(
          "connecting",
          `Looking for room… (attempt ${attempt + 1}/${JOIN_ATTEMPTS})`
        );
        await delay(JOIN_ATTEMPT_DELAY_MS);
      }

      try {
        await this.attemptJoin(code);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Join failed");
        this.teardownPeer();
      }
    }

    this.callbacks.onStatus(
      "error",
      "Could not find that room. Ask the host to keep the game open and try again."
    );
    throw lastError ?? new Error("Join failed");
  }

  ensureHostAvailable() {
    if (this.isHost && this.lobby && !this.lobby.started) {
      void this.ensureHostRegistered();
    }
  }

  abortJoin() {
    this.joinLobbyResolve = null;
    this.joinLobbyReject = null;
    this.teardownPeer();
    this.isHost = false;
    this.lobby = null;
  }

  selectCharacter(characterId: string | null) {
    if (!this.lobby) return;
    if (this.isHost) {
      this.lobby = {
        ...this.lobby,
        members: this.lobby.members.map((m) =>
          m.peerId === this.localPeerId ? { ...m, characterId, ready: false } : m
        ),
      };
      this.broadcastLobby();
    } else {
      const hostConn = this.connections.values().next().value;
      if (hostConn) {
        this.send(hostConn, {
          type: "select-character",
          peerId: this.localPeerId,
          characterId,
        });
      }
    }
  }

  setReady(ready: boolean) {
    if (!this.lobby) return;
    if (this.isHost) {
      this.lobby = {
        ...this.lobby,
        members: this.lobby.members.map((m) =>
          m.peerId === this.localPeerId ? { ...m, ready } : m
        ),
      };
      this.broadcastLobby();
    } else {
      const hostConn = this.connections.values().next().value;
      if (hostConn) {
        this.send(hostConn, { type: "set-ready", peerId: this.localPeerId, ready });
      }
    }
  }

  startGame() {
    if (!this.isHost) {
      const hostConn = this.connections.values().next().value;
      if (hostConn) this.send(hostConn, { type: "start-game" });
      return;
    }
    this.stopHostKeepalive();
  }

  broadcastGameState(state: GameState) {
    if (!this.isHost) return;
    this.broadcast({ type: "game-state", state });
  }

  sendAction(action: GameAction) {
    if (this.isHost) return;
    const hostConn = this.connections.values().next().value;
    if (hostConn) {
      this.send(hostConn, {
        type: "action",
        action,
        fromPeerId: this.localPeerId,
      });
    }
  }

  destroy() {
    this.stopHostKeepalive();
    this.broadcast({ type: "host-left" });
    for (const conn of this.connections.values()) conn.close();
    this.connections.clear();
    this.teardownPeer();
    this.lobby = null;
    this.isHost = false;
    this.joinLobbyResolve = null;
    this.joinLobbyReject = null;
    this.callbacks.onStatus("idle");
  }

  private async attemptJoin(code: string): Promise<void> {
    await this.initPeer();
    const hostId = peerIdForRoom(code);

    return new Promise((resolve, reject) => {
      const peer = this.peer!;
      let settled = false;

      const cleanup = () => {
        clearTimeout(joinTimeout);
        clearTimeout(lobbyTimeout);
        peer.off("error", onPeerError);
        this.joinLobbyResolve = null;
        this.joinLobbyReject = null;
      };

      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        cleanup();
        fn();
      };

      const joinTimeout = setTimeout(() => {
        finish(() => reject(new Error("Join timeout")));
      }, JOIN_TIMEOUT_MS);

      const onPeerError = (err: PeerError<string>) => {
        if (err.type === "peer-unavailable") {
          finish(() => reject(new Error("Peer unavailable")));
        }
      };

      peer.on("error", onPeerError);

      const conn = peer.connect(hostId, { reliable: true });
      let lobbyTimeout: ReturnType<typeof setTimeout>;

      conn.on("open", () => {
        clearTimeout(joinTimeout);
        this.connections.set(hostId, conn);
        this.wireConnection(conn);
        this.send(conn, { type: "join", peerId: this.localPeerId });

        lobbyTimeout = setTimeout(() => {
          finish(() => reject(new Error("Lobby timeout")));
        }, LOBBY_SYNC_TIMEOUT_MS);

        this.joinLobbyResolve = (lobby) => {
          this.lobby = lobby;
          finish(() => {
            this.callbacks.onStatus("connected");
            resolve();
          });
        };
        this.joinLobbyReject = (error) => {
          finish(() => reject(error));
        };
      });

      conn.on("error", () => {
        finish(() => reject(new Error("Connection error")));
      });

      conn.on("close", () => {
        if (!settled) {
          finish(() => reject(new Error("Connection closed")));
        }
      });
    });
  }

  private async initPeer(id?: string): Promise<void> {
    this.teardownPeer();
    const Peer = await getPeerClass();

    return new Promise((resolve, reject) => {
      const peer = id ? new Peer(id, PEER_OPTIONS) : new Peer(PEER_OPTIONS);
      this.peer = peer;

      const onOpen = (peerId: string) => {
        peer.off("error", onError);
        this.localPeerId = peerId;

        if (id) {
          peer.on("connection", (conn) => this.handleInboundConnection(conn));
          peer.on("disconnected", () => this.handleHostDisconnected());
          peer.on("close", () => this.handleHostClosed());
        }

        resolve();
      };

      const onError = (err: PeerError<string>) => {
        peer.off("open", onOpen);
        reject(err);
      };

      peer.on("open", onOpen);
      peer.on("error", onError);
    });
  }

  private startHostKeepalive() {
    this.stopHostKeepalive();
    this.hostKeepaliveTimer = setInterval(() => {
      void this.ensureHostRegistered();
    }, HOST_KEEPALIVE_MS);

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.onVisibilityChange);
    }
  }

  private stopHostKeepalive() {
    if (this.hostKeepaliveTimer) {
      clearInterval(this.hostKeepaliveTimer);
      this.hostKeepaliveTimer = null;
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
    }
  }

  private onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      this.ensureHostAvailable();
    }
  };

  private async ensureHostRegistered(): Promise<void> {
    if (!this.isHost || !this.lobby || this.lobby.started || this.hostReregistering) {
      return;
    }

    const expectedId = peerIdForRoom(this.lobby.roomCode);
    const needsReregister =
      !this.peer ||
      this.peer.destroyed ||
      this.peer.disconnected ||
      !this.peer.open ||
      this.localPeerId !== expectedId;

    if (!needsReregister) return;

    this.hostReregistering = true;
    try {
      const hadGuests = this.connections.size > 0;
      if (hadGuests) {
        try {
          this.peer?.reconnect();
          await delay(1500);
          if (this.peer?.open && !this.peer.disconnected) {
            this.callbacks.onStatus("connected");
            return;
          }
        } catch {
          // Fall through to full re-register.
        }
      }

      const guestConnections = [...this.connections.values()];
      for (const conn of guestConnections) conn.close();
      this.connections.clear();

      await this.initPeer(expectedId);
      this.callbacks.onStatus("connected");
      this.broadcastLobby();
    } catch {
      this.callbacks.onStatus(
        "error",
        "Room connection lost. Leave and create a new room."
      );
    } finally {
      this.hostReregistering = false;
    }
  }

  private handleInboundConnection(conn: DataConnection) {
    this.connections.set(conn.peer, conn);
    this.wireConnection(conn);
    conn.on("open", () => {
      if (!this.lobby || !this.isHost) return;
      const exists = this.lobby.members.some((m) => m.peerId === conn.peer);
      if (!exists && this.lobby.members.length < this.lobby.maxPlayers) {
        this.lobby = {
          ...this.lobby,
          members: [
            ...this.lobby.members,
            {
              peerId: conn.peer,
              characterId: null,
              isHost: false,
              ready: false,
            },
          ],
        };
        this.broadcastLobby();
      }
    });
  }

  private handleHostDisconnected() {
    if (!this.isHost || !this.peer || this.peer.destroyed) return;
    this.callbacks.onStatus("connecting", "Reconnecting room…");
    void this.ensureHostRegistered();
  }

  private handleHostClosed() {
    if (!this.isHost) return;
    this.callbacks.onStatus("error", "Room connection lost. Create a new room.");
  }

  private teardownPeer() {
    for (const conn of this.connections.values()) conn.close();
    this.connections.clear();
    if (this.peer) {
      this.peer.removeAllListeners();
      this.peer.destroy();
      this.peer = null;
    }
    this.localPeerId = "";
  }

  private wireConnection(conn: DataConnection) {
    conn.on("data", (raw) => {
      const msg = raw as NetMessage;
      this.handleMessage(msg, conn);
    });
    conn.on("close", () => {
      this.connections.delete(conn.peer);
      if (this.isHost && this.lobby) {
        this.lobby = {
          ...this.lobby,
          members: this.lobby.members.filter((m) => m.peerId !== conn.peer),
        };
        this.broadcastLobby();
      } else if (!this.isHost) {
        this.callbacks.onHostLeft();
      }
    });
  }

  private handleMessage(msg: NetMessage, conn: DataConnection) {
    switch (msg.type) {
      case "join":
        if (this.isHost && this.lobby) {
          const exists = this.lobby.members.some((m) => m.peerId === msg.peerId);
          if (!exists && this.lobby.members.length < this.lobby.maxPlayers) {
            this.lobby = {
              ...this.lobby,
              members: [
                ...this.lobby.members,
                {
                  peerId: msg.peerId,
                  characterId: null,
                  isHost: false,
                  ready: false,
                },
              ],
            };
          }
          this.broadcastLobby();
        }
        break;
      case "select-character":
        if (this.isHost && this.lobby) {
          this.lobby = {
            ...this.lobby,
            members: this.lobby.members.map((m) =>
              m.peerId === msg.peerId
                ? { ...m, characterId: msg.characterId, ready: false }
                : m
            ),
          };
          this.broadcastLobby();
        }
        break;
      case "set-ready":
        if (this.isHost && this.lobby) {
          this.lobby = {
            ...this.lobby,
            members: this.lobby.members.map((m) =>
              m.peerId === msg.peerId ? { ...m, ready: msg.ready } : m
            ),
          };
          this.broadcastLobby();
        }
        break;
      case "start-game":
        if (this.isHost) this.callbacks.onStartGameRequest();
        break;
      case "action":
        if (this.isHost) this.callbacks.onAction(msg.action, msg.fromPeerId);
        break;
      case "lobby-update":
        this.lobby = msg.lobby;
        this.callbacks.onLobbyUpdate(msg.lobby);
        if (this.joinLobbyResolve) {
          this.joinLobbyResolve(msg.lobby);
        }
        break;
      case "game-state":
        if (!this.isHost) this.callbacks.onGameState(msg.state);
        break;
      case "error":
        this.callbacks.onStatus("error", msg.message);
        if (this.joinLobbyReject) {
          this.joinLobbyReject(new Error(msg.message));
        }
        break;
      case "host-left":
        this.callbacks.onHostLeft();
        break;
    }
  }

  private broadcastLobby() {
    if (!this.lobby) return;
    this.callbacks.onLobbyUpdate(this.lobby);
    this.broadcast({ type: "lobby-update", lobby: this.lobby });
  }

  private broadcast(msg: NetMessage) {
    for (const conn of this.connections.values()) {
      if (conn.open) this.send(conn, msg);
    }
  }

  private send(conn: DataConnection, msg: NetMessage) {
    conn.send(msg);
  }
}
