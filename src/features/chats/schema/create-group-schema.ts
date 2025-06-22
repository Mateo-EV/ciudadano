import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().min(1, "El nombre del grupo es obligatorio"),
  description: z.string().optional(),
  users: z.array(z.string()).min(1, "Debe haber al menos un miembro"),
});
