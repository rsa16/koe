import { TokenPayload, verifyAccessToken } from "@koe/auth";
import { User, UserSchema } from "@koe/core";
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

  app.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : undefined;

      if (!token) {
        return app.sendProblem(
          reply,
          401,
          "Unauthorized",
          "Missing authentication token",
          request.url
        );
      }

      let payload: TokenPayload;
      try {
        payload = await verifyAccessToken(token, { secret: jwtSecret });
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
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (foundUsers.length === 0) {
        return app.sendProblem(
          reply,
          401,
          "Unauthorized",
          "User does not exist",
          request.url
        );
      }

      request.user = UserSchema.parse(foundUsers[0]);
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
  }
}