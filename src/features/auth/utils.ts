import resend from "@/lib/resend";
import VerificationEmail from "./components/mail/verification-email";
import { db } from "@/server/db";
import { hash } from "@/lib/bcrypt";
import PasswordResetEmail from "./components/mail/password-reset-email";
import SEND_EMAIL_INTERVAL_MS from "./constants/send_email_interval";
import { HTTPException } from "hono/http-exception";

export async function sendVerificationEmail(email: string, userId: string) {
  const existingCode = await db.verificationCode.findUnique({
    where: { user_id: userId },
    select: { created_at: true },
  });

  if (
    existingCode &&
    new Date().getTime() - new Date(existingCode.created_at).getTime() <
      SEND_EMAIL_INTERVAL_MS
  ) {
    throw new HTTPException(429, {
      message: "Please wait before requesting another verification email",
    });
  }

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

export async function sendResetPasswordEmail(email: string, userId: string) {
  const resetCode = await db.passwordResetCode.findUnique({
    where: { user_id: userId },
    select: { created_at: true },
  });

  if (
    resetCode &&
    new Date().getTime() - new Date(resetCode.created_at).getTime() <
      SEND_EMAIL_INTERVAL_MS
  ) {
    throw new HTTPException(429, {
      message: "Please wait before requesting another verification email",
    });
  }

  await db.passwordResetCode.deleteMany({
    where: { user_id: userId },
  });

  const code = Math.floor(Math.random() * 1000000).toString();

  await db.passwordResetCode.create({
    data: {
      user_id: userId,
      code: await hash(code),
      expires_at: new Date(Date.now() + 1000 * 60 * 10), // 10 minutes,
    },
  });

  return await resend.emails.send({
    from: "Ciudadano <test@resend.dev>",
    to: email,
    subject: "Resetear contraseña",
    react: PasswordResetEmail({ code }),
  });
}
