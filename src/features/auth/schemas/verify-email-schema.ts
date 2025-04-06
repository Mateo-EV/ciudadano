import { z } from "zod";

const verifyEmailSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  code: z.string().min(1, { message: "Code is required" }),
});

export default verifyEmailSchema;
