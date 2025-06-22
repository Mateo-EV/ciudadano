export const socket = globalThis.io;

export function getSocketByUserId(userId: string) {
  if (!globalThis.userSockets) return null;
  return globalThis.userSockets.get(userId) ?? null;
}
