export const socket = globalThis.io;

export function getSocketByUserId(userId: string) {
  console.log(globalThis.userSockets);

  if (!globalThis.userSockets) {
    console.warn("userSockets is not initialized");
    return null;
  }

  console.log(`Retrieving socket for userId: ${userId}`);

  const socket = globalThis.userSockets.get(userId);
  if (socket) {
    console.log(`Socket found for userId: ${userId}`);
  } else {
    console.log(`No socket found for userId: ${userId}`);
  }

  return socket ?? null;
}
