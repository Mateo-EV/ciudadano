import { authRouter } from "@/features/auth/server/route";
import { incidentsRouter } from "@/features/incidents/server/route";
import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import { handle } from "hono/vercel";
import { openAPISpecs } from "hono-openapi";
import { env } from "@/env";

const app = new Hono().basePath("/api");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const routes = app
  .route("/auth", authRouter)
  .route("/incidents", incidentsRouter);

app.get("/ui", swaggerUI({ url: "/api/doc" }));
app.get(
  "/doc",
  openAPISpecs(app, {
    documentation: {
      info: {
        title: "Hono API",
        version: "1.0.0",
        description: "Ciudadano Api",
      },
      components: {
        schemas: {
          Incident: {
            type: "object",
            properties: {
              id: { type: "string", format: "cuid" },
              title: { type: "string" },
              description: { type: "string" },
              incident_type: { type: "string" },
              location_lat: { type: "number" },
              location_lon: { type: "number" },
              multimedia: { type: "string" },
              created_at: { type: "string", format: "date-time" },
              happend_at: { type: "string", format: "date-time" },
            },
          },
          Group: {
            type: "object",
            properties: {
              id: { type: "string", format: "cuid" },
              name: { type: "string" },
              description: { type: "string" },
              code: { type: "string" },
              created_at: { type: "string", format: "date-time" },
            },
          },
        },
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [{ bearerAuth: [] }],
      servers: [{ url: env.NEXT_PUBLIC_URL, description: "Ciudadano Api" }],
    },
  }),
);

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);

export type AppType = typeof routes;
