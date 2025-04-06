import resend from "@/lib/resend";
import VerificationEmail from "./components/mail/verification-email";
import { db } from "@/server/db";
import { hash } from "@/lib/bcrypt";

export async function sendVerificationEmail(email: string, userId: string) {
  await db.verificationCode.deleteMany({
    where: { user_id: userId },
  });

  const code = Math.floor(Math.random() * 1000000).toString();

  await db.verificationCode.create({
    data: {
      user_id: userId,
      code: await hash(code),
      expires_at: new Date(Date.now() + 1000 * 60 * 60), // 1 hour,
    },
  });

  return await resend.emails.send({
    from: "Ciudadano <test@resend.dev>",
    to: email,
    subject: "Verifica tu cuenta",
    react: VerificationEmail({ code }),
  });
}
