import type { DataConnection, Peer } from "peerjs";
import type { GameState } from "@/game/types";
import type { GameAction, LobbyState, NetMessage } from "./types";
import { generateRoomCode, peerIdForRoom } from "./roomCode";

type PeerConstructor = typeof import("peerjs").default;

let PeerClass: PeerConstructor | null = null;

async function getPeerClass(): Promise<PeerConstructor> {
  if (!PeerClass) {
    const mod = await import("peerjs");
    PeerClass = mod.default;
  }
  return PeerClass;
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
    const Peer = await getPeerClass();
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
        this.broadcastLobby();
        this.callbacks.onStatus("connected");
        return code;
      } catch {
        this.destroyPeer();
      }
    }

    this.callbacks.onStatus("error", "Could not create a room. Try again.");
    throw new Error("Failed to create room");
  }

  async joinRoom(code: string): Promise<void> {
    const Peer = await getPeerClass();
    this.isHost = false;
    this.callbacks.onStatus("connecting");

    await this.initPeer();
    const hostId = peerIdForRoom(code);

    return new Promise((resolve, reject) => {
      const conn = this.peer!.connect(hostId, { reliable: true });
      const timeout = setTimeout(() => {
        this.callbacks.onStatus("error", "Could not find that room code.");
        reject(new Error("Join timeout"));
      }, 12000);

      conn.on("open", () => {
        clearTimeout(timeout);
        this.connections.set(hostId, conn);
        this.wireConnection(conn);
        this.send(conn, { type: "join", peerId: this.localPeerId });
        this.callbacks.onStatus("connected");
        resolve();
      });

      conn.on("error", () => {
        clearTimeout(timeout);
        this.callbacks.onStatus("error", "Connection failed.");
        reject(new Error("Connection error"));
      });
    });
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
    // Host handles start via store callback
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

  handleHostStartGameRequest() {
    // noop - handled by store
  }

  destroy() {
    this.broadcast({ type: "host-left" });
    for (const conn of this.connections.values()) conn.close();
    this.connections.clear();
    this.destroyPeer();
    this.lobby = null;
    this.isHost = false;
    this.localPeerId = "";
    this.callbacks.onStatus("idle");
  }

  private async initPeer(id?: string): Promise<void> {
    const Peer = await getPeerClass();
    return new Promise((resolve, reject) => {
      this.peer = id ? new Peer(id) : new Peer();
      this.peer.on("open", (peerId) => {
        this.localPeerId = peerId;
        resolve();
      });
      this.peer.on("error", (err) => {
        reject(err);
      });
      if (id) {
        this.peer.on("connection", (conn) => {
          this.connections.set(conn.peer, conn);
          this.wireConnection(conn);
          conn.on("open", () => {
            if (this.lobby && this.isHost) {
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
        });
      }
    });
  }

  private destroyPeer() {
    this.peer?.destroy();
    this.peer = null;
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
        break;
      case "game-state":
        if (!this.isHost) this.callbacks.onGameState(msg.state);
        break;
      case "error":
        this.callbacks.onStatus("error", msg.message);
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
