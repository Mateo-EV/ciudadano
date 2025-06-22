import { dispatchAlertSchema } from "@/features/alerts/schemas";
import authMiddleware from "@/features/auth/server/middleware/authMiddleware";
import { emitAlertTriggered } from "@/features/events/utils/alert";
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

      const alert = await db.alert.create({
        data: {
          location_lat: latitude,
          location_lon: longitude,
          user_id: c.get("user").id,
        },
      });

      emitAlertTriggered(alert);

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
