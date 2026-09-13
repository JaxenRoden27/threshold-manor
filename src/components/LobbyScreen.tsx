"use client";

import { useState } from "react";
import { CHARACTER_TEMPLATES } from "@/game/gameEngine";
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
  const [localSelected, setLocalSelected] = useState<string[]>([
    CHARACTER_TEMPLATES[0].id,
    CHARACTER_TEMPLATES[1].id,
  ]);

  const myMember = lobby?.members.find((m) => m.peerId === localPeerId);
  const takenCharacters = new Set(
    lobby?.members
      .filter((m) => m.peerId !== localPeerId && m.characterId)
      .map((m) => m.characterId) ?? []
  );

  const allReady =
    lobby &&
    lobby.members.length >= 2 &&
    lobby.members.every((m) => m.characterId && m.ready) &&
    new Set(lobby.members.map((m) => m.characterId)).size ===
      lobby.members.length;

  const toggleLocal = (id: string) => {
    setLocalSelected((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev;
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const inMultiplayerLobby = mode === "multiplayer" && lobby && !lobby.started;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-amber-100 md:text-4xl">
          Threshold Manor
        </h1>
        <p className="mt-2 text-sm text-stone-400 md:text-base">
          Explore together. Survive the cards. Align the sigils before the
          Crisis claims you all.
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
                Hot-seat mode on one device — pass the screen between players.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {[2, 3, 4].map((n) => (
                <Button
                  key={n}
                  variant={selectedPlayerCount === n ? "default" : "outline"}
                  onClick={() => {
                    setPlayerCount(n);
                    setLocalSelected(
                      CHARACTER_TEMPLATES.slice(0, n).map((c) => c.id)
                    );
                  }}
                >
                  {n} Players
                </Button>
              ))}
            </CardContent>
          </Card>

          <CharacterGrid
            selected={localSelected}
            taken={new Set()}
            onToggle={toggleLocal}
            maxSelect={4}
            minSelect={2}
          />

          <div className="flex flex-col items-center gap-2">
            <Button
              size="lg"
              className="w-full max-w-sm bg-amber-700 hover:bg-amber-600"
              disabled={
                localSelected.length < 2 ||
                localSelected.length !== selectedPlayerCount
              }
              onClick={() => startGame(localSelected)}
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
              Create a room and share the 4-letter code with friends on their
              own devices.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <Button
              size="lg"
              className="bg-amber-700 hover:bg-amber-600"
              disabled={status === "connecting"}
              onClick={() => createRoom()}
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

      {inMultiplayerLobby && (
        <>
          <Card className="border-amber-700/50 bg-stone-900/80">
            <CardHeader>
              <CardTitle className="text-amber-100">Room Code</CardTitle>
              <CardDescription>
                Share this code so others can join from the play link.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-2">
              <p className="text-4xl font-bold tracking-[0.35em] text-amber-200">
                {roomCode}
              </p>
              <p className="text-xs text-stone-500">
                {status === "connected" ? "Connected" : status} ·{" "}
                {lobby.members.length}/{lobby.maxPlayers} players
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
              {lobby.members.map((m) => {
                const char = CHARACTER_TEMPLATES.find(
                  (c) => c.id === m.characterId
                );
                return (
                  <div
                    key={m.peerId}
                    className="flex items-center justify-between rounded border border-stone-800 px-3 py-2"
                  >
                    <span className="text-stone-300">
                      {m.isHost ? "Host" : "Guest"}
                      {m.peerId === localPeerId ? " (you)" : ""}
                    </span>
                    <span className="text-amber-200">
                      {char?.name ?? "Choosing…"}
                      {m.ready ? " ✓" : ""}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <CharacterGrid
            selected={myMember?.characterId ? [myMember.characterId] : []}
            taken={takenCharacters}
            onToggle={(id) => {
              const next = myMember?.characterId === id ? null : id;
              selectCharacter(next);
            }}
            maxSelect={1}
            minSelect={1}
            singleSelect
          />

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

function CharacterGrid({
  selected,
  taken,
  onToggle,
  maxSelect,
  minSelect,
  singleSelect = false,
}: {
  selected: string[];
  taken: Set<string | null>;
  onToggle: (id: string) => void;
  maxSelect: number;
  minSelect: number;
  singleSelect?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {CHARACTER_TEMPLATES.map((char) => {
        const isSelected = selected.includes(char.id);
        const isTaken = taken.has(char.id);
        return (
          <Card
            key={char.id}
            className={`border-stone-700 bg-stone-900/60 transition ${
              isTaken
                ? "cursor-not-allowed opacity-40"
                : "cursor-pointer hover:border-amber-600/50"
            } ${isSelected ? "ring-2 ring-amber-500" : ""}`}
            onClick={() => !isTaken && onToggle(char.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg text-amber-50">
                    {char.name}
                  </CardTitle>
                  <CardDescription>{char.title}</CardDescription>
                </div>
                {isSelected && <Badge variant="secondary">Selected</Badge>}
                {isTaken && <Badge variant="outline">Taken</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm text-stone-300">
                <span>Might {char.might}</span>
                <span>Speed {char.speed}</span>
                <span>Sanity {char.sanity}</span>
                <span>Knowledge {char.knowledge}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
