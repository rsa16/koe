import {
  DEFAULT_SESSION_MAX_AGE_SECONDS,
  getSessionCookieAttributes,
  signSessionValue,
  verifySessionValue,
} from "@koe/auth";
import { User, UserRole, UserSchema } from "@koe/core";
import { Database, users } from "@koe/db";
import { eq } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import crypto from "node:crypto";

import fp from "fastify-plugin";

export const ADMIN_SESSION_COOKIE = "koe_admin_session";
export const ADMIN_CSRF_COOKIE = "koe_csrf";
export const ADMIN_CSRF_HEADER = "x-csrf-token";
export const ADMIN_ROLES: UserRole[] = ["moderator", "admin"];

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function setAdminSessionCookies(
  reply: FastifyReply,
  sessionValue: string,
  csrfToken: string,
  maxAgeSeconds: number = DEFAULT_SESSION_MAX_AGE_SECONDS
): void {
  reply.setCookie(ADMIN_SESSION_COOKIE, sessionValue, {
    ...getSessionCookieAttributes(maxAgeSeconds),
    httpOnly: true,
  });
  reply.setCookie(ADMIN_CSRF_COOKIE, csrfToken, {
    ...getSessionCookieAttributes(maxAgeSeconds),
    httpOnly: false,
  });
}

export function clearAdminSessionCookies(reply: FastifyReply): void {
  const attributes = getSessionCookieAttributes();
  reply.clearCookie(ADMIN_SESSION_COOKIE, {
    path: attributes.path,
    sameSite: attributes.sameSite,
    secure: attributes.secure,
  });
  reply.clearCookie(ADMIN_CSRF_COOKIE, {
    path: attributes.path,
    sameSite: attributes.sameSite,
    secure: attributes.secure,
  });
}

export interface AdminSessionPluginOptions {
  db: Database;
  sessionSecret: string;
}

export default fp(async function adminSessionPlugin(
  app: FastifyInstance,
  options: AdminSessionPluginOptions
) {
  const { db, sessionSecret } = options;

  async function resolveSessionUser(
    request: FastifyRequest
  ): Promise<User | null> {
    const cookieValue = request.cookies[ADMIN_SESSION_COOKIE];
    if (!cookieValue) {
      return null;
    }

    const userId = await verifySessionValue(cookieValue, sessionSecret);
    if (!userId) {
      return null;
    }

    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return foundUsers.length > 0 ? UserSchema.parse(foundUsers[0]) : null;
  }

  app.decorate(
    "adminAuthenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await resolveSessionUser(request);

      if (!user) {
        return app.sendProblem(
          reply,
          401,
          "Unauthorized",
          "Missing or invalid admin session",
          request.url
        );
      }

      if (!ADMIN_ROLES.includes(user.role)) {
        return app.sendProblem(
          reply,
          403,
          "Forbidden",
          "Admin session requires a moderator or admin role",
          request.url
        );
      }

      request.user = user;
    }
  );

  app.decorate(
    "requireAdminRole",
    (allowedRoles: UserRole[]) => {
      return async (request: FastifyRequest, reply: FastifyReply) => {
        const authResult = await app.adminAuthenticate(request, reply);
        if (reply.sent || authResult !== undefined) {
          return;
        }

        if (!request.user || !allowedRoles.includes(request.user.role)) {
          return app.sendProblem(
            reply,
            403,
            "Forbidden",
            "You do not have permission to access this resource",
            request.url
          );
        }
      };
    }
  );

  app.decorate(
    "requireAdminCsrf",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const cookieToken = request.cookies[ADMIN_CSRF_COOKIE];
      const rawHeader = request.headers[ADMIN_CSRF_HEADER];
      const headerToken = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

      if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return app.sendProblem(
          reply,
          403,
          "Forbidden",
          "Missing or invalid CSRF token",
          request.url
        );
      }
    }
  );
});

declare module "fastify" {
  interface FastifyInstance {
    adminAuthenticate(
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<void | FastifyReply>;
    requireAdminRole(
      allowedRoles: UserRole[]
    ): (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void | FastifyReply>;
    requireAdminCsrf(
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<void | FastifyReply>;
  }
}
