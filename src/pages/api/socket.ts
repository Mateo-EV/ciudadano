// pages/api/socket.ts
import { env } from "@/env";
import { geolocalizationSchema } from "@/features/geolocalization/schemas/geolocalization-schema";
import {
  removeUserFromGrid,
  updateUserLocation,
  type UserLocation,
} from "@/features/geolocalization/utils/geogrid";
import { db } from "@/server/db";
import { verify } from "hono/jwt";
import type { Server as HTTPServer } from "http";
import type { NextApiRequest, NextApiResponse } from "next";
import { Server as IOServer, type Socket } from "socket.io";

interface SocketWithUser extends Socket {
  data: {
    userId: string;
  };
}

declare global {
  // eslint-disable-next-line no-var
  var io: IOServer | undefined;

  // eslint-disable-next-line no-var
  var userSockets: Map<string, string>;

  // eslint-disable-next-line no-var
  var geoGrid: Map<string, Set<UserLocation>>;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

const geolocalizationBackup = new Map<string, UserLocation>();
const userSockets = new Map<string, string>();
const geoGrid = new Map<string, Set<UserLocation>>();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!res.socket!.server.io) {
    const httpServer: HTTPServer = res.socket?.server as HTTPServer;
    const io = new IOServer(httpServer, {
      path: "/api/socket",
      addTrailingSlash: false,
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    io.use(async (socket: SocketWithUser, next) => {
      try {
        const token = socket.handshake.auth.token as unknown;

        if (!token || typeof token !== "string") {
          return next(new Error("No auth token"));
        }

        const decoded = await verify(token, env.JWT_SECRET_KEY);

        if (typeof decoded.sub !== "string") {
          return next(new Error("Invalid token"));
        }

        if (typeof decoded.sub !== "string")
          return next(new Error("Unauthorized"));

        const user = await db.user.findUnique({
          where: { id: decoded.sub },
          select: {
            id: true,
            first_name: true,
            email: true,
            last_name: true,
            dni: true,
            email_verified: true,
            created_at: true,
          },
        });

        if (!user) return next(new Error("Unauthorized"));

        if (!user.email_verified) {
          return next(new Error("Email not verified"));
        }

        socket.data.userId = decoded.sub;

        next();
      } catch (err) {
        console.error("Socket auth error", err);
        next(new Error("Unauthorized"));
      }
    });

    io.on("connection", (socket: SocketWithUser) => {
      const userId = socket.data.userId;
      userSockets.set(userId, socket.id);

      console.log(`User connected: ${userId} with socket ID: ${socket.id}`);

      socket.on("set_location", (location) => {
        const { success, data } = geolocalizationSchema.safeParse(location);
        if (!success) {
          socket.disconnect();
          return;
        }

        const userLoc = { ...data, userId: socket.data.userId };

        geolocalizationBackup.set(socket.id, userLoc);
        updateUserLocation(userLoc);
      });

      socket.on("disconnect", () => {
        userSockets.delete(userId);

        const userLoc = geolocalizationBackup.get(socket.id);
        if (userLoc) removeUserFromGrid(userLoc);
        geolocalizationBackup.delete(socket.id);
      });
    });

    global.io = io;
    global.userSockets = userSockets;
    global.geoGrid = geoGrid;
    res.socket!.server.io = io;
  }

  res.end();
}
