import { db } from "@/server/db";
import { Hono } from "hono";

export const incidentsRouter = new Hono().get("/", async (c) => {
  const incidents = await db.incendent.findMany();

  return c.json({ data: incidents });
});
