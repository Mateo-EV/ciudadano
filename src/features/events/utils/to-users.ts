import { findNearbyUsers } from "@/features/geolocalization/utils/geogrid";
import { getSocketByUserId, socket } from "@/lib/socket-io";

export function emitToNearbyUsers<T>(
  latitude: number,
  longitude: number,
  event: string,
  data: T,
) {
  const nearbyUsers = findNearbyUsers(latitude, longitude);
  nearbyUsers.forEach((user) => {
    const socketId = getSocketByUserId(user.userId);
    if (!socketId) return;
    socket?.to(socketId).emit(event, data);
  });
}

export function emitToUsers<T>(userIds: string[], event: string, data: T) {
  userIds.forEach((userId) => {
    const socketId = getSocketByUserId(userId);
    if (!socketId) return;
    socket?.to(socketId).emit(event, data);
  });
}
