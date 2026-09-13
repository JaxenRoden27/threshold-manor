const CLIENT_ID_KEY = "threshold-manor-client-id";

export function getClientId(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  const existing = window.sessionStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `guest-${Math.random().toString(36).slice(2, 10)}`;

  window.sessionStorage.setItem(CLIENT_ID_KEY, id);
  return id;
}
