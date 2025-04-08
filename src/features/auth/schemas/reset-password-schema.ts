import { z } from "zod";

const resetPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  code: z.string().nonempty("Code is required"),
});

export default resetPasswordSchema;
