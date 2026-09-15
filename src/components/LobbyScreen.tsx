"use client";

import { useMemo, useState } from "react";
import {
  EXPLORER_BY_ID,
  COLOR_PAIR_LABELS,
  explorersByColor,
  getExplorerById,
  isExplorerTaken,
} from "@/game/characterData";
import { ExplorerCard } from "@/components/CharacterCardUI";
import { useGameStore } from "@/store/gameStore";
import { useMultiplayerStore } from "@/store/multiplayerStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SetupTab = "local" | "create" | "join";

const PLAYER_COUNTS = [2, 3, 4, 5, 6] as const;

export function LobbyScreen() {
  const { selectedPlayerCount, setPlayerCount, startGame } = useGameStore();
  const {
    mode,
    roomCode,
    isHost,
    status,
    statusMessage,
    lobby,
    localPeerId,
    createRoom,
    joinRoom,
    selectCharacter,
    setReady,
    startMultiplayer,
    leaveRoom,
    setMode,
  } = useMultiplayerStore();

  const [tab, setTab] = useState<SetupTab>("create");
  const [joinInput, setJoinInput] = useState("");
  const [localAssignments, setLocalAssignments] = useState<(string | null)[]>([
    null,
    null,
  ]);
  const [localPicker, setLocalPicker] = useState(0);
  const [hostMaxPlayers, setHostMaxPlayers] = useState(4);

  const myMember = lobby?.members.find((m) => m.peerId === localPeerId);
  const myMemberIndex =
    lobby?.members.findIndex((m) => m.peerId === localPeerId) ?? -1;

  const takenCharacters = useMemo(() => {
    const taken = new Set<string | null>();
    if (lobby) {
      for (const m of lobby.members) {
        if (m.characterId) taken.add(m.characterId);
      }
    }
    for (const id of localAssignments) {
      if (id) taken.add(id);
    }
    return taken;
  }, [lobby, localAssignments]);

  const allReady =
    lobby &&
    lobby.members.length >= 2 &&
    lobby.members.every((m) => m.characterId && m.ready) &&
    new Set(lobby.members.map((m) => m.characterId)).size ===
      lobby.members.length;

  const canMultiplayerPick = (memberIndex: number): boolean => {
    if (!lobby || memberIndex < 0) return false;
    for (let i = 0; i < memberIndex; i++) {
      if (!lobby.members[i]?.characterId) return false;
    }
    return true;
  };

  const resetLocalAssignments = (count: number) => {
    setLocalAssignments(Array.from({ length: count }, () => null));
    setLocalPicker(0);
  };

  const handleLocalPick = (explorerId: string) => {
    if (isExplorerTaken(explorerId, takenCharacters)) return;
    setLocalAssignments((prev) => {
      const next = [...prev];
      next[localPicker] = explorerId;
      return next;
    });
    if (localPicker < selectedPlayerCount - 1) {
      setLocalPicker((p) => p + 1);
    }
  };

  const localComplete =
    localAssignments.length === selectedPlayerCount &&
    localAssignments.every(Boolean);

  const inMultiplayerLobby =
    mode === "multiplayer" && lobby && !lobby.started;
  const waitingForLobby =
    mode === "multiplayer" && status === "connected" && !lobby;

  const grouped = explorersByColor();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-amber-100 md:text-4xl">
          Threshold Manor
        </h1>
        <p className="mt-2 text-sm text-stone-400 md:text-base">
          2–6 explorers · sequential picks · youngest goes first · color pairs
          lock together
        </p>
      </header>

      {!inMultiplayerLobby && (
        <div className="flex flex-wrap justify-center gap-2">
          {(
            [
              ["create", "Create Room"],
              ["join", "Join Room"],
              ["local", "Local Play"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              variant={tab === key ? "default" : "outline"}
              onClick={() => {
                setTab(key);
                setMode(key === "local" ? "local" : "multiplayer");
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      )}

      {tab === "local" && !inMultiplayerLobby && (
        <>
          <Card className="border-stone-700 bg-stone-900/80">
            <CardHeader>
              <CardTitle className="text-amber-100">Party Size</CardTitle>
              <CardDescription>
                Hot-seat mode — each player picks one explorer in order. Turn
                order follows age (youngest first).
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {PLAYER_COUNTS.map((n) => (
                <Button
                  key={n}
                  variant={selectedPlayerCount === n ? "default" : "outline"}
                  onClick={() => {
                    setPlayerCount(n);
                    resetLocalAssignments(n);
                  }}
                >
                  {n} Players
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-amber-800/40 bg-stone-900/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-amber-100">
                Player {localPicker + 1} of {selectedPlayerCount} — choose an
                explorer
              </CardTitle>
              <CardDescription>
                Picking a character locks its color pair. Green start marks are
                shown on each track.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {localAssignments.map((id, i) => (
                  <Badge
                    key={i}
                    variant={i === localPicker ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setLocalPicker(i)}
                  >
                    P{i + 1}: {id ? EXPLORER_BY_ID[id]?.name ?? "?" : "—"}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <ExplorerPickerGrid
            taken={takenCharacters}
            selectedId={localAssignments[localPicker]}
            onPick={handleLocalPick}
            grouped={grouped}
          />

          <div className="flex flex-col items-center gap-2">
            <Button
              size="lg"
              className="w-full max-w-sm bg-amber-700 hover:bg-amber-600"
              disabled={!localComplete}
              onClick={() =>
                startGame(localAssignments.filter(Boolean) as string[])
              }
            >
              Enter the Manor
            </Button>
          </div>
        </>
      )}

      {tab === "create" && !inMultiplayerLobby && (
        <Card className="border-stone-700 bg-stone-900/80">
          <CardHeader>
            <CardTitle className="text-amber-100">Host a Game</CardTitle>
            <CardDescription>
              Create a room for up to 6 players. Members pick explorers in join
              order.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap justify-center gap-2">
              {PLAYER_COUNTS.map((n) => (
                <Button
                  key={n}
                  variant={hostMaxPlayers === n ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHostMaxPlayers(n)}
                >
                  Max {n}
                </Button>
              ))}
            </div>
            <Button
              size="lg"
              className="bg-amber-700 hover:bg-amber-600"
              disabled={status === "connecting"}
              onClick={() => createRoom(hostMaxPlayers)}
            >
              {status === "connecting" ? "Creating…" : "Create Room"}
            </Button>
            {statusMessage && (
              <p className="text-sm text-rose-400">{statusMessage}</p>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "join" && !inMultiplayerLobby && (
        <Card className="border-stone-700 bg-stone-900/80">
          <CardHeader>
            <CardTitle className="text-amber-100">Join a Game</CardTitle>
            <CardDescription>
              Enter the room code from your host&apos;s screen.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <Input
              className="max-w-xs text-center text-lg tracking-[0.3em] uppercase"
              placeholder="ABCD"
              maxLength={4}
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
            />
            <Button
              size="lg"
              className="bg-amber-700 hover:bg-amber-600"
              disabled={joinInput.length < 4 || status === "connecting"}
              onClick={() => joinRoom(joinInput)}
            >
              {status === "connecting" ? "Joining…" : "Join Room"}
            </Button>
            {statusMessage && (
              <p className="text-sm text-rose-400">{statusMessage}</p>
            )}
          </CardContent>
        </Card>
      )}

      {waitingForLobby && (
        <Card className="border-stone-700 bg-stone-900/80">
          <CardContent className="py-8 text-center text-stone-400">
            Syncing with the host…
          </CardContent>
        </Card>
      )}

      {inMultiplayerLobby && (
        <>
          <Card className="border-amber-700/50 bg-stone-900/80">
            <CardHeader>
              <CardTitle className="text-amber-100">Room Code</CardTitle>
              <CardDescription>
                Share this code. Pick explorers in join order — each color pair
                locks when taken.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-2">
              <p className="text-4xl font-bold tracking-[0.35em] text-amber-200">
                {roomCode}
              </p>
              <p className="text-xs text-stone-500">
                {status === "connected"
                  ? "Connected"
                  : status === "connecting"
                    ? statusMessage ?? "Connecting…"
                    : status}{" "}
                · {lobby.members.length}/{lobby.maxPlayers} players
              </p>
              <Button variant="ghost" size="sm" onClick={leaveRoom}>
                Leave Room
              </Button>
            </CardContent>
          </Card>

          <Card className="border-stone-700 bg-stone-900/80">
            <CardHeader>
              <CardTitle className="text-amber-100">Party</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {lobby.members.map((m, index) => {
                const char = getExplorerById(m.characterId ?? "");
                return (
                  <div
                    key={m.peerId}
                    className="flex items-center justify-between rounded border border-stone-800 px-3 py-2"
                  >
                    <span className="text-stone-300">
                      #{index + 1} {m.isHost ? "Host" : "Guest"}
                      {m.peerId === localPeerId ? " (you)" : ""}
                    </span>
                    <span className="text-amber-200">
                      {char?.name ?? "Waiting to pick…"}
                      {m.ready ? " ✓" : ""}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {canMultiplayerPick(myMemberIndex) ? (
            <>
              <Card className="border-amber-800/40 bg-stone-900/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-amber-100">Your Explorer</CardTitle>
                  <CardDescription>
                    Player #{myMemberIndex + 1} pick — color pair locks on
                    selection.
                  </CardDescription>
                </CardHeader>
              </Card>
              <ExplorerPickerGrid
                taken={takenCharacters}
                selectedId={myMember?.characterId ?? null}
                onPick={(id) => {
                  const next = myMember?.characterId === id ? null : id;
                  selectCharacter(next);
                }}
                grouped={grouped}
                singleSelect
              />
            </>
          ) : (
            <Card className="border-stone-700 bg-stone-900/80">
              <CardContent className="py-6 text-center text-sm text-stone-400">
                Waiting for earlier players to choose their explorers…
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setReady(!myMember?.ready)}
              disabled={!myMember?.characterId}
            >
              {myMember?.ready ? "Not Ready" : "Ready"}
            </Button>

            {isHost ? (
              <Button
                size="lg"
                className="w-full max-w-sm bg-amber-700 hover:bg-amber-600"
                disabled={!allReady}
                onClick={startMultiplayer}
              >
                Start Game
              </Button>
            ) : (
              <p className="text-xs text-stone-500">
                Waiting for the host to start the game…
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ExplorerPickerGrid({
  taken,
  selectedId,
  onPick,
  grouped,
  singleSelect = false,
}: {
  taken: Set<string | null>;
  selectedId: string | null;
  onPick: (id: string) => void;
  grouped: ReturnType<typeof explorersByColor>;
  singleSelect?: boolean;
}) {
  return (
    <div className="space-y-6">
      {(Object.keys(grouped) as Array<keyof typeof grouped>).map((color) => (
        <section key={color}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
            {COLOR_PAIR_LABELS[color]} Pair
          </h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {grouped[color].map((explorer) => {
              const takenByPair = isExplorerTaken(explorer.id, taken);
              const isSelected = selectedId === explorer.id;
              return (
                <ExplorerCard
                  key={explorer.id}
                  explorer={explorer}
                  selected={isSelected}
                  taken={takenByPair && !isSelected}
                  onSelect={() => onPick(explorer.id)}
                  compact
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
