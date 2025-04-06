import { z } from "zod";

const resendEmailVerificationCode = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

export default resendEmailVerificationCode;
