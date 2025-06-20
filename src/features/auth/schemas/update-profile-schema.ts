import { z } from "zod";

export const updateProfileSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  dni: z.string().length(8, "DNI must be exactly 8 characters long"),
});
