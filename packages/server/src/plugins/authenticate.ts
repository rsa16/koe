import { verifyAccessToken } from "@koe/auth";
import { User, UserRole, UserSchema } from "@koe/core";
import { Database, users } from "@koe/db";
import { eq } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import fp from "fastify-plugin";

export interface AuthenticatePluginOptions {
  jwtSecret: string;
  db: Database;
}

export default fp(async function authenticatePlugin(
  app: FastifyInstance,
  options: AuthenticatePluginOptions
) {
  const { jwtSecret, db } = options;

  async function resolveUser(token: string): Promise<User | null> {
    try {
      const payload = await verifyAccessToken(token, { secret: jwtSecret });
      const foundUsers = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);
      return foundUsers.length > 0 ? UserSchema.parse(foundUsers[0]) : null;
    } catch {
      return null;
    }
  }

  function extractBearerToken(request: FastifyRequest): string | undefined {
    const authHeader = request.headers.authorization;
    return authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : undefined;
  }

  app.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
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

      const user = await resolveUser(token);
      if (!user) {
        return app.sendProblem(
          reply,
          401,
          "Unauthorized",
          "Invalid or expired authentication token",
          request.url
        );
      }

      request.user = user;
    }
  );

  app.decorate(
    "authenticateOptional",
    async (request: FastifyRequest) => {
      const token = extractBearerToken(request);

      if (!token) {
        return;
      }

      const user = await resolveUser(token);
      if (user) {
        request.user = user;
      }
    }
  );

  app.decorate(
    "requireActiveUser",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (request.user && request.user.status !== "active") {
        return app.sendProblem(
          reply,
          403,
          "Forbidden",
          "Suspended or banned accounts cannot interact with the API",
          request.url
        );
      }
    }
  );

  app.decorate(
    "requireRole",
    (allowedRoles: UserRole[]) => {
      return async (request: FastifyRequest, reply: FastifyReply) => {
        const authResult = await app.authenticate(request, reply);
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
});

declare module "fastify" {
  interface FastifyRequest {
    user?: User;
  }

  interface FastifyInstance {
    authenticate(
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<void | FastifyReply>;
    authenticateOptional(
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<void>;
    requireActiveUser(
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<void | FastifyReply>;
    requireRole(
      allowedRoles: UserRole[]
    ): (request: FastifyRequest, reply: FastifyReply) => Promise<void | FastifyReply>;
  }
}