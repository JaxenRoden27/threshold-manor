import type { GameAction, LobbyMember, LobbyState, NetMessage } from "../../src/multiplayer/types";
import type { GameState } from "../../src/game/types";
import { isValidRoomCode, normalizeRoomCode } from "../../src/multiplayer/roomCode";

type ClientMessage =
  | { type: "host-create"; clientId: string; roomCode: string; maxPlayers?: number }
  | { type: "guest-join"; clientId: string }
  | { type: "select-character"; peerId: string; characterId: string | null }
  | { type: "set-ready"; peerId: string; ready: boolean }
  | { type: "start-game" }
  | { type: "publish-game-state"; state: GameState }
  | { type: "action"; action: GameAction; fromPeerId: string };

type ServerMessage = NetMessage | { type: "session-ready"; isHost: boolean; lobby: LobbyState };

interface RoomMeta {
  hostClientId: string;
  lobby: LobbyState;
  gameState: GameState | null;
}

const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

export class ThresholdManorRoom implements DurableObject {
  private meta: RoomMeta | null = null;
  private sessions = new Map<WebSocket, string>();

  constructor(private readonly state: DurableObjectState) {}

  async fetch(request: Request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    if (!this.meta) {
      this.meta = (await this.state.storage.get<RoomMeta>("meta")) ?? null;
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    this.handleConnection(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  private handleConnection(socket: WebSocket) {
    socket.accept();

    if (this.meta) {
      socket.send(
        JSON.stringify({ type: "lobby-update", lobby: this.meta.lobby } satisfies NetMessage)
      );
      if (this.meta.gameState) {
        socket.send(
          JSON.stringify({
            type: "game-state",
            state: this.meta.gameState,
          } satisfies NetMessage)
        );
      }
    }

    socket.addEventListener("message", async (event) => {
      await this.onMessage(String(event.data), socket);
    });

    socket.addEventListener("close", async () => {
      await this.onClose(socket);
    });
  }

  private async onMessage(raw: string, socket: WebSocket) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw) as ClientMessage;
    } catch {
      this.sendError(socket, "Invalid message.");
      return;
    }

    switch (msg.type) {
      case "host-create":
        await this.handleHostCreate(msg, socket);
        break;
      case "guest-join":
        await this.handleGuestJoin(msg, socket);
        break;
      case "select-character":
        await this.handleSelectCharacter(msg, socket);
        break;
      case "set-ready":
        await this.handleSetReady(msg, socket);
        break;
      case "start-game":
        await this.handleStartGame(socket);
        break;
      case "publish-game-state":
        await this.handlePublishGameState(msg, socket);
        break;
      case "action":
        await this.handleAction(msg, socket);
        break;
    }
  }

  private async onClose(socket: WebSocket) {
    const clientId = this.sessions.get(socket);
    if (!clientId) return;
    this.sessions.delete(socket);

    if (!this.meta) return;

    // Keep the host registered when they background the app; only drop guests.
    if (clientId !== this.meta.hostClientId) {
      this.meta.lobby.members = this.meta.lobby.members.filter(
        (member) => member.peerId !== clientId
      );
    }

    await this.persist();
    this.broadcastLobby();
  }

  private async handleHostCreate(
    msg: Extract<ClientMessage, { type: "host-create" }>,
    socket: WebSocket
  ) {
    const maxPlayers = msg.maxPlayers ?? 6;
    const roomCode = normalizeRoomCode(msg.roomCode);
    if (!isValidRoomCode(roomCode)) {
      this.sendError(socket, "Invalid room code.");
      return;
    }

    if (this.meta?.lobby.started && this.meta.hostClientId !== msg.clientId) {
      this.sendError(socket, "This game has already started.");
      return;
    }

    const hostOnline =
      this.meta &&
      this.meta.hostClientId !== msg.clientId &&
      this.isClientConnected(this.meta.hostClientId);

    if (hostOnline) {
      this.sendError(socket, "code-taken");
      return;
    }

    if (!this.meta) {
      this.meta = {
        hostClientId: msg.clientId,
        gameState: null,
        lobby: {
          roomCode,
          maxPlayers,
          started: false,
          members: [],
        },
      };
    } else {
      this.meta.hostClientId = msg.clientId;
      this.meta.lobby.maxPlayers = maxPlayers;
    }

    this.attachClient(msg.clientId, socket);
    this.upsertMember({
      peerId: msg.clientId,
      characterId: null,
      isHost: true,
      ready: false,
    });
    await this.persist();
    this.sendSessionReady(socket, true);
    this.broadcastLobby();
  }

