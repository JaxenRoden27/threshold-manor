export function getSignalHost(): string {
  const host = process.env.NEXT_PUBLIC_SIGNAL_HOST;
  if (!host) {
    throw new Error("NEXT_PUBLIC_SIGNAL_HOST is not configured");
  }
  return host.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function getSignalWebSocketUrl(roomCode: string): string {
  const host = getSignalHost();
  const protocol = host.startsWith("localhost") ? "ws" : "wss";
  return `${protocol}://${host}/${roomCode}`;
}
