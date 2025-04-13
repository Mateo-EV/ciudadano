import { env } from "@/env";
import {
  sendResetPasswordEmail,
  sendVerificationEmail,
} from "@/features/auth/utils/mail";
import { compare, hash } from "@/lib/bcrypt";
import { db } from "@/server/db";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { sign } from "hono/jwt";
import AUTH_COOKIE from "../constants/auth_cookie";
import EXTRA_EXP_TIME from "../constants/extra_exp_time";
import loginSchema from "../schemas/login-schema";
import registerSchema from "../schemas/register-schema";
import resendEmailVerificationCode from "../schemas/resend-email-verification-code";
import resetPasswordSchema from "../schemas/reset-password-schema";
import sendResetPasswordSchema from "../schemas/send-reset-password-email-schema";
import verifyEmailSchema from "../schemas/verify-email-schema";
import authMiddleware from "./middleware/authMiddleware";

export const authRouter = new Hono()
  .post("/login", zValidator("json", loginSchema), async (c) => {
    const { email, password } = c.req.valid("json");

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, password: true, email_verified: true },
    });

    if (!user)
      throw new HTTPException(400, { message: "Incorrect email or password" });

    const isValidPassword = await compare(password, user.password);

    if (!isValidPassword)
      throw new HTTPException(400, { message: "Incorrect email or password" });

    const now = Math.floor(Date.now() / 1000);
    const token = await sign(
      {
        sub: user.id,
        iat: now,
        nbf: now,
        exp: now + EXTRA_EXP_TIME,
      },
      env.JWT_SECRET_KEY,
    );

    setCookie(c, AUTH_COOKIE, token, {
      path: "/",
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: EXTRA_EXP_TIME,
    });

    return c.json({
      message: "Login successful",
      data: { token, isEmailVerified: user.email_verified },
    });
  })
  .post("/register", zValidator("json", registerSchema), async (c) => {
    const { email, password, firstName, lastName, dni } = c.req.valid("json");

    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new HTTPException(400, { message: "Email already registered" });
    }

    const hashedPassword = await hash(password);

    const newUser = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        dni,
      },
    });

    // Send email verification
    void sendVerificationEmail(email, newUser.id);

    return c.json({
      message: "User registered successfully",
      data: {
        user: {
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          dni: newUser.dni,
          email: newUser.email,
        },
      },
    });
  })
  .post("/verify-email", zValidator("json", verifyEmailSchema), async (c) => {
    const { email, code } = c.req.valid("json");

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email_verified: true },
    });

    if (!user) {
      throw new HTTPException(400, { message: "Invalid email or code" });
    }

    if (user.email_verified) {
      return c.json({ message: "Email already verified" });
    }

    const verificationCode = await db.verificationCode.findUnique({
      where: { user_id: user.id },
      select: { code: true, expires_at: true, tries: true },
    });

    if (!verificationCode) {
      throw new HTTPException(400, { message: "Invalid email or code" });
    }

    if (verificationCode.expires_at < new Date()) {
      await db.verificationCode.delete({
        where: { user_id: user.id },
      });

      throw new HTTPException(400, { message: "Code expired" });
    }

    if (verificationCode.tries >= 3) {
      await db.verificationCode.delete({
        where: { user_id: user.id },
      });

      throw new HTTPException(400, { message: "Code expired" });
    }

    const isCodeValid = await compare(code, verificationCode.code);

    if (!isCodeValid) {
      await db.verificationCode.update({
        data: { tries: { increment: 1 } },
        where: { user_id: user.id },
      });

      throw new HTTPException(400, { message: "Invalid email or code" });
    }

    await db.user.update({
      where: { id: user.id },
      data: { email_verified: true, verificationCode: { delete: {} } },
    });

    return c.json({ message: "Email verified successfully" });
  })
  .post(
    "/resend-email-verification-code",
    zValidator("json", resendEmailVerificationCode),
    async (c) => {
      const { email } = c.req.valid("json");

      const user = await db.user.findUnique({
        where: { email },
        select: { id: true, email_verified: true },
      });

      if (!user || user.email_verified) {
        throw new HTTPException(400, { message: "Invalid email" });
      }

      await sendVerificationEmail(email, user.id);

      return c.json({ message: "Verification email resent successfully" });
    },
  )
  .post(
    "/send-reset-password-email",
    zValidator("json", sendResetPasswordSchema),
    async (c) => {
      const { email } = c.req.valid("json");

      const user = await db.user.findUnique({
        where: { email },
        select: { id: true, email_verified: true },
      });

      if (!user) {
        throw new HTTPException(400, { message: "Invalid email" });
      }

      await sendResetPasswordEmail(email, user.id);

      return c.json({ message: "Password reset email sent successfully" });
    },
  )
  .put(
    "/reset-password",
    zValidator("json", resetPasswordSchema),
    async (c) => {
      const { code, email, password: newPassword } = c.req.valid("json");

      const user = await db.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (!user) {
        throw new HTTPException(400, { message: "Invalid email or code" });
      }

      const resetCode = await db.passwordResetCode.findUnique({
        where: { user_id: user.id },
        select: { code: true, expires_at: true, tries: true },
      });

      if (!resetCode) {
        throw new HTTPException(400, { message: "Invalid email or code" });
      }

      if (resetCode.expires_at < new Date()) {
        await db.passwordResetCode.delete({
          where: { user_id: user.id },
        });

        throw new HTTPException(400, { message: "Code expired" });
      }

      if (resetCode.tries >= 3) {
        await db.passwordResetCode.delete({
          where: { user_id: user.id },
        });

        throw new HTTPException(400, { message: "Code expired" });
      }

      const isCodeValid = await compare(code, resetCode.code);

      if (!isCodeValid) {
        await db.passwordResetCode.update({
          data: { tries: { increment: 1 } },
          where: { user_id: user.id },
        });

        throw new HTTPException(400, { message: "Invalid email or code" });
      }

      const hashedPassword = await hash(newPassword);

      await db.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetCode: { delete: {} },
        },
      });

      return c.json({ message: "Password reset successfully" });
    },
  )
  .get("/profile", authMiddleware, async (c) => {
    return c.json({
      data: {
        user: c.get("user"),
      },
    });
  });