  private async handleGuestJoin(
    msg: Extract<ClientMessage, { type: "guest-join" }>,
    socket: WebSocket
  ) {
    if (!this.meta) {
      this.sendError(socket, "room-not-found");
      return;
    }

    const existing = this.meta.lobby.members.find((m) => m.peerId === msg.clientId);
    if (this.meta.lobby.started && !existing) {
      this.sendError(socket, "This game has already started.");
      return;
    }

    const activeCount = this.meta.lobby.members.filter((m) =>
      this.isClientConnected(m.peerId)
    ).length;

    if (!existing && activeCount >= this.meta.lobby.maxPlayers) {
      this.sendError(socket, "Room is full.");
      return;
    }

    this.attachClient(msg.clientId, socket);
    this.upsertMember({
      peerId: msg.clientId,
      characterId: existing?.characterId ?? null,
      isHost: false,
      ready: existing?.ready ?? false,
    });
    await this.persist();
    this.sendSessionReady(socket, false);
    this.broadcastLobby();
  }

  private async handleSelectCharacter(
    msg: Extract<ClientMessage, { type: "select-character" }>,
    socket: WebSocket
  ) {
    if (!this.meta || !this.canActAs(socket, msg.peerId)) return;
    this.meta.lobby.members = this.meta.lobby.members.map((member) =>
      member.peerId === msg.peerId
        ? { ...member, characterId: msg.characterId, ready: false }
        : member
    );
    await this.persist();
    this.broadcastLobby();
  }

  private async handleSetReady(
    msg: Extract<ClientMessage, { type: "set-ready" }>,
    socket: WebSocket
  ) {
    if (!this.meta || !this.canActAs(socket, msg.peerId)) return;
    this.meta.lobby.members = this.meta.lobby.members.map((member) =>
      member.peerId === msg.peerId ? { ...member, ready: msg.ready } : member
    );
    await this.persist();
    this.broadcastLobby();
  }

  private async handleStartGame(socket: WebSocket) {
    if (!this.meta) return;
    const clientId = this.sessions.get(socket);
    if (!clientId || clientId !== this.meta.hostClientId) return;
    this.meta.lobby.started = true;
    await this.persist();
    this.broadcast({ type: "start-game" });
    this.broadcastLobby();
  }

  private async handlePublishGameState(
    msg: Extract<ClientMessage, { type: "publish-game-state" }>,
    socket: WebSocket
  ) {
    if (!this.meta) return;
    const clientId = this.sessions.get(socket);
    if (!clientId || clientId !== this.meta.hostClientId) return;
    this.meta.gameState = msg.state;
    await this.persist();
    this.broadcast({ type: "game-state", state: msg.state });
  }

  private async handleAction(
    msg: Extract<ClientMessage, { type: "action" }>,
    socket: WebSocket
  ) {
    if (!this.meta) return;
    const clientId = this.sessions.get(socket);
    if (!clientId || clientId === this.meta.hostClientId) return;
    this.broadcast({
      type: "action",
      action: msg.action,
      fromPeerId: msg.fromPeerId,
    });
  }

  private attachClient(clientId: string, socket: WebSocket) {
    for (const [existingSocket, existingClientId] of this.sessions.entries()) {
      if (existingClientId === clientId && existingSocket !== socket) {
        this.sessions.delete(existingSocket);
      }
    }
    this.sessions.set(socket, clientId);
  }

  private upsertMember(member: LobbyMember) {
    if (!this.meta) return;
    const index = this.meta.lobby.members.findIndex((m) => m.peerId === member.peerId);
    if (index >= 0) {
      this.meta.lobby.members[index] = { ...this.meta.lobby.members[index], ...member };
    } else {
      this.meta.lobby.members.push(member);
    }
  }

  private canActAs(socket: WebSocket, peerId: string) {
    return this.sessions.get(socket) === peerId;
  }

  private isClientConnected(clientId: string) {
    for (const [socket, id] of this.sessions.entries()) {
      if (id === clientId && socket.readyState === WebSocket.OPEN) return true;
    }
    return false;
  }

  private sendSessionReady(socket: WebSocket, isHost: boolean) {
    if (!this.meta) return;
    socket.send(
      JSON.stringify({
        type: "session-ready",
        isHost,
        lobby: this.meta.lobby,
      } satisfies ServerMessage)
    );
  }

  private sendError(socket: WebSocket, message: string) {
    socket.send(JSON.stringify({ type: "error", message } satisfies NetMessage));
  }

  private broadcastLobby() {
    if (!this.meta) return;
    this.broadcast({ type: "lobby-update", lobby: this.meta.lobby });
  }

  private broadcast(message: NetMessage) {
    const payload = JSON.stringify(message);
    for (const socket of this.sessions.keys()) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
      }
    }
  }

  private async persist() {
    if (!this.meta) return;
    await this.state.storage.put("meta", this.meta);
    await this.state.storage.put("expiresAt", Date.now() + ROOM_TTL_MS);
  }
}
