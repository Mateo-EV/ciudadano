import authMiddleware from "@/features/auth/server/middleware/authMiddleware";
import {
  createIncidentSchema,
  geolocalizationSchema,
} from "@/features/incidents/schema";
import { uploadToS3 } from "@/lib/aws-s3";
import { db } from "@/server/db";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

export const incidentsRouter = new Hono()
  .get("/", authMiddleware, async (c) => {
    const incidents = await db.incident.findMany();

    return c.json({ data: incidents });
  })
  .get("/:id", authMiddleware, async (c) => {
    const incidentId = c.req.param("id");

    const incident = await db.incident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) {
      return c.json({ message: "Incident not found" }, 404);
    }

    return c.json({ data: incident });
  })
  .get(
    "/map/:latitude/:longitude",
    authMiddleware,
    zValidator("param", geolocalizationSchema),
    async (c) => {
      const { latitude, longitude } = c.req.valid("param");

      const incidents = await db.incident.findMany({
        where: {
          location_lat: {
            gte: latitude - 0.1,
            lte: latitude + 0.1,
          },
          location_lon: {
            gte: longitude - 0.1,
            lte: longitude + 0.1,
          },
        },
      });

      return c.json({ data: incidents });
    },
  )
  .post(
    "/post",
    authMiddleware,
    zValidator("form", createIncidentSchema),
    async (c) => {
      const incidentData = await c.req.formData();

      const user = c.get("user");

      const incidentFile = incidentData.get("multimedia") as File;

      const { url } = await uploadToS3(incidentFile);

      const newIncident = await db.incident.create({
        data: {
          incident_type: incidentData.get("incident_type") as string,
          description: incidentData.get("description") as string,
          multimedia: url,
          happend_at: new Date(),
          user_id: user.id,
          location_lat: parseFloat(incidentData.get("location_lat") as string),
          location_lon: parseFloat(incidentData.get("location_lon") as string),
        },
      });

      return c.json({ data: newIncident }, 201);
    },
  );
