import { geolocalizationSchema } from "@/features/geolocalization/schemas/geolocalization-schema";
import { z } from "zod";

export const dispatchAlertSchema = z.object({
  geolocalization: geolocalizationSchema,
});
