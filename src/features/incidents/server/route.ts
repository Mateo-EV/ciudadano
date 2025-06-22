import authMiddleware from "@/features/auth/server/middleware/authMiddleware";
import { createIncidentSchema } from "@/features/incidents/schema";
import { deleteFromS3, getFileKeyFromUrl, uploadToS3 } from "@/lib/aws-s3";
import { db } from "@/server/db";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator as zValidator } from "hono-openapi/zod";
import { zValidator as zValidatorForm } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { geolocalizationSchema } from "@/features/geolocalization/schemas/geolocalization-schema";
import { emitIncidentCreated } from "@/features/events/utils/incidents";

export const incidentsRouter = new Hono()
  .get(
    "/",
    describeRoute({
      summary: "Lista de incidentes",
      responses: {
        200: {
          description: "Lista de incidentes",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Incident" },
                  },
                },
              },
            },
          },
        },
      },
      tags: ["Incidentes"],
    }),
    authMiddleware,
    async (c) => {
      const incidents = await db.incident.findMany();

      return c.json({ data: incidents });
    },
  )
  .get(
    "/:id",
    describeRoute({
      summary: "Obtener incidente por ID",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "Incidente encontrado",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: { $ref: "#/components/schemas/Incident" },
                },
              },
            },
          },
        },
        404: { description: "Incidente no encontrado" },
      },
      tags: ["Incidentes"],
    }),
    authMiddleware,
    async (c) => {
      const incidentId = c.req.param("id");

      const incident = await db.incident.findUnique({
        where: { id: incidentId },
      });

      if (!incident) {
        throw new HTTPException(404, { message: "Incidente no encontrado" });
      }

      return c.json({ data: incident });
    },
  )
  .get(
    "/map/:latitude/:longitude",
    describeRoute({
      summary: "Obtener incidentes cercanos a una ubicación",
      responses: {
        200: {
          description: "Incidentes cercanos a la ubicación",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Incident" },
                  },
                },
              },
            },
          },
        },
      },
      tags: ["Incidentes"],
    }),
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

      return c.json({ data: { incidents } });
    },
  )
  .post(
    "/post",
    describeRoute({
      summary: "Create incident",
      requestBody: {
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                incident_type: {
                  type: "string",
                  enum: ["Robo", "Accidente", "Vandalismo"],
                },
                description: { type: "string" },
                location_lat: { type: "number" },
                location_lon: { type: "number" },
                multimedia: { type: "string", format: "binary" },
              },
              required: [
                "incident_type",
                "description",
                "location_lat",
                "location_lon",
                "multimedia",
              ],
            },
          },
        },
      },
      responses: {
        201: {
          description: "Incident created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: { $ref: "#/components/schemas/Incident" },
                },
              },
            },
          },
        },
      },
      tags: ["Incidentes"],
    }),
    authMiddleware,
    zValidatorForm("form", createIncidentSchema),
    async (c) => {
      const {
        description,
        incident_type,
        location_lat,
        location_lon,
        happend_at,
        multimedia,
      } = c.req.valid("form");

      const user = c.get("user");

      const { url } = await uploadToS3(multimedia);

      const newIncident = await db.incident.create({
        data: {
          incident_type,
          description,
          multimedia: url,
          happend_at,
          user_id: user.id,
          location_lat,
          location_lon,
        },
      });

      emitIncidentCreated(newIncident);

      return c.json({ data: { incident: newIncident } }, 201);
    },
  )
  .delete(
    "/:id",
    describeRoute({
      summary: "Eliminar incidente",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        204: { description: "Incidente eliminado" },
        404: { description: "Incidente no encontrado" },
      },
      tags: ["Incidentes"],
    }),
    authMiddleware,
    async (c) => {
      const incidentId = c.req.param("id");

      const incident = await db.incident.findUnique({
        where: { id: incidentId },
      });

      if (!incident) {
        throw new HTTPException(404, { message: "Incidente no encontrado" });
      }

      if (incident.user_id !== c.get("user").id) {
        throw new HTTPException(403, {
          message: "No tienes permiso para eliminar este incidente",
        });
      }

      if (incident.created_at < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
        throw new HTTPException(403, {
          message:
            "No puedes eliminar un incidente creado hace más de 24 horas",
        });
      }

      if (incident.multimedia) {
        await deleteFromS3(getFileKeyFromUrl(incident.multimedia));
      }

      await db.incident.delete({
        where: { id: incidentId },
      });

      return c.json({
        message: "Incidente eliminado correctamente",
      });
    },
  );
