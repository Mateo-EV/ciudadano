import { env } from "@/env";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { verify } from "hono/jwt";
import AUTH_COOKIE from "../../constants/auth_cookie";
import { db } from "@/server/db";

export type Session = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  email_verified: boolean;
  dni: string;
};

type AdditionalSessionMiddlewareContext = {
  Variables: {
    user: Session;
  };
};

function getBearerToken(c: Context) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.substring(7);
}

const authMiddleware = createMiddleware<AdditionalSessionMiddlewareContext>(
  async (c, next) => {
    try {
      const token = getCookie(c, AUTH_COOKIE) ?? getBearerToken(c);

      if (!token) throw new HTTPException(401, { message: "Unauthorized" });

      const decoded = await verify(token, env.JWT_SECRET_KEY);

      if (typeof decoded.sub !== "string")
        throw new HTTPException(401, { message: "Unauthorized" });

      const user = await db.user.findUnique({
        where: { id: decoded.sub },
        select: {
          id: true,
          first_name: true,
          email: true,
          last_name: true,
          dni: true,
          email_verified: true,
          created_at: true,
        },
      });

      if (!user) throw new HTTPException(401, { message: "Unauthorized" });

      if (!user.email_verified) {
        throw new HTTPException(403, { message: "Email not verified" });
      }

      c.set("user", user);

      await next();
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(401, { message: "Unauthorized" });
    }
  },
);

export default authMiddleware;
