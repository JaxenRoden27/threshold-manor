export function normalizeRoomCode(input) {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidRoomCode(code) {
  return /^[A-Z0-9]{4}$/.test(code);
}
