import { env } from "@/env";
import { db } from "@/server/db";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { sign } from "hono/jwt";
import EXTRA_EXP_TIME from "../constants/extra_exp_time";
import loginSchema from "../schemas/login-schema";
import { setCookie } from "hono/cookie";
import AUTH_COOKIE from "../constants/auth_cookie";
import registerSchema from "../schemas/register-schema";
import { compare, hash } from "@/lib/bcrypt";
import { sendVerificationEmail } from "../utils";
import verifyEmailSchema from "../schemas/verify-email-schema";

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
  });
