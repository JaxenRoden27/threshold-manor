import { ThresholdManorRoom } from "./room";
import { isValidRoomCode, normalizeRoomCode } from "../../src/multiplayer/roomCode";

export { ThresholdManorRoom };

interface Env {
  ROOM: DurableObjectNamespace<ThresholdManorRoom>;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    const parts = url.pathname.split("/").filter(Boolean);
    const roomCode = normalizeRoomCode(parts[parts.length - 1] ?? "");

    if (!isValidRoomCode(roomCode)) {
      return new Response("Invalid room code", { status: 400 });
    }

    const id = env.ROOM.idFromName(roomCode);
    const stub = env.ROOM.get(id);
    return stub.fetch(request);
  },
};
