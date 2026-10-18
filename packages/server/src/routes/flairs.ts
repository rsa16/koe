import {
  CreateFlairBodySchema,
  FlairSchema,
  FlairListResponseSchema,
  IdParamSchema,
  UpdateFlairBodySchema,
} from "@koe/core";
import { Database, flairs } from "@koe/db";
import { asc, eq } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { isUniqueViolation } from "../unique.js";

export interface FlairsRoutesOptions {
  db: Database;
}

export function createFlairsHandlers(
  app: FastifyInstance,
  options: FlairsRoutesOptions
) {
  const { db } = options;

  function parseFlairId(
    request: FastifyRequest,
    reply: FastifyReply
  ): string | null {
    const paramsParsed = IdParamSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      app.sendProblem(
        reply,
        400,
        "Bad Request",
        "Invalid Flair ID parameter",
        request.url,
        paramsParsed.error.issues
      );
      return null;
    }
    return paramsParsed.data.id;
  }

  // Flairs: public definitions, ordered by rank (the only source of order).
  // GET /api/v1/flairs
  const listFlairsHandler = async (
    _request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const rows = await db
      .select()
      .from(flairs)
      .orderBy(asc(flairs.rank), asc(flairs.slug));

    return reply.status(200).send(
      FlairListResponseSchema.parse({
        flairs: rows.map((row: Record<string, unknown>) => FlairSchema.parse(row)),
      })
    );
  };

  // Admin: create a Flair definition
  // POST /api/v1/admin/flairs
  const createFlairHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const bodyParsed = CreateFlairBodySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return app.sendProblem(
        reply,
        422,
        "Unprocessable Entity",
        "Invalid Flair body",
        request.url,
        bodyParsed.error.issues
      );
    }

    try {
      const [flair] = await db
        .insert(flairs)
        .values(bodyParsed.data)
        .returning();
      return reply.status(201).send(FlairSchema.parse(flair));
    } catch (err) {
      if (isUniqueViolation(err)) {
        return app.sendProblem(
          reply,
          409,
          "Conflict",
          "A Flair with that slug already exists",
          request.url
        );
      }
      throw err;
    }
  };

  // Admin: update a Flair's label, colour and/or rank. The slug is immutable.
  // PATCH /api/v1/admin/flairs/:id
  const updateFlairHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const id = parseFlairId(request, reply);
    if (id === null) {
      return;
    }

    const bodyParsed = UpdateFlairBodySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return app.sendProblem(
        reply,
        422,
        "Unprocessable Entity",
        "Invalid Flair body",
        request.url,
        bodyParsed.error.issues
      );
    }

    const [flair] = await db
      .update(flairs)
      .set({ ...bodyParsed.data, updatedAt: new Date() })
      .where(eq(flairs.id, id))
      .returning();

    if (!flair) {
      return app.sendProblem(
        reply,
        404,
        "Not Found",
        "Flair does not exist",
        request.url
      );
    }

    return reply.status(200).send(FlairSchema.parse(flair));
  };

  // Admin: delete a Flair, removing any User's holding of it.
  // DELETE /api/v1/admin/flairs/:id
  const deleteFlairHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const id = parseFlairId(request, reply);
    if (id === null) {
      return;
    }

    const [flair] = await db
      .delete(flairs)
      .where(eq(flairs.id, id))
      .returning();

    if (!flair) {
      return app.sendProblem(
        reply,
        404,
        "Not Found",
        "Flair does not exist",
        request.url
      );
    }

    return reply.status(204).send();
  };

  return {
    listFlairsHandler,
    createFlairHandler,
    updateFlairHandler,
    deleteFlairHandler,
  };
}

export default async function flairsRoutes(
  app: FastifyInstance,
  options: FlairsRoutesOptions
) {
  const {
    listFlairsHandler,
    createFlairHandler,
    updateFlairHandler,
    deleteFlairHandler,
  } = createFlairsHandlers(app, options);

  // Public: definitions are readable without authentication.
  app.get("/api/v1/flairs", listFlairsHandler);

  // Admin: definition CRUD (admin role + CSRF on writes).
  app.get(
    "/api/v1/admin/flairs",
    { preHandler: app.requireAdminRole(["admin"]) },
    listFlairsHandler
  );
  app.post(
    "/api/v1/admin/flairs",
    {
      preHandler: [app.requireAdminRole(["admin"]), app.requireAdminCsrf],
    },
    createFlairHandler
  );
  app.patch(
    "/api/v1/admin/flairs/:id",
    {
      preHandler: [app.requireAdminRole(["admin"]), app.requireAdminCsrf],
    },
    updateFlairHandler
  );
  app.delete(
    "/api/v1/admin/flairs/:id",
    {
      preHandler: [app.requireAdminRole(["admin"]), app.requireAdminCsrf],
    },
    deleteFlairHandler
  );
}
