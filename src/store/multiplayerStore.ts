import { create } from "zustand";
import { MultiplayerSession } from "@/multiplayer/session";
import type {
  ConnectionStatus,
  GameAction,
  LobbyState,
  PlayMode,
} from "@/multiplayer/types";
import { isValidRoomCode, normalizeRoomCode } from "@/multiplayer/roomCode";
import { useGameStore } from "@/store/gameStore";
import { startMultiplayerGame } from "@/game/gameEngine";
import type { GameState } from "@/game/types";

let session: MultiplayerSession | null = null;
let applyingRemote = false;
let broadcastTimer: ReturnType<typeof setTimeout> | null = null;

interface MultiplayerStore {
  mode: PlayMode;
  roomCode: string | null;
  isHost: boolean;
  localPeerId: string | null;
  status: ConnectionStatus;
  statusMessage: string | null;
  lobby: LobbyState | null;
  setMode: (mode: PlayMode) => void;
  createRoom: () => Promise<string | null>;
  joinRoom: (code: string) => Promise<boolean>;
  selectCharacter: (characterId: string | null) => void;
  setReady: (ready: boolean) => void;
  startMultiplayer: () => void;
  leaveRoom: () => void;
  ensureHostAvailable: () => void;
  dispatchAction: (action: GameAction) => void;
  isMyTurn: () => boolean;
  canLocalAct: () => boolean;
}

function scheduleBroadcast(state: GameState) {
  const mp = useMultiplayerStore.getState();
  if (!mp.isHost || mp.mode !== "multiplayer" || applyingRemote) return;
  if (broadcastTimer) clearTimeout(broadcastTimer);
  broadcastTimer = setTimeout(() => {
    session?.broadcastGameState(useGameStore.getState());
  }, 50);
}

function applyHostAction(action: GameAction, fromPeerId: string) {
  const game = useGameStore.getState();
  const active = game.players[game.activePlayerIndex];
  if (!active || active.id !== fromPeerId) return;

  switch (action.kind) {
    case "move":
      useGameStore.getState().move(action.direction);
      break;
    case "resolve-item":
      useGameStore.getState().resolveItemCard();
      break;
    case "roll-stat":
      useGameStore.getState().rollStatCheck(action.dice);
      break;
    case "roll-haunt":
    case "roll-crisis":
      useGameStore.getState().rollHauntRoll(action.dice);
      break;
    case "use-floor-transition":
      useGameStore.getState().useFloorTransition();
      break;
    case "set-view-floor":
      useGameStore.getState().setViewFloor(action.floor);
      break;
    case "dismiss-card":
      useGameStore.getState().dismissPendingCard();
      break;
    case "end-turn":
      useGameStore.getState().endTurn();
      break;
    case "rotate-sigil":
      useGameStore.getState().rotatePuzzleSigil(action.index);
      break;
    case "dismiss-haunt-briefing":
      useGameStore.getState().dismissHauntBriefing();
      break;
    case "haunt-action":
      useGameStore.getState().performHauntAction(action.actionId);
      break;
    case "start-combat":
      useGameStore.getState().initiateCombat(
        action.defenderId,
        action.defenderType,
        action.mental
      );
      break;
    case "roll-combat":
      useGameStore.getState().rollCombat();
      break;
    case "allocate-combat-damage":
      useGameStore.getState().allocateCombatDamage(action.allocation);
      break;
    case "dismiss-combat":
      useGameStore.getState().dismissCombat();
      break;
    case "complete-elevator":
      useGameStore.getState().completeElevatorTransition(
        action.dice,
        action.floorPick
      );
      break;
    case "attempt-vault-lockpick":
      useGameStore.getState().attemptVaultLockpick();
      break;
    case "dismiss-vault":
      useGameStore.getState().dismissVaultLockpick();
      break;
  }
}

function ensureSession() {
  if (!session) {
    session = new MultiplayerSession({
      onLobbyUpdate: (lobby) => {
        useMultiplayerStore.setState({ lobby, roomCode: lobby.roomCode });
      },
      onGameState: (state) => {
        applyingRemote = true;
        useGameStore.setState(state);
        applyingRemote = false;
      },
      onStatus: (status, message) => {
        useMultiplayerStore.setState({ status, statusMessage: message ?? null });
      },
      onAction: (action, fromPeerId) => {
        applyHostAction(action, fromPeerId);
      },
      onStartGameRequest: () => {
        useMultiplayerStore.getState().startMultiplayer();
      },
      onHostLeft: () => {
        useMultiplayerStore.setState({
          status: "disconnected",
          statusMessage: "The host left the session.",
          lobby: null,
          roomCode: null,
        });
        useGameStore.getState().resetGame();
      },
    });

    useGameStore.subscribe((state) => {
      scheduleBroadcast(state);
    });
  }
  return session;
}

