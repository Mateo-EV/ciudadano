import { z } from "zod";
import { incidentTypeSchema } from "./incident-type-schema";

export const createIncidentSchema = z.object({
  title: z.string().min(2).max(100),
  incident_type: incidentTypeSchema,
  description: z.string().min(10).max(500),
  location_lat: z
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  location_lon: z
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
  multimedia: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: "File size must be less than 5MB",
    })
    .refine((file) => file.type.startsWith("image/"), {
      message: "File must be an image",
    }),
});
