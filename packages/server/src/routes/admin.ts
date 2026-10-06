import { signSessionValue, verifyAccessToken } from "@koe/auth";
import { AdminSessionSchema, AdminSessionUserSchema } from "@koe/core";
import { Database, users } from "@koe/db";
import { eq } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { extractBearerToken } from "../bearer.js";
import {
  ADMIN_ROLES,
  clearAdminSessionCookies,
  generateCsrfToken,
  setAdminSessionCookies,
} from "../plugins/admin-session.js";
import { createModerationHandlers } from "./moderation.js";

export interface AdminRoutesOptions {
  db: Database;
  jwtSecret: string;
  sessionSecret: string;
}

export default async function adminRoutes(
  app: FastifyInstance,
  options: AdminRoutesOptions
) {
  const { db, jwtSecret, sessionSecret } = options;
  const { queueHandler, actionHandler } = createModerationHandlers(app, db);

  // Admin session: exchange a bearer access token for a session cookie
  // POST /api/v1/admin/session
  const loginHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const token = extractBearerToken(request);

    if (!token) {
      return app.sendProblem(
        reply,
        401,
        "Unauthorized",
        "Missing authentication token",
        request.url
      );
    }

    let userId: string;
    try {
      const payload = await verifyAccessToken(token, { secret: jwtSecret });
      userId = payload.userId;
    } catch {
      return app.sendProblem(
        reply,
        401,
        "Unauthorized",
        "Invalid or expired authentication token",
        request.url
      );
    }

    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (foundUsers.length === 0) {
      return app.sendProblem(
        reply,
        401,
        "Unauthorized",
        "Invalid or expired authentication token",
        request.url
      );
    }

    const user = foundUsers[0];
    if (!ADMIN_ROLES.includes(user.role)) {
      return app.sendProblem(
        reply,
        403,
        "Forbidden",
        "Admin session requires a moderator or admin role",
        request.url
      );
    }

    const sessionValue = await signSessionValue(user.id, {
      secret: sessionSecret,
    });
    const csrfToken = generateCsrfToken();
    setAdminSessionCookies(reply, sessionValue, csrfToken);

    return reply
      .status(200)
      .send(AdminSessionSchema.parse({ user, csrfToken }));
  };

  // Admin session: current user
  // GET /api/v1/admin/session
  const meHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    return reply
      .status(200)
      .send(AdminSessionUserSchema.parse({ user: request.user }));
  };

  // Admin session: logout
  // DELETE /api/v1/admin/session
  const logoutHandler = async (_request: FastifyRequest, reply: FastifyReply) => {
    clearAdminSessionCookies(reply);
    return reply.status(204).send();
  };

  app.post("/api/v1/admin/session", loginHandler);
  app.get(
    "/api/v1/admin/session",
    { preHandler: app.adminAuthenticate },
    meHandler
  );
  app.delete(
    "/api/v1/admin/session",
    { preHandler: [app.adminAuthenticate, app.requireAdminCsrf] },
    logoutHandler
  );

  // Admin moderation (session-cookie auth + CSRF double-submit)
  app.get(
    "/api/v1/admin/moderation/queue",
    { preHandler: app.requireAdminRole(ADMIN_ROLES) },
    queueHandler
  );
  app.post(
    "/api/v1/admin/moderation/actions",
    {
      preHandler: [app.requireAdminRole(ADMIN_ROLES), app.requireAdminCsrf],
    },
    actionHandler
  );
}
