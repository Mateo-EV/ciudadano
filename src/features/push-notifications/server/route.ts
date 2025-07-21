import authMiddleware from "@/features/auth/server/middleware/authMiddleware";
import { PushNotificationService } from "@/lib/push-notifications";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator as zValidator } from "hono-openapi/zod";
import { z } from "zod";

const registerTokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
  platform: z.enum(["ios", "android", "web"], {
    errorMap: () => ({ message: "Platform must be ios, android, or web" }),
  }),
});

const unregisterTokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const pushNotificationRouter = new Hono()
  .post(
    "/register-token",
    describeRoute({
      tags: ["Push Notifications"],
      summary: "Registra un token de notificación push",
      description: "Registra un token FCM para recibir notificaciones push.",
    }),
    authMiddleware,
    zValidator("json", registerTokenSchema),
    async (c) => {
      const { token, platform } = c.req.valid("json");
      const user = c.get("user");

      try {
        await PushNotificationService.registerToken(user.id, token, platform);
        return c.json({
          message: "Token registrado exitosamente",
          success: true,
        });
      } catch (error) {
        console.error("Error registering push token:", error);
        return c.json(
          {
            message: "Error al registrar el token",
            success: false,
          },
          500,
        );
      }
    },
  )
  .post(
    "/unregister-token",
    describeRoute({
      tags: ["Push Notifications"],
      summary: "Desregistra un token de notificación push",
      description:
        "Desactiva un token FCM para dejar de recibir notificaciones.",
    }),
    authMiddleware,
    zValidator("json", unregisterTokenSchema),
    async (c) => {
      const { token } = c.req.valid("json");

      try {
        await PushNotificationService.unregisterToken(token);
        return c.json({
          message: "Token desregistrado exitosamente",
          success: true,
        });
      } catch (error) {
        console.error("Error unregistering push token:", error);
        return c.json(
          {
            message: "Error al desregistrar el token",
            success: false,
          },
          500,
        );
      }
    },
  );
