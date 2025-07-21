import { dispatchAlertSchema } from "@/features/alerts/schemas";
import authMiddleware from "@/features/auth/server/middleware/authMiddleware";
import { emitAlertTriggered } from "@/features/events/utils/alert";
import { PushNotificationService } from "@/lib/push-notifications";
import { db } from "@/server/db";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator as zValidator } from "hono-openapi/zod";

export const alertsRouter = new Hono()
  .post(
    "/",
    describeRoute({
      tags: ["Alertas"],
      summary: "Dispara una alerta",
      description: "Dispara una alerta con datos de geolocalización.",
    }),
    authMiddleware,
    zValidator("json", dispatchAlertSchema),
    async (c) => {
      const {
        geolocalization: { latitude, longitude },
      } = c.req.valid("json");

      const user = c.get("user");

      const alert = await db.alert.create({
        data: {
          location_lat: latitude,
          location_lon: longitude,
          user_id: user.id,
        },
      });

      // Emitir evento por WebSocket
      emitAlertTriggered(alert);

      // Enviar notificación push a usuarios cercanos
      try {
        await PushNotificationService.sendAlertToNearbyUsers(
          {
            title: "🚨 Alerta de Emergencia",
            body: `${user.first_name} ${user.last_name} ha disparado una alerta en tu zona`,
            latitude,
            longitude,
            alertId: alert.id,
            data: {
              type: "emergency_alert",
              timestamp: new Date().toISOString(),
            },
          },
          user.id, // Excluir al usuario que disparó la alerta
        );
      } catch (error) {
        console.error("Error sending push notifications for alert:", error);
        // No retornamos error aquí ya que la alerta se creó exitosamente
        // Solo loggeamos el error de notificaciones
      }

      return c.json({ message: "Alerta creada", data: { alert } });
    },
  )
  .get("/me", authMiddleware, async (c) => {
    const user = c.get("user");

    const alerts = await db.alert.findMany({
      where: { user_id: user.id },
    });

    return c.json({ data: { alerts } });
  });
