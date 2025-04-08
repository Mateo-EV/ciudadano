import { z } from "zod";

const sendResetPasswordSchema = z.object({
  email: z.string().email(),
});

export default sendResetPasswordSchema;
