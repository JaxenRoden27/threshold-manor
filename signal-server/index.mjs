import http from "node:http";
import { WebSocketServer } from "ws";
import { isValidRoomCode, normalizeRoomCode } from "./roomCode.mjs";

const PORT = Number(process.env.PORT ?? 8787);
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

/** @type {Map<string, { meta: RoomMeta, sessions: Map<string, import('ws').WebSocket>, expiresAt: number }>} */
const rooms = new Map();

/**
 * @typedef {import('../src/multiplayer/types').LobbyState} LobbyState
 * @typedef {import('../src/multiplayer/types').NetMessage} NetMessage
 * @typedef {import('../src/game/types').GameState} GameState
 */

/**
 * @typedef {Object} RoomMeta
 * @property {string} hostClientId
 * @property {LobbyState} lobby
 * @property {GameState | null} gameState
 */

function getRoom(code) {
  const room = rooms.get(code);
  if (!room) return null;
  if (room.expiresAt < Date.now()) {
    rooms.delete(code);
    return null;
  }
  return room;
}

function touchRoom(code, room) {
  room.expiresAt = Date.now() + ROOM_TTL_MS;
  rooms.set(code, room);
}

function broadcast(room, message) {
  const payload = JSON.stringify(message);
  for (const socket of room.sessions.values()) {
    if (socket.readyState === socket.OPEN) socket.send(payload);
  }
}

function sendError(socket, message) {
  socket.send(JSON.stringify({ type: "error", message }));
}

function isConnected(room, clientId) {
  const socket = room.sessions.get(clientId);
  return Boolean(socket && socket.readyState === socket.OPEN);
}

function attachClient(room, clientId, socket) {
  const existing = room.sessions.get(clientId);
  if (existing && existing !== socket) existing.close();
  room.sessions.set(clientId, socket);
}

function upsertMember(meta, member) {
  const index = meta.lobby.members.findIndex((m) => m.peerId === member.peerId);
  if (index >= 0) meta.lobby.members[index] = { ...meta.lobby.members[index], ...member };
  else meta.lobby.members.push(member);
}

function handleHostCreate(roomCode, msg, socket) {
  const roomCodeNorm = normalizeRoomCode(msg.roomCode);
  if (!isValidRoomCode(roomCodeNorm) || roomCodeNorm !== roomCode) {
    sendError(socket, "Invalid room code.");
    return;
  }

  let room = getRoom(roomCode);
  const maxPlayers = msg.maxPlayers ?? 4;

  if (room?.meta.lobby.started && room.meta.hostClientId !== msg.clientId) {
    sendError(socket, "This game has already started.");
    return;
  }

  if (room && room.meta.hostClientId !== msg.clientId && isConnected(room, room.meta.hostClientId)) {
    sendError(socket, "code-taken");
    return;
  }

  if (!room) {
    room = {
      meta: {
        hostClientId: msg.clientId,
        gameState: null,
        lobby: { roomCode, maxPlayers, started: false, members: [] },
      },
      sessions: new Map(),
      expiresAt: Date.now() + ROOM_TTL_MS,
    };
  } else {
    room.meta.hostClientId = msg.clientId;
    room.meta.lobby.maxPlayers = maxPlayers;
  }

  attachClient(room, msg.clientId, socket);
  upsertMember(room.meta, {
    peerId: msg.clientId,
    characterId: null,
    isHost: true,
    ready: false,
  });
  touchRoom(roomCode, room);
  socket.send(
    JSON.stringify({
      type: "session-ready",
      isHost: true,
      lobby: room.meta.lobby,
    })
  );
  broadcast(room, { type: "lobby-update", lobby: room.meta.lobby });
}