export const useMultiplayerStore = create<MultiplayerStore>((set, get) => ({
  mode: "local",
  roomCode: null,
  isHost: false,
  localPeerId: null,
  status: "idle",
  statusMessage: null,
  lobby: null,

  setMode: (mode) => set({ mode }),

  createRoom: async () => {
    ensureSession();
    set({ mode: "multiplayer", status: "connecting", statusMessage: null });
    try {
      const code = await session!.createRoom(4);
      const lobby = session!.getLobby();
      set({
        roomCode: code,
        isHost: true,
        localPeerId: session!.getLocalPeerId(),
        status: "connected",
        lobby,
      });
      return code;
    } catch {
      set({ status: "error", statusMessage: "Failed to create room." });
      return null;
    }
  },

  joinRoom: async (code) => {
    const normalized = normalizeRoomCode(code);
    if (!isValidRoomCode(normalized)) {
      set({ status: "error", statusMessage: "Enter a valid 4-character room code." });
      return false;
    }
    ensureSession();
    set({ mode: "multiplayer", status: "connecting", statusMessage: null, lobby: null });
    try {
      await session!.joinRoom(normalized);
      const lobby = session!.getLobby();
      set({
        roomCode: normalized,
        isHost: false,
        localPeerId: session!.getLocalPeerId(),
        status: "connected",
        lobby,
        statusMessage: null,
      });
      return true;
    } catch (error) {
      const fallback =
        error instanceof Error && error.message === "room-not-found"
          ? "Could not find that room. Check the code and try again."
          : "Could not join room. Check the code and try again.";
      const message = get().statusMessage ?? fallback;
      session?.abortJoin();
      set({
        status: "error",
        statusMessage: message,
        lobby: null,
        roomCode: null,
        localPeerId: null,
        isHost: false,
      });
      return false;
    }
  },

  selectCharacter: (characterId) => {
    session?.selectCharacter(characterId);
    const { lobby, localPeerId, isHost } = get();
    if (isHost && lobby && localPeerId) {
      set({
        lobby: {
          ...lobby,
          members: lobby.members.map((m) =>
            m.peerId === localPeerId ? { ...m, characterId, ready: false } : m
          ),
        },
      });
    }
  },

  setReady: (ready) => {
    session?.setReady(ready);
    const { lobby, localPeerId, isHost } = get();
    if (isHost && lobby && localPeerId) {
      set({
        lobby: {
          ...lobby,
          members: lobby.members.map((m) =>
            m.peerId === localPeerId ? { ...m, ready } : m
          ),
        },
      });
    }
  },

  startMultiplayer: () => {
    const { lobby, isHost } = get();
    if (!lobby || !isHost) return;

    const members = lobby.members.filter((m) => m.characterId);
    const uniqueChars = new Set(members.map((m) => m.characterId));
    if (members.length < 2 || uniqueChars.size !== members.length) return;
    if (!members.every((m) => m.ready)) return;

    const gameState = startMultiplayerGame(members);
    useGameStore.setState(gameState);
    session?.startGame();
    session?.broadcastGameState(gameState);

    set({
      lobby: { ...lobby, started: true },
    });
  },

  leaveRoom: () => {
    session?.destroy();
    session = null;
    set({
      mode: "local",
      roomCode: null,
      isHost: false,
      localPeerId: null,
      status: "idle",
      statusMessage: null,
      lobby: null,
    });
    useGameStore.getState().resetGame();
  },

  ensureHostAvailable: () => {
    session?.ensureHostAvailable();
  },

  dispatchAction: (action) => {
    const { mode, isHost, localPeerId } = get();
    if (mode === "local") return;

    if (isHost) {
      if (!localPeerId) return;
      applyHostAction(action, localPeerId);
      return;
    }

    session?.sendAction(action);
  },

  isMyTurn: () => {
    const { mode, localPeerId } = get();
    if (mode === "local") return true;
    if (!localPeerId) return false;
    const game = useGameStore.getState();
    const active = game.players[game.activePlayerIndex];
    return active?.id === localPeerId;
  },

  canLocalAct: () => {
    const { mode, status } = get();
    if (mode === "local") return true;
    return status === "connected" && get().isMyTurn();
  },
}));
