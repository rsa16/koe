import {
  IdParamSchema,
  UpdateUserBodySchema,
  UserSchema,
} from "@koe/core";
import { Database, users } from "@koe/db";
import { eq } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface UsersRoutesOptions {
  db: Database;
}

export default async function usersRoutes(
  app: FastifyInstance,
  options: UsersRoutesOptions
) {
  const { db } = options;

  // Users: update user (admin only)
  // PATCH /api/v1/users/:id
  const updateUserHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const paramsParsed = IdParamSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return app.sendProblem(
        reply,
        400,
        "Bad Request",
        "Invalid user ID parameter",
        request.url,
        paramsParsed.error.issues
      );
    }
    const { id } = paramsParsed.data;

    const bodyParsed = UpdateUserBodySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return app.sendProblem(
        reply,
        400,
        "Bad Request",
        "Invalid user update body",
        request.url,
        bodyParsed.error.issues
      );
    }
    const updateData = bodyParsed.data;

    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (foundUsers.length === 0) {
      return app.sendProblem(
        reply,
        404,
        "Not Found",
        "User does not exist",
        request.url
      );
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return reply.status(200).send(UserSchema.parse(updatedUser));
  };

  app.patch(
    "/api/v1/users/:id",
    { preHandler: app.requireRole(["admin"]) },
    updateUserHandler
  );
}
