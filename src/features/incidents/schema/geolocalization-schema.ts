import { z } from "zod";

export const geolocalizationSchema = z.object({
  latitude: z.number().refine((val) => val >= -90 && val <= 90, {
    message: "Latitude must be between -90 and 90 degrees",
  }),
  longitude: z.number().refine((val) => val >= -180 && val <= 180, {
    message: "Longitude must be between -180 and 180 degrees",
  }),
});