function handleGuestJoin(roomCode, msg, socket) {
  const room = getRoom(roomCode);
  if (!room) {
    sendError(socket, "room-not-found");
    return;
  }

  const existing = room.meta.lobby.members.find((m) => m.peerId === msg.clientId);
  if (room.meta.lobby.started && !existing) {
    sendError(socket, "This game has already started.");
    return;
  }

  const activeCount = room.meta.lobby.members.filter((m) => isConnected(room, m.peerId)).length;
  if (!existing && activeCount >= room.meta.lobby.maxPlayers) {
    sendError(socket, "Room is full.");
    return;
  }

  attachClient(room, msg.clientId, socket);
  upsertMember(room.meta, {
    peerId: msg.clientId,
    characterId: existing?.characterId ?? null,
    isHost: false,
    ready: existing?.ready ?? false,
  });
  touchRoom(roomCode, room);
  socket.send(
    JSON.stringify({
      type: "session-ready",
      isHost: false,
      lobby: room.meta.lobby,
    })
  );
  broadcast(room, { type: "lobby-update", lobby: room.meta.lobby });
}

function handleMessage(roomCode, socket, raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    sendError(socket, "Invalid message.");
    return;
  }

  if (msg.type === "host-create") {
    handleHostCreate(roomCode, msg, socket);
    return;
  }

  if (msg.type === "guest-join") {
    handleGuestJoin(roomCode, msg, socket);
    return;
  }

  const room = getRoom(roomCode);
  if (!room) return;

  const clientId = [...room.sessions.entries()].find(([, ws]) => ws === socket)?.[0];

  switch (msg.type) {
    case "select-character":
      if (clientId !== msg.peerId) return;
      room.meta.lobby.members = room.meta.lobby.members.map((m) =>
        m.peerId === msg.peerId ? { ...m, characterId: msg.characterId, ready: false } : m
      );
      touchRoom(roomCode, room);
      broadcast(room, { type: "lobby-update", lobby: room.meta.lobby });
      return;
    case "set-ready":
      if (clientId !== msg.peerId) return;
      room.meta.lobby.members = room.meta.lobby.members.map((m) =>
        m.peerId === msg.peerId ? { ...m, ready: msg.ready } : m
      );
      touchRoom(roomCode, room);
      broadcast(room, { type: "lobby-update", lobby: room.meta.lobby });
      return;
    case "start-game":
      if (clientId !== room.meta.hostClientId) return;
      room.meta.lobby.started = true;
      touchRoom(roomCode, room);
      broadcast(room, { type: "start-game" });
      broadcast(room, { type: "lobby-update", lobby: room.meta.lobby });
      return;
    case "publish-game-state":
      if (clientId !== room.meta.hostClientId) return;
      room.meta.gameState = msg.state;
      touchRoom(roomCode, room);
      broadcast(room, { type: "game-state", state: msg.state });
      return;
    case "action":
      if (clientId === room.meta.hostClientId) return;
      broadcast(room, { type: "action", action: msg.action, fromPeerId: msg.fromPeerId });
      return;
  }
}

function handleClose(roomCode, socket) {
  const room = getRoom(roomCode);
  if (!room) return;

  const clientId = [...room.sessions.entries()].find(([, ws]) => ws === socket)?.[0];
  if (!clientId) return;

  room.sessions.delete(clientId);
  room.meta.lobby.members = room.meta.lobby.members.filter((m) => m.peerId !== clientId);
  touchRoom(roomCode, room);
  broadcast(room, { type: "lobby-update", lobby: room.meta.lobby });
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("threshold-manor signal server");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (socket, req) => {
  const parts = (req.url ?? "/").split("/").filter(Boolean);
  const roomCode = normalizeRoomCode(parts[parts.length - 1] ?? "");
  if (!isValidRoomCode(roomCode)) {
    socket.close();
    return;
  }

  const room = getRoom(roomCode);
  if (room) {
    socket.send(JSON.stringify({ type: "lobby-update", lobby: room.meta.lobby }));
    if (room.meta.gameState) {
      socket.send(JSON.stringify({ type: "game-state", state: room.meta.gameState }));
    }
  }

  socket.on("message", (data) => handleMessage(roomCode, socket, String(data)));
  socket.on("close", () => handleClose(roomCode, socket));
});

server.listen(PORT, () => {
  console.log(`signal server listening on ${PORT}`);
});
