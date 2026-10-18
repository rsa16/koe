import {
  IdParamSchema,
  ServiceFlairAssignmentBodySchema,
  ServiceFlairAssignmentResponseSchema,
  ServiceIdentityQuerySchema,
  ServiceIdentityResponseSchema,
} from "@koe/core";
import { Database, flairs, identities, userFlairs, users } from "@koe/db";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface ServiceRoutesOptions {
  db: Database;
}

/**
 * Scoped service API. Every route is guarded by `app.serviceAuthenticate`, the
 * single configured credential an external service holds. Nothing here can
 * moderate, ban, change roles, read comments or reach an admin route.
 */
export default async function serviceRoutes(
  app: FastifyInstance,
  options: ServiceRoutesOptions
) {
  const { db } = options;

  // Service: replace the whole set of Flairs a User holds. Absence means
  // release; the body is the entire set, so repeating a call changes nothing.
  // PUT /api/v1/service/users/:id/flairs
  const assignFlairsHandler = async (
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

    const bodyParsed = ServiceFlairAssignmentBodySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return app.sendProblem(
        reply,
        422,
        "Unprocessable Entity",
        "Invalid Flair assignment body",
        request.url,
        bodyParsed.error.issues
      );
    }

    const foundUsers = await db
      .select({ id: users.id })
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

    // The body is a set: duplicates collapse, and only defined Flairs apply.
    const requestedSlugs = [...new Set(bodyParsed.data.slugs)];
    const definitions = requestedSlugs.length
      ? await db
          .select({ id: flairs.id, slug: flairs.slug })
          .from(flairs)
          .where(inArray(flairs.slug, requestedSlugs))
      : [];
    const idBySlug = new Map<string, string>(
      definitions.map((flair: { id: string; slug: string }) => [
        flair.slug,
        flair.id,
      ])
    );

    const applied = requestedSlugs.filter((slug) => idBySlug.has(slug));
    const unknownSlugs = requestedSlugs.filter((slug) => !idBySlug.has(slug));
    const appliedIds = applied.map((slug) => idBySlug.get(slug) as string);

    await db.transaction(async (tx: Database) => {
      // Release everything not in the new set; insert only what is missing, so
      // a replay leaves existing holdings (and their timestamps) untouched.
      if (appliedIds.length > 0) {
        await tx
          .delete(userFlairs)
          .where(
            and(
              eq(userFlairs.userId, id),
              notInArray(userFlairs.flairId, appliedIds)
            )
          );
      } else {
        await tx.delete(userFlairs).where(eq(userFlairs.userId, id));
      }

      const held = await tx
        .select({ flairId: userFlairs.flairId })
        .from(userFlairs)
        .where(eq(userFlairs.userId, id));
      const heldIds = new Set(
        held.map((row: { flairId: string }) => row.flairId)
      );
      const missing = appliedIds.filter((flairId) => !heldIds.has(flairId));
      if (missing.length > 0) {
        await tx
          .insert(userFlairs)
          .values(missing.map((flairId) => ({ userId: id, flairId })));
      }
    });

    return reply
      .status(200)
      .send(
        ServiceFlairAssignmentResponseSchema.parse({ applied, unknownSlugs })
      );
  };

  // Service: resolve a provider Identity to the User that owns it. This is the
  // only path by which a provider's user id becomes a Koe User.
  // GET /api/v1/service/identities
  const resolveIdentityHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const queryParsed = ServiceIdentityQuerySchema.safeParse(request.query);
    if (!queryParsed.success) {
      return app.sendProblem(
        reply,
        400,
        "Bad Request",
        "Invalid identity query",
        request.url,
        queryParsed.error.issues
      );
    }
    const { provider, providerUserId } = queryParsed.data;

    const rows = await db
      .select({ userId: identities.userId })
      .from(identities)
      .where(
        and(
          eq(identities.provider, provider),
          eq(identities.providerUserId, providerUserId)
        )
      )
      .limit(1);

    if (rows.length === 0) {
      return app.sendProblem(
        reply,
        404,
        "Not Found",
        "Identity does not exist",
        request.url
      );
    }

    return reply
      .status(200)
      .send(ServiceIdentityResponseSchema.parse({ userId: rows[0].userId }));
  };

  const serviceOnly = { preHandler: app.serviceAuthenticate };

  app.put(
    "/api/v1/service/users/:id/flairs",
    serviceOnly,
    assignFlairsHandler
  );
  app.get("/api/v1/service/identities", serviceOnly, resolveIdentityHandler);
}
