import { z } from "zod";

export const incidentTypeSchema = z.enum(["Robo", "Accidente", "Vandalismo"]);
