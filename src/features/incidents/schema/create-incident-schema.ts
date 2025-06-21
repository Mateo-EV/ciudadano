import { z } from "zod";
import { incidentTypeSchema } from "./incident-type-schema";

export const createIncidentSchema = z.object({
  incident_type: incidentTypeSchema,
  description: z.string().min(10).max(500),
  location_lat: z.coerce
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  location_lon: z.coerce
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
  happend_at: z.coerce
    .date()
    .refine((date) => date <= new Date(), {
      message: "Date must be in the past",
    })
    .refine((date) => date.toDateString() === new Date().toDateString(), {
      message: "Date must be today",
    })
    .optional()
    .default(() => new Date()),
  multimedia: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: "File size must be less than 5MB",
    })
    .refine((file) => file.type.startsWith("image/"), {
      message: "File must be an image",
    }),
});
